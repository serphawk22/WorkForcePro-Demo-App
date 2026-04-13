"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { DropdownMenu, type DropdownOption } from "@/components/ui/themed-dropdown";
import { 
  ArrowLeft, Calendar, User, Clock, CheckCircle2, Circle, AlertCircle,
  Github, ExternalLink, ListTree, MessageSquare, Send, Edit, Save, X,
  ChevronDown, ChevronRight, Loader2, Copy, Repeat2, CalendarDays, SkipForward, Percent, Plus, Mic, Play, Square, RotateCcw, Trash2
} from "lucide-react";
import { 
  getProjectDetails, 
  updateTaskLinks, 
  updateTaskStatus,
  createComment,
  createSubtask,
  getAssignableUsers,
  updateSubtaskStatus,
  getTaskRecurringInstances,
  updateTaskInstanceStatus,
  type TaskRecurringInstancesResponse,
  ProjectDetails,
  TaskComment,
  User as ApiUser,
  getMyOrganizationSettings,
  updateTask,
  uploadTaskVoiceNote,
} from "@/lib/api";
import { getTaskWarningState, type TaskWarningSettings } from "@/lib/taskWarnings";
import { toast } from "sonner";

const MAX_VOICE_NOTE_SECONDS = 90;

const priorityColors: Record<string, string> = {
  high: "bg-red-500/10 text-red-500 border-red-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-green-500/10 text-green-500 border-green-500/20",
};

const statusColors: Record<string, string> = {
  todo: "bg-gray-500/10 text-gray-500",
  in_progress: "bg-blue-500/10 text-blue-500",
  submitted: "bg-purple-500/10 text-purple-500",
  reviewing: "bg-yellow-500/10 text-yellow-500",
  approved: "bg-green-500/10 text-green-500",
  rejected: "bg-red-500/10 text-red-500",
};

const statusIcons: Record<string, React.ReactNode> = {
  todo: <Circle size={14} />,
  in_progress: <Clock size={14} />,
  submitted: <Clock size={14} />,
  reviewing: <AlertCircle size={14} />,
  approved: <CheckCircle2 size={14} />,
  rejected: <X size={14} />,
};

export default function ProjectDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const taskIdRaw = (params?.id as string | undefined) || (params?.projectId as string | undefined);
  const workspaceIdRaw = params?.workspaceId as string | undefined;
  const taskId = taskIdRaw ? parseInt(taskIdRaw) : null;
  const workspaceId = workspaceIdRaw ? parseInt(workspaceIdRaw) : null;
  const isAdmin = user?.role === "admin";

  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<number>>(new Set());
  
  // Links editing
  const [isEditingLinks, setIsEditingLinks] = useState(false);
  const [editedLinks, setEditedLinks] = useState({ github_link: "", deployed_link: "" });
  const [isSavingLinks, setIsSavingLinks] = useState(false);
  const [editedDueDate, setEditedDueDate] = useState("");
  const [isSavingDueDate, setIsSavingDueDate] = useState(false);
  
  // Comments
  const [newComment, setNewComment] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);
  const [isCreatingSubtask, setIsCreatingSubtask] = useState(false);
  const [selectedParentSubtaskId, setSelectedParentSubtaskId] = useState<number | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<ApiUser[]>([]);
  const [newSubtask, setNewSubtask] = useState({
    title: "",
    description: "",
    assigned_to: "",
  });
  const [selectedSubtaskAssigneeFilter, setSelectedSubtaskAssigneeFilter] = useState<string>("all");
  const [selectedSubtaskStatusFilter, setSelectedSubtaskStatusFilter] = useState<string>("all");

  // Recurring task instances (only when task.is_recurring is true)
  const [recurringInstances, setRecurringInstances] = useState<TaskRecurringInstancesResponse | null>(null);
  const [isLoadingRecurringInstances, setIsLoadingRecurringInstances] = useState(false);
  const [instanceActionLoadingId, setInstanceActionLoadingId] = useState<number | null>(null);
  const [showReRecordPanel, setShowReRecordPanel] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceRecordingSeconds, setVoiceRecordingSeconds] = useState(0);
  const [voiceNoteBlob, setVoiceNoteBlob] = useState<Blob | null>(null);
  const [voiceNotePreviewUrl, setVoiceNotePreviewUrl] = useState<string | null>(null);
  const [isSavingVoiceNote, setIsSavingVoiceNote] = useState(false);
  const [taskWarningSettings, setTaskWarningSettings] = useState<TaskWarningSettings>({
    task_warning_stage_days: 3,
    task_warning_comment_days: 2,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearVoiceTimer = () => {
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
  };

  const stopVoiceTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const resetReRecordDraft = () => {
    clearVoiceTimer();
    if (voiceNotePreviewUrl) {
      URL.revokeObjectURL(voiceNotePreviewUrl);
    }
    setVoiceNotePreviewUrl(null);
    setVoiceNoteBlob(null);
    setVoiceRecordingSeconds(0);
  };

  const stopReRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  };

  const startReRecording = async () => {
    try {
      if (typeof window === "undefined" || !("MediaRecorder" in window)) {
        toast.error("Voice recording is not supported in this browser");
        return;
      }

      resetReRecordDraft();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      voiceChunksRef.current = [];
      setVoiceRecordingSeconds(0);
      setIsRecordingVoice(true);

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          voiceChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        clearVoiceTimer();
        setIsRecordingVoice(false);
        stopVoiceTracks();

        const blob = new Blob(voiceChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        if (blob.size === 0) {
          toast.error("Recording is empty. Please try again.");
          return;
        }

        setVoiceNoteBlob(blob);
        const previewUrl = URL.createObjectURL(blob);
        setVoiceNotePreviewUrl(previewUrl);
      };

      recorder.start();
      voiceTimerRef.current = setInterval(() => {
        setVoiceRecordingSeconds((prev) => {
          if (prev + 1 >= MAX_VOICE_NOTE_SECONDS) {
            stopReRecording();
            return MAX_VOICE_NOTE_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Failed to start voice recording", error);
      stopVoiceTracks();
      clearVoiceTimer();
      setIsRecordingVoice(false);
      toast.error("Could not access microphone. Check browser permissions.");
    }
  };

  const saveReRecordedVoiceNote = async () => {
    if (!taskId || !voiceNoteBlob) {
      toast.error("Record a voice note first");
      return;
    }

    const extension =
      voiceNoteBlob.type.includes("mpeg") || voiceNoteBlob.type.includes("mp3")
        ? "mp3"
        : voiceNoteBlob.type.includes("ogg")
        ? "ogg"
        : voiceNoteBlob.type.includes("wav")
        ? "wav"
        : "webm";
    const file = new File([voiceNoteBlob], `task-${taskId}-voice-${Date.now()}.${extension}`, {
      type: voiceNoteBlob.type || "audio/webm",
    });

    setIsSavingVoiceNote(true);
    try {
      const uploadResult = await uploadTaskVoiceNote(file);
      if (uploadResult.error || !uploadResult.data) {
        toast.error(uploadResult.error || "Failed to upload voice note");
        return;
      }

      const updateResult = await updateTask(taskId, {
        voice_note_url: uploadResult.data.voice_note_url,
        voice_note_transcript: uploadResult.data.voice_note_transcript || undefined,
      });

      if (updateResult.error) {
        toast.error(updateResult.error);
        return;
      }

      toast.success("Voice note updated");
      setShowReRecordPanel(false);
      resetReRecordDraft();
      await loadProjectDetails();
    } finally {
      setIsSavingVoiceNote(false);
    }
  };

  useEffect(() => {
    return () => {
      clearVoiceTimer();
      stopVoiceTracks();
      if (voiceNotePreviewUrl) {
        URL.revokeObjectURL(voiceNotePreviewUrl);
      }
    };
  }, [voiceNotePreviewUrl]);

  useEffect(() => {
    const loadAssignableUsers = async () => {
      const response = await getAssignableUsers();
      if (response.data) setAssignableUsers(response.data);
    };
    loadAssignableUsers();
  }, []);

  useEffect(() => {
    const loadWarningSettings = async () => {
      const response = await getMyOrganizationSettings();
      if (response.data) {
        setTaskWarningSettings({
          task_warning_stage_days: response.data.task_warning_stage_days || 3,
          task_warning_comment_days: response.data.task_warning_comment_days || 2,
        });
      }
    };
    loadWarningSettings();
  }, []);

  useEffect(() => {
    // Only fetch recurrence data when we have a loaded project for a recurring task.
    if (!taskId) return;
    if (!project?.task?.is_recurring) return;

    let cancelled = false;
    const loadRecurring = async () => {
      setIsLoadingRecurringInstances(true);
      try {
        const res = await getTaskRecurringInstances(taskId, 10, 10);
        if (cancelled) return;
        if (res.data) setRecurringInstances(res.data);
        else if (res.error) toast.error(res.error);
      } catch (e) {
        if (!cancelled) toast.error("Failed to load recurring task instances");
        console.error(e);
      } finally {
        if (!cancelled) setIsLoadingRecurringInstances(false);
      }
    };

    loadRecurring();
    return () => {
      cancelled = true;
    };
  }, [taskId, project?.task?.is_recurring]);

  const loadProjectDetails = useCallback(async (silent = false) => {
    if (!taskId) return;
    
    if (!silent) {
      setIsLoading(true);
      setLoadError(null);
    }
    try {
      const response = await getProjectDetails(taskId);
      if (response.data) {
        setProject(response.data);
        setEditedLinks({
          github_link: response.data.task.github_link || "",
          deployed_link: response.data.task.deployed_link || "",
        });
        setEditedDueDate(response.data.task.due_date ? new Date(response.data.task.due_date).toISOString().slice(0, 10) : "");
      } else {
        const message = response.error || "Failed to load project details";
        setProject(null);
        setLoadError(message);
        toast.error(message);
        router.push("/project-management/projects");
      }
    } catch (error) {
      console.error("Error loading project:", error);
      const message = "Failed to load project details";
      if (!silent) {
        setProject(null);
        setLoadError(message);
        toast.error(message);
        router.push("/project-management/projects");
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [taskId, router]);

  useEffect(() => {
    if (taskId) {
      loadProjectDetails();
    }
  }, [taskId, loadProjectDetails]);

  const handleStatusChange = async (newStatus: string) => {
    if (!taskId) return;
    
    const validStatus = newStatus as "todo" | "in_progress" | "submitted" | "approved" | "rejected";
    const previousStatus = project?.task.status;

    // Optimistic update avoids full-page loading spinner.
    setProject((prev) => prev ? {
      ...prev,
      task: {
        ...prev.task,
        status: validStatus,
      },
    } : prev);

    try {
      const response = await updateTaskStatus(taskId, validStatus);
      if (response.data) {
        toast.success("Status updated successfully!");
        void loadProjectDetails(true);
      } else {
        if (previousStatus) {
          setProject((prev) => prev ? {
            ...prev,
            task: {
              ...prev.task,
              status: previousStatus,
            },
          } : prev);
        }
        toast.error(response.error || "Failed to update status");
      }
    } catch (error) {
      if (previousStatus) {
        setProject((prev) => prev ? {
          ...prev,
          task: {
            ...prev.task,
            status: previousStatus,
          },
        } : prev);
      }
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleSaveLinks = async () => {
    if (!taskId) return;
    
    setIsSavingLinks(true);
    try {
      const response = await updateTaskLinks(
        taskId,
        editedLinks.github_link || null,
        editedLinks.deployed_link || null
      );
      
      if (response.data) {
        toast.success("Links updated successfully!");
        setIsEditingLinks(false);
        loadProjectDetails();
      } else {
        toast.error(response.error || "Failed to update links");
      }
    } catch (error) {
      console.error("Error updating links:", error);
      toast.error("Failed to update links");
    } finally {
      setIsSavingLinks(false);
    }
  };

  const handleSaveDueDate = async () => {
    if (!taskId || !isAdmin) return;

    setIsSavingDueDate(true);
    try {
      const response = await updateTask(taskId, {
        due_date: editedDueDate || undefined,
      });

      if (response.error) {
        toast.error(response.error);
        return;
      }

      toast.success("Due date updated successfully!");
      loadProjectDetails();
    } catch (error) {
      console.error("Error updating due date:", error);
      toast.error("Failed to update due date");
    } finally {
      setIsSavingDueDate(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId || !newComment.trim()) return;
    
    setIsAddingComment(true);
    try {
      const response = await createComment({
        task_id: taskId,
        comment: newComment.trim(),
      });
      
      if (response.data) {
        toast.success("Comment added!");
        setNewComment("");
        loadProjectDetails();
      } else {
        toast.error(response.error || "Failed to add comment");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleSubtaskStatusChange = async (subtaskId: number, newStatus: string) => {
    const validStatus = newStatus as "todo" | "in_progress" | "completed" | "reviewing" | "approved" | "rejected";
    try {
      const response = await updateSubtaskStatus(subtaskId, validStatus);
      if (response.data) {
        toast.success("Subtask status updated!");
        loadProjectDetails();
      } else {
        toast.error(response.error || "Failed to update subtask");
      }
    } catch (error) {
      console.error("Error updating subtask:", error);
      toast.error("Failed to update subtask");
    }
  };

  const handleRecurringInstanceAction = async (
    instanceId: number,
    nextStatus: "completed" | "skipped"
  ) => {
    if (!instanceId) return;
    setInstanceActionLoadingId(instanceId);
    try {
      const res = await updateTaskInstanceStatus(instanceId, nextStatus);
      if (!res.data) {
        toast.error(res.error || "Failed to update instance");
        return;
      }

      setRecurringInstances((prev) => {
        if (!prev) return prev;

        const existing =
          prev.upcoming.find((i) => i.id === instanceId) ||
          prev.history.find((i) => i.id === instanceId);

        const enriched = {
          ...res.data,
          assigned_to: (existing as any)?.assigned_to ?? null,
          assignee_name: (existing as any)?.assignee_name ?? null,
        } as TaskRecurringInstancesResponse["upcoming"][number];

        const nextUpcoming = prev.upcoming.filter((i) => i.id !== instanceId);
        const nextHistory = [
          enriched,
          ...prev.history.filter((i) => i.id !== instanceId),
        ].sort(
          (a, b) =>
            new Date(b.instance_date).getTime() -
            new Date(a.instance_date).getTime()
        );

        return {
          ...prev,
          upcoming: nextUpcoming,
          history: nextHistory,
          next_occurrence_date: nextUpcoming[0]?.instance_date ?? null,
        };
      });

      toast.success(
        nextStatus === "completed" ? "Instance marked complete" : "Instance skipped"
      );
    } catch (e) {
      console.error("Recurring instance update failed:", e);
      toast.error("Failed to update instance");
    } finally {
      setInstanceActionLoadingId(null);
    }
  };

  const toggleSubtaskExpand = (subtaskId: number) => {
    setExpandedSubtasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subtaskId)) {
        newSet.delete(subtaskId);
      } else {
        newSet.add(subtaskId);
      }
      return newSet;
    });
  };

  const openAddSubtaskModal = (parentSubtaskId: number | null = null) => {
    setSelectedParentSubtaskId(parentSubtaskId);
    setNewSubtask({ title: "", description: "", assigned_to: "" });
    setShowSubtaskModal(true);
  };

  const handleCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId || !newSubtask.title.trim()) return;
    if (!newSubtask.assigned_to) {
      toast.error("Please assign this subtask to an employee");
      return;
    }

    setIsCreatingSubtask(true);
    try {
      const response = await createSubtask(taskId, {
        title: newSubtask.title.trim(),
        description: newSubtask.description.trim() || undefined,
        assigned_to: Number(newSubtask.assigned_to),
        parent_subtask_id: selectedParentSubtaskId ?? undefined,
      });

      if (response.data) {
        toast.success(selectedParentSubtaskId ? "Sub-subtask created" : "Subtask created");
        setShowSubtaskModal(false);
        setSelectedParentSubtaskId(null);
        loadProjectDetails();
      } else {
        toast.error(response.error || "Failed to create subtask");
      }
    } catch (error) {
      console.error("Error creating subtask:", error);
      toast.error("Failed to create subtask");
    } finally {
      setIsCreatingSubtask(false);
    }
  };

  const collectAssigneeOptions = (nodes: any[]): Array<{ value: string; label: string }> => {
    const map = new Map<string, string>();

    const walk = (items: any[]) => {
      items.forEach((item) => {
        if (item.assigned_to && item.assignee_name) {
          map.set(`id:${item.assigned_to}`, item.assignee_name);
        } else if (item.assignee_name) {
          map.set(`name:${item.assignee_name.toLowerCase()}`, item.assignee_name);
        }
        if (item.children?.length) {
          walk(item.children);
        }
      });
    };

    walk(nodes);

    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  };

  const filterSubtaskTree = (nodes: any[], assigneeFilterValue: string, statusFilterValue: string): any[] => {
    const matchesAssignee = (node: any) => {
      if (assigneeFilterValue === "all") return true;
      if (assigneeFilterValue.startsWith("id:")) {
        const selectedId = Number(assigneeFilterValue.replace("id:", ""));
        return Number(node.assigned_to) === selectedId;
      }

      const selectedName = assigneeFilterValue.replace("name:", "").toLowerCase();
      return (node.assignee_name || "").toLowerCase() === selectedName;
    };

    const matchesStatus = (node: any) => {
      if (statusFilterValue === "all") return true;
      if (statusFilterValue === "new") return node.status === "todo";
      if (statusFilterValue === "completed") return ["completed", "approved"].includes(node.status);
      return node.status === statusFilterValue;
    };

    const walk = (items: any[]): any[] => {
      const result: any[] = [];
      for (const item of items) {
        const filteredChildren = item.children?.length ? walk(item.children) : [];
        if ((matchesAssignee(item) && matchesStatus(item)) || filteredChildren.length > 0) {
          result.push({ ...item, children: filteredChildren });
        }
      }
      return result;
    };

    return walk(nodes);
  };

  const subtaskAssigneeOptions = useMemo(() => {
    return project?.subtasks ? collectAssigneeOptions(project.subtasks) : [];
  }, [project?.subtasks]);

  const taskAdminStatusOptions: DropdownOption[] = useMemo(() => ([
    { value: "todo", label: "To Do", icon: <Circle size={12} /> },
    { value: "in_progress", label: "In Progress", icon: <Clock size={12} /> },
    { value: "submitted", label: "Completed", icon: <CheckCircle2 size={12} /> },
    { value: "reviewing", label: "Reviewing", icon: <AlertCircle size={12} /> },
    { value: "approved", label: "Approved", icon: <CheckCircle2 size={12} /> },
    { value: "rejected", label: "Rejected", icon: <X size={12} /> },
  ]), []);

  const subtaskAdminStatusOptions: DropdownOption[] = useMemo(() => ([
    { value: "todo", label: "To Do", icon: <Circle size={12} /> },
    { value: "in_progress", label: "In Progress", icon: <Clock size={12} /> },
    { value: "completed", label: "Completed", icon: <CheckCircle2 size={12} /> },
    { value: "reviewing", label: "Reviewing", icon: <AlertCircle size={12} /> },
    { value: "approved", label: "Approved", icon: <CheckCircle2 size={12} /> },
    { value: "rejected", label: "Rejected", icon: <X size={12} /> },
  ]), []);

  const subtaskAssigneeFilterOptions: DropdownOption[] = useMemo(() => ([
    { value: "all", label: "All Assignees", icon: <User size={12} /> },
    ...subtaskAssigneeOptions.map((option) => ({
      value: option.value,
      label: option.label,
      icon: <User size={12} />,
    })),
  ]), [subtaskAssigneeOptions]);

  const subtaskStatusFilterOptions: DropdownOption[] = useMemo(() => ([
    { value: "all", label: "All Status", icon: <span className="text-muted-foreground">●</span> },
    { value: "new", label: "New / To Do", icon: <span className="text-purple-400">●</span> },
    { value: "in_progress", label: "In Progress", icon: <span className="text-blue-400">●</span> },
    { value: "completed", label: "Completed", icon: <span className="text-green-400">●</span> },
  ]), []);

  const priorityOrder: Record<string, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  const statusOrder: Record<string, number> = {
    in_progress: 0,
    todo: 1,
    submitted: 2,
    reviewing: 3,
    approved: 4,
    rejected: 5,
  };

  const sortSubtaskNodes = useCallback((nodes: any[]): any[] => {
    return [...nodes]
      .sort((left, right) => {
        const leftPriority = priorityOrder[left.priority] ?? 99;
        const rightPriority = priorityOrder[right.priority] ?? 99;
        if (leftPriority !== rightPriority) return leftPriority - rightPriority;

        const leftStatus = statusOrder[left.status] ?? 99;
        const rightStatus = statusOrder[right.status] ?? 99;
        if (leftStatus !== rightStatus) return leftStatus - rightStatus;

        return String(left.title || "").localeCompare(String(right.title || ""));
      })
      .map((node) => ({
        ...node,
        children: node.children?.length ? sortSubtaskNodes(node.children) : [],
      }));
  }, []);

  const collectInProgressSubtasks = useCallback((nodes: any[]): any[] => {
    const result: any[] = [];

    const walk = (items: any[]) => {
      items.forEach((item) => {
        if (item.status === "in_progress") {
          result.push(item);
        }
        if (item.children?.length) {
          walk(item.children);
        }
      });
    };

    walk(nodes);
    return result;
  }, []);

  const filteredSubtasks = useMemo(() => {
    const filtered = project?.subtasks
      ? filterSubtaskTree(project.subtasks, selectedSubtaskAssigneeFilter, selectedSubtaskStatusFilter)
      : [];
    return sortSubtaskNodes(filtered);
  }, [project?.subtasks, selectedSubtaskAssigneeFilter, selectedSubtaskStatusFilter, sortSubtaskNodes]);

  const inProgressSubtasks = useMemo(() => {
    return collectInProgressSubtasks(filteredSubtasks);
  }, [collectInProgressSubtasks, filteredSubtasks]);

  const renderSubtaskTree = (subtasks: any[], level = 0) => {
    return subtasks.map((subtask) => (
      <div key={subtask.id} className="space-y-2">
        <div 
          className="relative rounded-xl bg-white/40 dark:bg-white/5 backdrop-blur-md border border-white/30 p-4 hover:bg-white/50 dark:hover:bg-white/10 transition-all duration-200 shadow-sm"
          style={{ marginLeft: `${level * 24}px` }}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
            style={{ backgroundColor: level === 0 ? "#8B5CF6" : level === 1 ? "#A78BFA" : "#C4B5FD" }}
          />
          
          <div className="flex items-start justify-between ml-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {subtask.children && subtask.children.length > 0 && (
                  <button
                    onClick={() => toggleSubtaskExpand(subtask.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {expandedSubtasks.has(subtask.id) ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </button>
                )}
                <ListTree size={14} className="text-purple-500" />
                {subtask.public_id && (
                  <>
                    <span className="font-mono text-[10px] font-semibold bg-purple-500/10 text-purple-500 px-1.5 py-0.5 rounded select-all tracking-wider">
                      {subtask.public_id}
                    </span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(subtask.public_id); }}
                      title="Copy Ref ID"
                      className="text-muted-foreground hover:text-purple-500 transition-colors"
                    >
                      <Copy size={10} />
                    </button>
                  </>
                )}
                <span className="text-sm font-medium text-card-foreground">{subtask.title}</span>
              </div>
              
              {subtask.description && (
                <p className="text-xs text-muted-foreground mt-1 ml-8">{subtask.description}</p>
              )}
              
              {subtask.assignee_name && (
                <div className="flex items-center gap-2 mt-2 ml-8">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 text-[9px] font-bold">
                    {subtask.assignee_name.split(" ").map((n: string) => n[0]).join("")}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{subtask.assignee_name}</span>
                </div>
              )}

              <div className="mt-2 ml-8">
                <button
                  onClick={() => openAddSubtaskModal(subtask.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-purple-300/40 dark:border-purple-500/40 px-2.5 py-1 text-[11px] font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 transition-colors"
                >
                  <Plus size={11} />
                  Add Subtask
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <DropdownMenu
                  value={subtask.status}
                  onValueChange={(value) => handleSubtaskStatusChange(subtask.id, value)}
                  options={subtaskAdminStatusOptions}
                  triggerClassName={`w-[145px] rounded-lg px-3 py-1.5 text-xs font-medium ${
                    subtask.status === 'approved' ? 'text-green-500' :
                    subtask.status === 'rejected' ? 'text-red-500' :
                    subtask.status === 'reviewing' ? 'text-purple-500' : 'text-muted-foreground'
                  }`}
                />
              ) : (
                <DropdownMenu
                  value={subtask.status}
                  onValueChange={(value) => handleSubtaskStatusChange(subtask.id, value)}
                  options={['reviewing', 'approved', 'rejected'].includes(subtask.status)
                    ? [{
                        value: subtask.status,
                        label: subtask.status.charAt(0).toUpperCase() + subtask.status.slice(1),
                        icon: <AlertCircle size={12} />,
                        disabled: true,
                      }]
                    : [
                        { value: 'todo', label: 'To Do', icon: <Circle size={12} /> },
                        { value: 'in_progress', label: 'In Progress', icon: <Clock size={12} /> },
                        { value: 'completed', label: 'Completed', icon: <CheckCircle2 size={12} /> },
                      ]}
                  disabled={subtask.assigned_to !== user?.id || ['reviewing', 'approved', 'rejected'].includes(subtask.status)}
                  triggerClassName={`w-[145px] rounded-lg px-3 py-1.5 text-xs font-medium ${
                    subtask.status === 'completed' ? 'text-green-500' :
                    subtask.status === 'in_progress' ? 'text-blue-500' :
                    subtask.status === 'approved' ? 'text-green-500' :
                    subtask.status === 'rejected' ? 'text-red-500' :
                    subtask.status === 'reviewing' ? 'text-purple-500' : 'text-muted-foreground'
                  }`}
                />
              )}
            </div>
          </div>
        </div>
        
        {subtask.children && subtask.children.length > 0 && expandedSubtasks.has(subtask.id) && (
          <div className="ml-6">
            {renderSubtaskTree(subtask.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!project) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="min-h-screen flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/20 dark:bg-white/5 backdrop-blur-xl p-8 text-center shadow-lg">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <AlertCircle size={22} />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Project unavailable</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {loadError || "We could not load this project right now."}
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => loadProjectDetails()}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
                >
                  <Loader2 size={16} className="animate-spin" />
                  Retry
                </button>
                <button
                  onClick={() => router.push("/project-management/projects")}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back to Projects
                </button>
              </div>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const { task, subtasks, comments } = project;
  const latestCommentAt = comments.length > 0 ? comments[comments.length - 1].created_at : task.latest_comment_at || null;
  const latestSubtaskActivityAt = (() => {
    const walk = (nodes: typeof subtasks): number => {
      return nodes.reduce((latest, node) => {
        const nodeTs = Date.parse(node.updated_at || node.created_at || "");
        const childTs = node.children?.length ? walk(node.children) : 0;
        return Math.max(latest, Number.isNaN(nodeTs) ? 0 : nodeTs, childTs);
      }, 0);
    };
    const ts = walk(subtasks);
    return ts ? new Date(ts).toISOString() : null;
  })();
  const warningState = getTaskWarningState(
    { ...task, latest_comment_at: latestCommentAt || latestSubtaskActivityAt },
    taskWarningSettings,
    new Date(),
    latestSubtaskActivityAt
  );

  const collectProjectTaskStats = (nodes: typeof subtasks) => {
    const stats = { total: 0, todo: 0, inProgress: 0, completed: 0 };
    const walk = (items: typeof subtasks) => {
      items.forEach((item) => {
        stats.total += 1;
        if (item.status === "todo") stats.todo += 1;
        else if (item.status === "in_progress") stats.inProgress += 1;
        else if (item.status === "completed" || item.status === "approved") stats.completed += 1;
        if (item.children?.length) walk(item.children);
      });
    };
    walk(nodes);
    return stats;
  };

  const projectTaskStats = collectProjectTaskStats(subtasks);

  const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const parseRepeatDays = (raw: string | null | undefined): number[] => {
    if (!raw) return [];
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        return parsed
          .map((n) => Number(n))
          .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
      }
    } catch {
      // Ignore malformed repeat_days payloads.
    }
    return [];
  };

  const repeatDaysNums = parseRepeatDays(task.repeat_days);
  const repeatDaysLabel = repeatDaysNums.length ? repeatDaysNums.map((d) => WEEKDAYS[d]).join(", ") : null;

  const recurrenceTypeLabel =
    task.recurrence_type === "daily"
      ? "Daily"
      : task.recurrence_type === "weekly"
      ? "Weekly"
      : task.recurrence_type === "monthly"
      ? "Monthly"
      : task.recurrence_type || "Custom";

  const recurrenceInterval = task.recurrence_interval ?? 1;
  const recurrenceIntervalUnit =
    task.recurrence_type === "daily"
      ? "day(s)"
      : task.recurrence_type === "weekly"
      ? "week(s)"
      : task.recurrence_type === "monthly"
      ? "month(s)"
      : "day(s)";

  const recurrenceStartDate = task.recurrence_start_date || task.start_date;
  const recurrenceEndDate = task.recurrence_end_date || null;

  const upcomingInstances = recurringInstances?.upcoming ?? [];
  const historyInstances = recurringInstances?.history ?? [];

  const totalOccurrences = upcomingInstances.length + historyInstances.length;
  const completedCount = historyInstances.filter((i) => i.status === "completed").length;
  const skippedCount = historyInstances.filter((i) => i.status === "skipped").length;
  const missedCount = historyInstances.filter((i) => i.status !== "completed" && i.status !== "skipped").length;
  const completionPercent = totalOccurrences > 0 ? Math.round((completedCount / totalOccurrences) * 100) : 0;
  const nextOccurrenceDateValue =
    recurringInstances?.next_occurrence_date ?? upcomingInstances[0]?.instance_date ?? null;

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6 pb-8">
          {/* Header with Back Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (workspaceId) router.push(`/project-management/projects?workspace=${workspaceId}`);
                else router.push("/project-management/projects");
              }}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">Back to Projects</span>
            </button>
          </div>

          {warningState.isWarning && warningState.reason && (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle size={16} />
                Warning flagged
              </div>
              <p className="mt-1 text-xs leading-relaxed text-red-600/90 dark:text-red-200/90">
                {warningState.reason}
              </p>
            </div>
          )}

          {/* Project Header Card */}
          <div className="glass-card rounded-2xl border border-white/20 p-6 shadow-lg backdrop-blur-xl bg-white/30 dark:bg-white/5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground mb-2">{task.title}</h1>
                {task.description && (
                  <p className="text-muted-foreground">{task.description}</p>
                )}
                <div className="mt-4 rounded-xl border border-border/70 bg-secondary/30 p-3 max-w-xl">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1.5">
                      <Mic size={12} /> Voice Note
                    </p>
                    <div className="flex items-center gap-2">
                      {task.voice_note_url && isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isRecordingVoice) stopReRecording();
                            if (showReRecordPanel) {
                              resetReRecordDraft();
                              setShowReRecordPanel(false);
                            } else {
                              setShowReRecordPanel(true);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/50 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors"
                        >
                          <RotateCcw size={12} />
                          {showReRecordPanel ? "Cancel Re-record" : "Re-record"}
                        </button>
                      )}
                    </div>
                  </div>

                  {task.voice_note_url ? (
                    <>
                      <audio controls preload="metadata" className="w-full h-10">
                        <source src={task.voice_note_url} type="audio/webm" />
                        <source src={task.voice_note_url} type="audio/mpeg" />
                        Your browser does not support the audio player.
                      </audio>

                      {isAdmin && showReRecordPanel && (
                        <div className="mt-3 rounded-lg border border-border/70 bg-background/50 p-3 space-y-3">
                          {!voiceNoteBlob ? (
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs text-muted-foreground">
                                {isRecordingVoice
                                  ? `Recording... ${voiceRecordingSeconds}s / ${MAX_VOICE_NOTE_SECONDS}s`
                                  : "Record a new voice note to replace the current one"}
                              </p>
                              {isRecordingVoice ? (
                                <button
                                  type="button"
                                  onClick={stopReRecording}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-red-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-600 transition-colors"
                                >
                                  <Square size={11} /> Stop
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={startReRecording}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                                >
                                  <Play size={11} /> Start Recording
                                </button>
                              )}
                            </div>
                          ) : (
                            <>
                              <audio controls preload="metadata" className="w-full h-10" src={voiceNotePreviewUrl || undefined} />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={resetReRecordDraft}
                                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
                                >
                                  <Trash2 size={11} /> Discard
                                </button>
                                <button
                                  type="button"
                                  onClick={startReRecording}
                                  className="inline-flex items-center gap-1 rounded-md border border-amber-400/50 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors"
                                >
                                  <RotateCcw size={11} /> Record Again
                                </button>
                                <button
                                  type="button"
                                  onClick={saveReRecordedVoiceNote}
                                  disabled={isSavingVoiceNote}
                                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                                >
                                  {isSavingVoiceNote ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save Replacement
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {task.voice_note_transcript && (
                        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                          Transcript: {task.voice_note_transcript}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">No voice note has been added yet.</p>
                      {isAdmin ? (
                        <div className="rounded-lg border border-dashed border-border/70 bg-background/40 p-3 space-y-3">
                          {!showReRecordPanel ? (
                            <button
                              type="button"
                              onClick={() => setShowReRecordPanel(true)}
                              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                              <Mic size={11} /> Add Voice Note
                            </button>
                          ) : !voiceNoteBlob ? (
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs text-muted-foreground">
                                {isRecordingVoice
                                  ? `Recording... ${voiceRecordingSeconds}s / ${MAX_VOICE_NOTE_SECONDS}s`
                                  : "Record a voice note for this project"}
                              </p>
                              {isRecordingVoice ? (
                                <button
                                  type="button"
                                  onClick={stopReRecording}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-red-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-600 transition-colors"
                                >
                                  <Square size={11} /> Stop
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={startReRecording}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                                >
                                  <Play size={11} /> Start Recording
                                </button>
                              )}
                            </div>
                          ) : (
                            <>
                              <audio controls preload="metadata" className="w-full h-10" src={voiceNotePreviewUrl || undefined} />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={resetReRecordDraft}
                                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
                                >
                                  <Trash2 size={11} /> Discard
                                </button>
                                <button
                                  type="button"
                                  onClick={startReRecording}
                                  className="inline-flex items-center gap-1 rounded-md border border-amber-400/50 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors"
                                >
                                  <RotateCcw size={11} /> Record Again
                                </button>
                                <button
                                  type="button"
                                  onClick={saveReRecordedVoiceNote}
                                  disabled={isSavingVoiceNote}
                                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                                >
                                  {isSavingVoiceNote ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save Voice Note
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Only admins can add a voice note to this project.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

                    
              
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border ${priorityColors[task.priority]}`}>
                  {task.priority.toUpperCase()}
                </span>
                
                {isAdmin ? (
                  <DropdownMenu
                    value={task.status}
                    onValueChange={(value) => handleStatusChange(value)}
                    options={taskAdminStatusOptions}
                    triggerClassName={`w-[170px] rounded-full px-3 py-1.5 text-xs font-semibold ${statusColors[task.status]}`}
                  />
                ) : (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${statusColors[task.status]}`}>
                    {statusIcons[task.status]}
                    {task.status === "submitted" ? "Completed (Pending Review)" : 
                     task.status === "approved" ? "Approved" :
                     task.status === "rejected" ? "Needs Changes" :
                     task.status === "in_progress" ? "In Progress" : "To Do"}
                  </span>
                )}
              </div>
            </div>

            {warningState.isWarning && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-600 dark:text-red-300">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/15">
                    <AlertCircle size={16} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Task warning</p>
                    <p className="text-sm leading-relaxed">{warningState.reason}</p>
                    <p className="text-xs text-red-600/80 dark:text-red-300/80">
                      Thresholds: stage update after {taskWarningSettings.task_warning_stage_days} day(s), comment/activity after {taskWarningSettings.task_warning_comment_days} day(s).
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {[
                { label: "Tasks", value: projectTaskStats.total, tone: "text-foreground" },
                { label: "New / To Do", value: projectTaskStats.todo, tone: "text-purple-500" },
                { label: "In Progress", value: projectTaskStats.inProgress, tone: "text-blue-500" },
                { label: "Completed", value: projectTaskStats.completed, tone: "text-green-500" },
              ].map((card) => (
                <div key={card.label} className="rounded-2xl border border-border/60 bg-secondary/30 px-4 py-3">
                  <div className={`text-2xl font-extrabold ${card.tone}`}>{card.value}</div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{card.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 text-sm font-bold">
                  {task.assignee_name?.split(" ").map(n => n[0]).join("") || "?"}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Assigned To</p>
                  <p className="text-sm font-medium text-foreground">{task.assignee_name || "Unassigned"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                <Calendar size={20} className="text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="text-sm font-medium text-foreground">
                    {task.start_date ? new Date(task.start_date).toLocaleDateString("en-IN") : "--"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                <Clock size={20} className="text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  {isAdmin ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="date"
                        value={editedDueDate}
                        onChange={(e) => setEditedDueDate(e.target.value)}
                        className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <button
                        type="button"
                        onClick={handleSaveDueDate}
                        disabled={isSavingDueDate}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                      >
                        {isSavingDueDate ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-foreground">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString("en-IN") : "--"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {typeof task.progress === 'number' && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Progress</span>
                  <span className="text-sm font-bold text-purple-600">{task.progress}%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 transition-all duration-300"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Recurrence Details / Upcoming / History (Recurring tasks only) */}
          {task.is_recurring && (
            <div className="space-y-6">
              {/* Recurrence Details Card */}
              <div className="glass-card rounded-2xl border border-white/20 p-5 shadow-lg backdrop-blur-xl bg-white/30 dark:bg-white/5">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Repeat2 size={20} className="text-purple-500" />
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Recurrence Details</h2>
                      <p className="text-xs text-muted-foreground">Configuration & next scheduled run</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays size={14} />
                    <span className="font-medium">
                      Next:{" "}
                      {nextOccurrenceDateValue
                        ? new Date(nextOccurrenceDateValue).toLocaleDateString("en-IN")
                        : "--"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-white/10">
                    <Repeat2 size={18} className="text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Repeat Type</p>
                      <p className="text-sm font-semibold text-foreground">{recurrenceTypeLabel}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-white/10">
                    <Repeat2 size={18} className="text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Interval</p>
                      <p className="text-sm font-semibold text-foreground">
                        Every {recurrenceInterval} {recurrenceIntervalUnit}
                      </p>
                    </div>
                  </div>

                  {task.recurrence_type === "weekly" && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-white/10">
                      <Repeat2 size={18} className="text-amber-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Days of Week</p>
                        <p className="text-sm font-semibold text-foreground">
                          {repeatDaysLabel ?? "--"}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-white/10">
                    <Calendar size={18} className="text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Start Date</p>
                      <p className="text-sm font-semibold text-foreground">
                        {recurrenceStartDate
                          ? new Date(recurrenceStartDate).toLocaleDateString("en-IN")
                          : "--"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-white/10">
                    <CalendarDays size={18} className="text-orange-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">End Date</p>
                      <p className="text-sm font-semibold text-foreground">
                        {recurrenceEndDate
                          ? new Date(recurrenceEndDate).toLocaleDateString("en-IN")
                          : "Open-ended"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-white/10">
                    <Clock size={18} className="text-purple-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Next Occurrence</p>
                      <p className="text-sm font-semibold text-foreground">
                        {nextOccurrenceDateValue
                          ? new Date(nextOccurrenceDateValue).toLocaleDateString("en-IN")
                          : isLoadingRecurringInstances
                          ? "Loading..."
                          : "--"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Upcoming Instances */}
                  <div className="glass-card rounded-2xl border border-white/20 p-6 shadow-lg backdrop-blur-xl bg-white/30 dark:bg-white/5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <CalendarDays size={20} className="text-primary" />
                        <h3 className="text-lg font-semibold text-foreground">Upcoming Instances</h3>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isLoadingRecurringInstances ? "Loading..." : `${upcomingInstances.length} items`}
                      </div>
                    </div>

                    {upcomingInstances.length > 0 ? (
                      <div className="space-y-3">
                        {upcomingInstances.map((inst) => (
                          <div
                            key={inst.id}
                            className="flex items-center justify-between gap-4 p-4 rounded-xl bg-secondary/30 border border-white/10 hover:bg-secondary/40 transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">
                                  {new Date(inst.instance_date).toLocaleDateString("en-IN")}
                                </span>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                    inst.status === "in_progress"
                                      ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
                                      : "bg-purple-500/10 text-purple-500 border-purple-500/30"
                                  }`}
                                >
                                  Pending
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                Assigned to:{" "}
                                <span className="text-sm font-medium text-foreground">
                                  {inst.assignee_name || task.assignee_name || "Unassigned"}
                                </span>
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={instanceActionLoadingId === inst.id}
                                onClick={() => handleRecurringInstanceAction(inst.id, "completed")}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-60 transition-all"
                              >
                                <CheckCircle2 size={14} className="inline mr-1 -mt-[1px]" />
                                Mark Complete
                              </button>
                              <button
                                type="button"
                                disabled={instanceActionLoadingId === inst.id}
                                onClick={() => handleRecurringInstanceAction(inst.id, "skipped")}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:bg-secondary disabled:opacity-60 transition-all"
                              >
                                <SkipForward size={14} className="inline mr-1 -mt-[1px]" />
                                Skip
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-8 text-center">No upcoming instances</p>
                    )}
                  </div>

                  {/* Past Activity / History */}
                  <div className="glass-card rounded-2xl border border-white/20 p-6 shadow-lg backdrop-blur-xl bg-white/30 dark:bg-white/5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <ListTree size={20} className="text-primary" />
                        <h3 className="text-lg font-semibold text-foreground">Past Activity</h3>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isLoadingRecurringInstances ? "Loading..." : `${historyInstances.length} items`}
                      </div>
                    </div>

                    {historyInstances.length > 0 ? (
                      <div className="space-y-3">
                        {historyInstances.map((inst) => {
                          const isCompleted = inst.status === "completed";
                          const isSkipped = inst.status === "skipped";
                          const isMissed = !isCompleted && !isSkipped;
                          const statusPill =
                            isCompleted
                              ? "bg-green-500/10 text-green-500 border-green-500/30"
                              : isSkipped
                              ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
                              : "bg-red-500/10 text-red-500 border-red-500/30";

                          return (
                            <div
                              key={inst.id}
                              className="flex items-start justify-between gap-4 p-4 rounded-xl bg-secondary/30 border border-white/10"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-foreground">
                                    {new Date(inst.instance_date).toLocaleDateString("en-IN")}
                                  </span>
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusPill}`}
                                  >
                                    {isCompleted ? "Completed" : isSkipped ? "Skipped" : "Missed"}
                                  </span>
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Completion time:{" "}
                                  <span className="text-sm font-medium text-foreground">
                                    {isCompleted ? new Date(inst.updated_at).toLocaleString("en-IN") : "--"}
                                  </span>
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground shrink-0">
                                {inst.assignee_name ? (
                                  <span className="block">
                                    {inst.assignee_name === user?.name ? "You" : inst.assignee_name}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-8 text-center">No activity yet</p>
                    )}
                  </div>
                </div>

                {/* Completion Stats Card */}
                <div className="lg:col-span-1">
                  <div className="glass-card rounded-2xl border border-white/20 p-6 shadow-lg backdrop-blur-xl bg-white/30 dark:bg-white/5 sticky top-24">
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Percent size={20} className="text-primary" />
                      Completion Stats
                    </h3>

                    <div className="space-y-3 mb-5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total occurrences</span>
                        <span className="font-semibold text-foreground">{totalOccurrences}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-500">Completed</span>
                        <span className="font-semibold text-foreground">{completedCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-red-500">Missed</span>
                        <span className="font-semibold text-foreground">{missedCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-yellow-500">Skipped</span>
                        <span className="font-semibold text-foreground">{skippedCount}</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Completion</span>
                        <span className="text-sm font-bold text-purple-600">{completionPercent}%</span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-600 transition-all duration-300"
                          style={{ width: `${completionPercent}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Track recurring performance at a glance.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Deployment Links Section */}
          <div className="glass-card rounded-2xl border border-white/20 p-6 shadow-lg backdrop-blur-xl bg-white/30 dark:bg-white/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Deployment Links</h2>
              {!isAdmin && task.assigned_to === user?.id && (
                <>
                  {!isEditingLinks ? (
                    <button
                      onClick={() => setIsEditingLinks(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium shadow-md transition-all"
                    >
                      <Edit size={14} />
                      Edit Links
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsEditingLinks(false);
                          setEditedLinks({
                            github_link: task.github_link || "",
                            deployed_link: task.deployed_link || "",
                          });
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-muted-foreground hover:bg-secondary text-sm font-medium transition-all"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveLinks}
                        disabled={isSavingLinks}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium shadow-md transition-all disabled:opacity-50"
                      >
                        {isSavingLinks ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Save
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* GitHub Link */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Github size={16} />
                  GitHub Repository
                </label>
                {isEditingLinks ? (
                  <input
                    type="url"
                    value={editedLinks.github_link}
                    onChange={(e) => setEditedLinks({ ...editedLinks, github_link: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="https://github.com/username/repo"
                  />
                ) : task.github_link ? (
                  <a
                    href={task.github_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors text-sm"
                  >
                    <ExternalLink size={14} />
                    {task.github_link}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No link added yet</p>
                )}
              </div>

              {/* Deployed Link */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <ExternalLink size={16} />
                  Deployed Application
                </label>
                {isEditingLinks ? (
                  <input
                    type="url"
                    value={editedLinks.deployed_link}
                    onChange={(e) => setEditedLinks({ ...editedLinks, deployed_link: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="https://your-project.vercel.app"
                  />
                ) : task.deployed_link ? (
                  <a
                    href={task.deployed_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-green-500 hover:text-green-600 transition-colors text-sm"
                  >
                    <ExternalLink size={14} />
                    {task.deployed_link}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No link added yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Subtasks Section */}
          <div className="glass-card rounded-2xl border border-white/20 p-6 shadow-lg backdrop-blur-xl bg-white/30 dark:bg-white/5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <ListTree size={20} className="text-purple-500" />
                  Subtasks ({filteredSubtasks.length}{selectedSubtaskAssigneeFilter === "all" ? "" : ` of ${subtasks.length}`})
                </h2>
                <div className="flex items-center gap-2">
                  <DropdownMenu
                    value={selectedSubtaskAssigneeFilter}
                    onValueChange={setSelectedSubtaskAssigneeFilter}
                    options={subtaskAssigneeFilterOptions}
                    triggerClassName="w-[170px] rounded-lg px-2.5 py-2 text-xs font-medium"
                  />

                  <DropdownMenu
                    value={selectedSubtaskStatusFilter}
                    onValueChange={setSelectedSubtaskStatusFilter}
                    options={subtaskStatusFilterOptions}
                    triggerClassName="w-[170px] rounded-lg px-2.5 py-2 text-xs font-medium"
                  />

                  <button
                    onClick={() => openAddSubtaskModal(null)}
                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-700 px-3 py-2 text-xs font-semibold text-white transition-colors"
                  >
                    <Plus size={14} />
                    Add Subtask
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Total", value: filteredSubtasks.length, tone: "text-foreground" },
                    { label: "New / To Do", value: filteredSubtasks.filter((item) => item.status === "todo").length, tone: "text-purple-500" },
                    { label: "In Progress", value: filteredSubtasks.filter((item) => item.status === "in_progress").length, tone: "text-blue-500" },
                    { label: "Completed", value: filteredSubtasks.filter((item) => ["completed", "approved"].includes(item.status)).length, tone: "text-green-500" },
                  ].map((card) => (
                    <div key={card.label} className="rounded-xl border border-border/60 bg-secondary/30 px-3 py-2.5">
                      <div className={`text-xl font-extrabold ${card.tone}`}>{card.value}</div>
                      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{card.label}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">Priority sequence</p>
                    <p className="text-xs text-muted-foreground">
                      In progress: <span className="font-semibold text-foreground">{inProgressSubtasks.length}</span>
                    </p>
                  </div>
                  {inProgressSubtasks.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {inProgressSubtasks.slice(0, 6).map((subtask) => (
                        <span
                          key={subtask.id}
                          className="inline-flex items-center gap-1 rounded-full border border-blue-500/25 bg-white/70 px-2.5 py-1 text-xs font-medium text-blue-600 dark:bg-white/5 dark:text-blue-300"
                        >
                          <Clock size={11} />
                          <span className="max-w-[180px] truncate">{subtask.title}</span>
                        </span>
                      ))}
                      {inProgressSubtasks.length > 6 && (
                        <span className="inline-flex items-center rounded-full border border-border bg-background/70 px-2.5 py-1 text-xs text-muted-foreground">
                          +{inProgressSubtasks.length - 6} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No subtasks are currently in progress.</p>
                  )}
                </div>

                {filteredSubtasks.length > 0 ? renderSubtaskTree(filteredSubtasks) : (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      {subtasks.length > 0
                        ? "No subtasks match selected assignee."
                        : "No subtasks yet. Add one to start breaking down this task."}
                    </p>
                  </div>
                )}
              </div>
            </div>

          {/* Comments Section */}
          <div className="glass-card rounded-2xl border border-white/20 p-6 shadow-lg backdrop-blur-xl bg-white/30 dark:bg-white/5">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <MessageSquare size={20} className="text-purple-500" />
              Project Chat & Resources ({comments.length})
            </h2>

            {/* Comments List */}
            <div className="space-y-4 mb-6">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 p-4 rounded-lg bg-secondary/30 border border-white/10">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 text-sm font-bold flex-shrink-0">
                      {comment.user_name?.split(" ").map(n => n[0]).join("") || "?"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-foreground">{comment.user_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${comment.user_role === 'admin' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                          {comment.user_role}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p className="text-sm text-card-foreground">{comment.comment}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground text-sm py-8">No messages yet. Start the chat and share resources!</p>
              )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="flex gap-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share an update, document link, repo, or any resource..."
                className="flex-1 rounded-lg border border-input bg-background py-3 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={3}
              />
              <button
                type="submit"
                disabled={isAddingComment || !newComment.trim()}
                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 h-fit"
              >
                {isAddingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Send
              </button>
            </form>
          </div>
        </div>

        {showSubtaskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/20 bg-card p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">
                  {selectedParentSubtaskId ? "Create Sub-Subtask" : "Create Subtask"}
                </h3>
                <button
                  onClick={() => setShowSubtaskModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateSubtask} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">Title *</label>
                  <input
                    value={newSubtask.title}
                    onChange={(e) => setNewSubtask((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Subtask title"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">Description</label>
                  <textarea
                    value={newSubtask.description}
                    onChange={(e) => setNewSubtask((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description"
                    rows={3}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">Assign To *</label>
                  <select
                    value={newSubtask.assigned_to}
                    onChange={(e) => setNewSubtask((prev) => ({ ...prev, assigned_to: e.target.value }))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select team member</option>
                    {assignableUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSubtaskModal(false)}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingSubtask}
                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {isCreatingSubtask ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    {selectedParentSubtaskId ? "Create Sub-Subtask" : "Create Subtask"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </DashboardLayout>
    </ProtectedRoute>
  );
}
