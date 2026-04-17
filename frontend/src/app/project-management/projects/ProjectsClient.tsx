"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import ProjectShell from "@/components/project-management/ProjectShell";
import { useAuth } from "@/components/AuthProvider";
import { DropdownMenu, type DropdownOption } from "@/components/ui/themed-dropdown";
import {
  Plus, Search, Circle, Loader2, X, CheckCircle2, Clock, AlertCircle,
  Github, ExternalLink, ChevronRight, ChevronDown, ListTree, Link, Save, Copy, Repeat,
  Mic, Square, Play, Pause, Trash2, RotateCcw, SlidersHorizontal,
} from "lucide-react";
import {
  getAllTasks, createTask, updateTaskStatus, updateTaskLinks, updateTask,
  deleteTask, getAssignableUsers, getApiBaseUrl, getTaskChildren, getMyOrganizationSettings,
  searchByPublicId, Task, TaskCreate, User, Workspace, getWorkspaces,
  uploadTaskVoiceNote, TaskVoiceNoteUploadResponse,
  TaskComment, getTaskComments, createTaskComment, deleteTaskComment, createSubtask,
  updateSubtask, updateSubtaskStatus, deleteSubtask,
} from "@/lib/api";
import { getTaskWarningState, type TaskWarningSettings } from "@/lib/taskWarnings";
import { toast } from "sonner";

const priorityColors: Record<string, string> = {
  high: "bg-red-500/10 text-red-500 border border-red-500/30",
  medium: "bg-yellow-500/10 text-yellow-600 border border-yellow-500/30",
  low: "bg-green-500/10 text-green-600 border border-green-500/30",
};
const prioritySelectColors: Record<string, string> = {
  high: "text-red-500",
  medium: "text-yellow-600",
  low: "text-green-600",
};
const statusColors: Record<string, string> = {
  todo: "text-purple-400", in_progress: "text-blue-400",
  submitted: "text-yellow-400", reviewing: "text-amber-400",
  approved: "text-green-400", rejected: "text-red-400",
};

const MAX_VOICE_NOTE_SECONDS = 90;

type ListColumnId =
  | "refId"
  | "task"
  | "workspace"
  | "priority"
  | "status"
  | "reporter"
  | "resolution"
  | "createdDate"
  | "startDate"
  | "updatedDate"
  | "assignee"
  | "dueDate"
  | "actions";

const DEFAULT_VISIBLE_COLUMNS: ListColumnId[] = [
  "refId",
  "task",
  "workspace",
  "priority",
  "status",
  "reporter",
  "createdDate",
  "startDate",
  "updatedDate",
  "assignee",
  "dueDate",
  "actions",
];

const LIST_COLUMN_DEFS: Array<{ id: ListColumnId; label: string; adminOnly?: boolean }> = [
  { id: "refId", label: "Ref ID" },
  { id: "task", label: "Task" },
  { id: "workspace", label: "Workspace" },
  { id: "priority", label: "Priority" },
  { id: "status", label: "Status" },
  { id: "reporter", label: "Reporter" },
  { id: "resolution", label: "Resolution" },
  { id: "createdDate", label: "Created Date" },
  { id: "startDate", label: "Start Date" },
  { id: "updatedDate", label: "Updated Date" },
  { id: "assignee", label: "Assignee" },
  { id: "dueDate", label: "Due Date" },
  { id: "actions", label: "Actions", adminOnly: true },
];

type TaskEditForm = TaskCreate & {
  status?: Task["status"];
  assigned_by?: number;
};

type SubtaskDraftStatus = Task["status"] | "done";

function normalizeStatusFilterValue(value?: string | null): string {
  if (!value) return "";
  if (value === "todo") return "new";
  if (value === "approved") return "completed";
  return value;
}

type SubtaskDetailDraft = {
  title: string;
  description: string;
  status: SubtaskDraftStatus;
  priority: Task["priority"];
  assigned_to: string;
  assigned_by: string;
  start_date: string;
  due_date: string;
  completed_at: string;
  estimated_hours: string;
  actual_hours: string;
};

function assigneeOptionLabel(u: User) {
  const roleLabel = u.role === "admin" ? "Admin" : "Employee";
  return `${u.name} (${roleLabel})`;
}

function toRecurrenceType(value?: string | null): "daily" | "weekly" | "monthly" | undefined {
  if (value === "daily" || value === "weekly" || value === "monthly") return value;
  return undefined;
}

function getProfilePictureUrl(profilePicture?: string | null) {
  if (!profilePicture) return null;
  if (profilePicture.startsWith("data:")) return profilePicture;
  if (profilePicture.startsWith("http")) return profilePicture;
  return `${getApiBaseUrl()}${profilePicture}`;
}

interface ProjectsClientProps {
  workspaceQuery?: string | null;
  statusQuery?: string | null;
  editQuery?: string | null;
  createQuery?: string | null;
  prefillTitleQuery?: string | null;
  prefillDescriptionQuery?: string | null;
  prefillDueDateQuery?: string | null;
  prefillAssignedToQuery?: string | null;
  prefillAssignedByQuery?: string | null;
}

export default function ProjectsPage({
  workspaceQuery,
  statusQuery,
  editQuery,
  createQuery,
  prefillTitleQuery,
  prefillDescriptionQuery,
  prefillDueDateQuery,
  prefillAssignedToQuery,
  prefillAssignedByQuery,
}: ProjectsClientProps) {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin";
  const canManageTasks = isAdmin;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(normalizeStatusFilterValue(statusQuery));
  const [workspaceFilter, setWorkspaceFilter] = useState<number | undefined>(workspaceQuery ? Number(workspaceQuery) : undefined);
  const [projectFilter, setProjectFilter] = useState<string>("__all");
  const [assigneeFilter, setAssigneeFilter] = useState<number | undefined>(undefined);
  const [flaggedFilter, setFlaggedFilter] = useState<boolean | undefined>(undefined);  // Filter for flagged projects
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [taskChildren, setTaskChildren] = useState<Record<number, Task[]>>({});
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);
  const [selectedTaskForSubtask, setSelectedTaskForSubtask] = useState<number | null>(null);
  const [selectedParentSubtaskId, setSelectedParentSubtaskId] = useState<number | null>(null);
  const [isCreatingSubtask, setIsCreatingSubtask] = useState(false);
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<number>>(new Set());
  const [taskWarningSettings, setTaskWarningSettings] = useState<TaskWarningSettings>({
    task_warning_stage_days: 3,
    task_warning_comment_days: 2,
  });
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<Task | null>(null);
  const [editingTaskForm, setEditingTaskForm] = useState<TaskEditForm | null>(null);
  const [selectedSubtaskForPanel, setSelectedSubtaskForPanel] = useState<Task | null>(null);
  const [selectedSubtaskRootTaskForPanel, setSelectedSubtaskRootTaskForPanel] = useState<Task | null>(null);
  const [isDetailSaving, setIsDetailSaving] = useState(false);
  const [subtaskComments, setSubtaskComments] = useState<TaskComment[]>([]);
  const [newSubtaskComment, setNewSubtaskComment] = useState("");
  const [isCommentSaving, setIsCommentSaving] = useState(false);
  const [loadingSubtaskComments, setLoadingSubtaskComments] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [detailDraft, setDetailDraft] = useState<SubtaskDetailDraft>({
    title: "",
    description: "",
    status: "todo" as SubtaskDraftStatus,
    priority: "medium" as Task["priority"],
    assigned_to: "__unassigned",
    assigned_by: "",
    start_date: "",
    due_date: "",
    completed_at: "",
    estimated_hours: "",
    actual_hours: "",
  });
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);
  const [isSearchingById, setIsSearchingById] = useState(false);
  const [resolutionEdits, setResolutionEdits] = useState<Record<number, string>>({});
  const [visibleColumns, setVisibleColumns] = useState<ListColumnId[]>(DEFAULT_VISIBLE_COLUMNS);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showProjectLinks, setShowProjectLinks] = useState(false);
  const [showSubtaskLinks, setShowSubtaskLinks] = useState(false);
  const [showWarningLinks, setShowWarningLinks] = useState(false);
  const [newTask, setNewTask] = useState<TaskCreate>({
    title: "", description: "", priority: "medium", workspace_id: 0,
    assigned_to: undefined, assigned_by: undefined, due_date: undefined, github_link: undefined, deployed_link: undefined,
    is_recurring: false,
    recurrence_type: "weekly",
    recurrence_interval: 1,
    repeat_days: [],
    recurrence_start_date: undefined,
    recurrence_end_date: undefined,
    monthly_day: undefined,
  });
  const [voiceNoteBlob, setVoiceNoteBlob] = useState<Blob | null>(null);
  const [voiceNotePreviewUrl, setVoiceNotePreviewUrl] = useState<string | null>(null);
  const [voiceNoteDurationSec, setVoiceNoteDurationSec] = useState(0);
  const [voiceRecordingSec, setVoiceRecordingSec] = useState(0);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  const [voiceNoteTranscriptPreview, setVoiceNoteTranscriptPreview] = useState<string | null>(null);
  const [uploadedVoicePayload, setUploadedVoicePayload] = useState<TaskVoiceNoteUploadResponse | null>(null);

  const [editVoiceNoteBlob, setEditVoiceNoteBlob] = useState<Blob | null>(null);
  const [editVoiceNotePreviewUrl, setEditVoiceNotePreviewUrl] = useState<string | null>(null);
  const [editVoiceNoteDurationSec, setEditVoiceNoteDurationSec] = useState(0);
  const [editVoiceRecordingSec, setEditVoiceRecordingSec] = useState(0);
  const [isRecordingEditVoice, setIsRecordingEditVoice] = useState(false);
  const [isPlayingEditVoice, setIsPlayingEditVoice] = useState(false);
  const [isUploadingEditVoice, setIsUploadingEditVoice] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<BlobPart[]>([]);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceAutoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);

  const editVoiceRecorderRef = useRef<MediaRecorder | null>(null);
  const editVoiceChunksRef = useRef<BlobPart[]>([]);
  const editVoiceStreamRef = useRef<MediaStream | null>(null);
  const editVoiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const editVoiceAutoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editVoiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const consumedEditTaskIdRef = useRef<number | null>(null);
  const consumedCreatePrefillRef = useRef<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const WEEKDAY_OPTS = [
    { v: 0, l: "Mon" }, { v: 1, l: "Tue" }, { v: 2, l: "Wed" }, { v: 3, l: "Thu" },
    { v: 4, l: "Fri" }, { v: 5, l: "Sat" }, { v: 6, l: "Sun" },
  ];

  const statusFilterOptions: DropdownOption[] = useMemo(() => [
    { value: "__all", label: "All Status", icon: <Circle className="h-3.5 w-3.5 opacity-40" /> },
    { value: "todo", label: "To Do", icon: <span className="text-purple-400">●</span> },
    { value: "in_progress", label: "In Progress", icon: <span className="text-blue-400">●</span> },
    { value: "submitted", label: "Submitted", icon: <span className="text-yellow-400">●</span> },
    { value: "reviewing", label: "Reviewing", icon: <span className="text-amber-400">●</span> },
    { value: "approved", label: "Approved", icon: <span className="text-green-400">●</span> },
    { value: "rejected", label: "Rejected", icon: <span className="text-red-400">●</span> },
    { value: "overdue", label: "Overdue", icon: <AlertCircle className="h-3.5 w-3.5 text-red-400" /> },
    { value: "warning", label: "Warning", icon: <AlertCircle className="h-3.5 w-3.5 text-red-500" /> },
  ], []);

  const workspaceFilterOptions: DropdownOption[] = useMemo(() => [
    { value: "__all", label: "All Workspaces", icon: <span className="text-muted-foreground">📁</span> },
    ...workspaces.map((ws) => ({
      value: String(ws.id),
      label: ws.name,
      icon: <span>{ws.icon || "📁"}</span>,
      description: ws.description || undefined,
    })),
  ], [workspaces]);

  const assigneeFilterOptions: DropdownOption[] = useMemo(() => [
    { value: "__all", label: "All Users", icon: <span className="text-muted-foreground">👤</span> },
    ...employees.map((emp) => ({
      value: String(emp.id),
      label: emp.name,
      description: emp.role,
      avatarSrc: getProfilePictureUrl(emp.profile_picture),
      avatarFallback: emp.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
      icon: <span className="text-primary">{emp.role === "admin" ? "⭐" : "👤"}</span>,
    })),
  ], [employees]);

  const projectFilterOptions: DropdownOption[] = useMemo(() => [
    { value: "__all", label: "All Projects", icon: <span className="text-muted-foreground">🗂️</span> },
    { value: "__subtasks__", label: "Subtasks", icon: <ListTree className="h-3.5 w-3.5 text-primary" /> },
  ], []);

  const projectLinkItems = useMemo(() => {
    return tasks
      .map((task) => ({
        id: task.id,
        title: task.title,
        publicId: task.public_id,
        workspace: task.workspace_name,
      }))
      .sort((left, right) => left.title.localeCompare(right.title));
  }, [tasks]);

  const subtaskLinkItems = useMemo(() => {
    const items: Array<{
      id: number;
      title: string;
      publicId: string | null;
      rootTaskId: number;
      rootTaskTitle: string;
      workspace?: string | null;
    }> = [];

    tasks.forEach((task) => {
      (taskChildren[task.id] || []).forEach((subtask) => {
        items.push({
          id: subtask.id,
          title: subtask.title,
          publicId: subtask.public_id || null,
          rootTaskId: task.id,
          rootTaskTitle: task.title,
          workspace: subtask.workspace_name || task.workspace_name || null,
        });
      });
    });

    return items.sort((left, right) => left.title.localeCompare(right.title));
  }, [tasks, taskChildren]);

  const priorityOptions: DropdownOption[] = [
    { value: "low", label: "Low", icon: <span className="text-green-400">🟢</span> },
    { value: "medium", label: "Medium", icon: <span className="text-amber-400">🟡</span> },
    { value: "high", label: "High", icon: <span className="text-red-400">🔴</span> },
  ];

  const taskAdminStatusOptions: DropdownOption[] = [
    { value: "todo", label: "To Do", icon: <span className="text-purple-400">●</span> },
    { value: "in_progress", label: "In Progress", icon: <span className="text-blue-400">●</span> },
    { value: "submitted", label: "Submitted", icon: <span className="text-yellow-400">●</span> },
    { value: "reviewing", label: "Reviewing", icon: <span className="text-amber-400">●</span> },
    { value: "approved", label: "Approved", icon: <span className="text-green-400">●</span> },
    { value: "rejected", label: "Rejected", icon: <span className="text-red-400">●</span> },
  ];

  const employeeStatusOptions: DropdownOption[] = [
    { value: "todo", label: "To Do", icon: <span className="text-purple-400">●</span> },
    { value: "in_progress", label: "In Progress", icon: <span className="text-blue-400">●</span> },
    { value: "submitted", label: "Submitted", icon: <span className="text-yellow-400">●</span> },
    { value: "reviewing", label: "Reviewing", icon: <span className="text-amber-400">●</span> },
    { value: "approved", label: "Approved", icon: <span className="text-green-400">●</span> },
    { value: "rejected", label: "Rejected", icon: <span className="text-red-400">●</span> },
  ];

  const canEditTaskStatus = (task: Task) => {
    return user?.role === "employee" && task.assigned_to === user?.id;
  };

  const getStatusDisplayLabel = (status: Task["status"]) => {
    if (status === "todo") return "To Do";
    if (status === "in_progress") return "In Progress";
    if (status === "submitted") return "Submitted";
    if (status === "reviewing") return "Reviewing";
    if (status === "approved") return "Approved";
    if (status === "rejected") return "Rejected";
    return status;
  };

  const employeeOptions: DropdownOption[] = useMemo(() => employees.map((emp) => ({
    value: String(emp.id),
    label: assigneeOptionLabel(emp),
    avatarSrc: getProfilePictureUrl(emp.profile_picture),
    avatarFallback: emp.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    icon: <span className="text-primary">{emp.role === "admin" ? "⭐" : "👤"}</span>,
  })), [employees]);

  const workspaceSelectOptions: DropdownOption[] = useMemo(() => workspaces.map((ws) => ({
    value: String(ws.id),
    label: ws.name,
    icon: <span>{ws.icon || "📁"}</span>,
  })), [workspaces]);

  const recurringFrequencyOptions: DropdownOption[] = [
    { value: "daily", label: "Daily", icon: <span>🗓️</span> },
    { value: "weekly", label: "Weekly", icon: <span>📅</span> },
    { value: "monthly", label: "Monthly", icon: <span>🗓️</span> },
  ];

  const toggleRepeatDay = (d: number) => {
    const cur = new Set(newTask.repeat_days || []);
    if (cur.has(d)) cur.delete(d);
    else cur.add(d);
    setNewTask({ ...newTask, repeat_days: Array.from(cur).sort((a, b) => a - b) });
  };

  const formatVoiceTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const releaseVoiceRecorderResources = () => {
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    if (voiceAutoStopRef.current) {
      clearTimeout(voiceAutoStopRef.current);
      voiceAutoStopRef.current = null;
    }
    if (voiceStreamRef.current) {
      voiceStreamRef.current.getTracks().forEach((track) => track.stop());
      voiceStreamRef.current = null;
    }
    voiceRecorderRef.current = null;
    voiceChunksRef.current = [];
    setIsRecordingVoice(false);
    setVoiceRecordingSec(0);
  };

  const resetVoiceNote = () => {
    if (voiceNotePreviewUrl) {
      URL.revokeObjectURL(voiceNotePreviewUrl);
    }
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current.currentTime = 0;
    }
    setIsPlayingVoice(false);
    setVoiceNoteBlob(null);
    setVoiceNotePreviewUrl(null);
    setVoiceNoteDurationSec(0);
    setVoiceNoteTranscriptPreview(null);
    setUploadedVoicePayload(null);
  };

  const stopVoiceRecording = () => {
    const recorder = voiceRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.stop();
  };

  const startVoiceRecording = async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Voice recording is not supported in this browser.");
      return;
    }

    try {
      resetVoiceNote();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : undefined;
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      voiceStreamRef.current = stream;
      voiceRecorderRef.current = recorder;
      voiceChunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          voiceChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(voiceChunksRef.current, { type: mimeType });
        if (!blob.size) {
          toast.error("No audio captured. Please try again.");
          releaseVoiceRecorderResources();
          return;
        }

        const previewUrl = URL.createObjectURL(blob);
        setVoiceNoteBlob(blob);
        setVoiceNotePreviewUrl(previewUrl);

        const probe = document.createElement("audio");
        probe.src = previewUrl;
        probe.onloadedmetadata = () => {
          const duration = Number.isFinite(probe.duration) ? Math.round(probe.duration) : 0;
          setVoiceNoteDurationSec(duration);
        };

        releaseVoiceRecorderResources();
      };

      recorder.start(250);
      setIsRecordingVoice(true);
      setVoiceRecordingSec(0);
      toast.success("Recording started");

      voiceTimerRef.current = setInterval(() => {
        setVoiceRecordingSec((current) => {
          if (current + 1 >= MAX_VOICE_NOTE_SECONDS) {
            stopVoiceRecording();
          }
          return Math.min(current + 1, MAX_VOICE_NOTE_SECONDS);
        });
      }, 1000);

      voiceAutoStopRef.current = setTimeout(() => {
        stopVoiceRecording();
      }, MAX_VOICE_NOTE_SECONDS * 1000);
    } catch {
      toast.error("Microphone access denied or unavailable.");
      releaseVoiceRecorderResources();
    }
  };

  const handleVoicePlayPause = () => {
    if (!voiceNotePreviewUrl) return;
    if (!voiceAudioRef.current) {
      voiceAudioRef.current = new Audio(voiceNotePreviewUrl);
      voiceAudioRef.current.onended = () => setIsPlayingVoice(false);
      voiceAudioRef.current.onpause = () => setIsPlayingVoice(false);
      voiceAudioRef.current.onplay = () => setIsPlayingVoice(true);
    }
    if (isPlayingVoice) {
      voiceAudioRef.current.pause();
      return;
    }
    // UX: always replay from the beginning when Play is pressed.
    voiceAudioRef.current.currentTime = 0;
    void voiceAudioRef.current.play();
  };

  const closeCreateModal = () => {
    if (isRecordingVoice) stopVoiceRecording();
    releaseVoiceRecorderResources();
    resetVoiceNote();
    setShowCreateModal(false);
  };

  const releaseEditVoiceRecorderResources = () => {
    if (editVoiceTimerRef.current) {
      clearInterval(editVoiceTimerRef.current);
      editVoiceTimerRef.current = null;
    }
    if (editVoiceAutoStopRef.current) {
      clearTimeout(editVoiceAutoStopRef.current);
      editVoiceAutoStopRef.current = null;
    }
    if (editVoiceStreamRef.current) {
      editVoiceStreamRef.current.getTracks().forEach((track) => track.stop());
      editVoiceStreamRef.current = null;
    }
    editVoiceRecorderRef.current = null;
    editVoiceChunksRef.current = [];
    setIsRecordingEditVoice(false);
    setEditVoiceRecordingSec(0);
  };

  const resetEditVoiceNote = () => {
    if (editVoiceNotePreviewUrl) {
      URL.revokeObjectURL(editVoiceNotePreviewUrl);
    }
    if (editVoiceAudioRef.current) {
      editVoiceAudioRef.current.pause();
      editVoiceAudioRef.current.currentTime = 0;
      editVoiceAudioRef.current = null;
    }
    setIsPlayingEditVoice(false);
    setEditVoiceNoteBlob(null);
    setEditVoiceNotePreviewUrl(null);
    setEditVoiceNoteDurationSec(0);
  };

  const stopEditVoiceRecording = () => {
    const recorder = editVoiceRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.stop();
  };

  const startEditVoiceRecording = async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Voice recording is not supported in this browser.");
      return;
    }

    try {
      resetEditVoiceNote();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : undefined;
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      editVoiceStreamRef.current = stream;
      editVoiceRecorderRef.current = recorder;
      editVoiceChunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          editVoiceChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(editVoiceChunksRef.current, { type: mimeType });
        if (!blob.size) {
          toast.error("No audio captured. Please try again.");
          releaseEditVoiceRecorderResources();
          return;
        }

        const previewUrl = URL.createObjectURL(blob);
        setEditVoiceNoteBlob(blob);
        setEditVoiceNotePreviewUrl(previewUrl);

        const probe = document.createElement("audio");
        probe.src = previewUrl;
        probe.onloadedmetadata = () => {
          const duration = Number.isFinite(probe.duration) ? Math.round(probe.duration) : 0;
          setEditVoiceNoteDurationSec(duration);
        };

        releaseEditVoiceRecorderResources();
      };

      recorder.start(250);
      setIsRecordingEditVoice(true);
      setEditVoiceRecordingSec(0);
      toast.success("Recording started");

      editVoiceTimerRef.current = setInterval(() => {
        setEditVoiceRecordingSec((current) => {
          if (current + 1 >= MAX_VOICE_NOTE_SECONDS) {
            stopEditVoiceRecording();
          }
          return Math.min(current + 1, MAX_VOICE_NOTE_SECONDS);
        });
      }, 1000);

      editVoiceAutoStopRef.current = setTimeout(() => {
        stopEditVoiceRecording();
      }, MAX_VOICE_NOTE_SECONDS * 1000);
    } catch {
      toast.error("Microphone access denied or unavailable.");
      releaseEditVoiceRecorderResources();
    }
  };

  const handleEditVoicePlayPause = () => {
    if (!editVoiceNotePreviewUrl) return;
    if (!editVoiceAudioRef.current) {
      editVoiceAudioRef.current = new Audio(editVoiceNotePreviewUrl);
      editVoiceAudioRef.current.onended = () => setIsPlayingEditVoice(false);
      editVoiceAudioRef.current.onpause = () => setIsPlayingEditVoice(false);
      editVoiceAudioRef.current.onplay = () => setIsPlayingEditVoice(true);
    }
    if (isPlayingEditVoice) {
      editVoiceAudioRef.current.pause();
      return;
    }
    editVoiceAudioRef.current.currentTime = 0;
    void editVoiceAudioRef.current.play();
  };

  const getEditVoiceFileForUpload = () => {
    if (!editVoiceNoteBlob) return null;
    const extension = editVoiceNoteBlob.type.includes("mpeg") || editVoiceNoteBlob.type.includes("mp3") ? "mp3" : "webm";
    return new File([editVoiceNoteBlob], `task-voice-note-${Date.now()}.${extension}`, {
      type: editVoiceNoteBlob.type || "audio/webm",
    });
  };

  const getVoiceFileForUpload = () => {
    if (!voiceNoteBlob) return null;
    const extension = voiceNoteBlob.type.includes("mpeg") || voiceNoteBlob.type.includes("mp3") ? "mp3" : "webm";
    return new File([voiceNoteBlob], `task-voice-note-${Date.now()}.${extension}`, {
      type: voiceNoteBlob.type || "audio/webm",
    });
  };

  useEffect(() => {
    return () => {
      releaseVoiceRecorderResources();
      if (voiceNotePreviewUrl) URL.revokeObjectURL(voiceNotePreviewUrl);
      if (voiceAudioRef.current) {
        voiceAudioRef.current.pause();
      }
    };
  }, [voiceNotePreviewUrl]);

  const [newSubtask, setNewSubtask] = useState<Partial<TaskCreate>>({
    title: "", description: "", assigned_to: undefined, assigned_by: user?.id, due_date: undefined, priority: "medium",
  });

  const columnPreferenceKey = useMemo(
    () => `wfp-project-list-columns-${user?.id || "anon"}`,
    [user?.id]
  );

  const visibleColumnCount = useMemo(() => {
    return LIST_COLUMN_DEFS.filter((column) => {
      if (column.adminOnly && !isAdmin) return false;
      return visibleColumns.includes(column.id);
    }).length;
  }, [isAdmin, visibleColumns]);

  const isColumnVisible = useCallback(
    (columnId: ListColumnId) => visibleColumns.includes(columnId),
    [visibleColumns]
  );

  const sameLocalDay = (isoDate: string) => {
    const left = new Date(isoDate);
    const right = new Date();
    return left.getFullYear() === right.getFullYear()
      && left.getMonth() === right.getMonth()
      && left.getDate() === right.getDate();
  };

  const toggleVisibleColumn = (columnId: ListColumnId) => {
    setVisibleColumns((prev) => {
      if (prev.includes(columnId)) {
        if (visibleColumnCount <= 1) {
          toast.error("Keep at least one column visible");
          return prev;
        }
        return prev.filter((id) => id !== columnId);
      }
      return [...prev, columnId];
    });
  };

  // Auto-redirect on 6-char Ref ID
  useEffect(() => {
    const trimmed = searchQuery.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(trimmed)) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearchingById(true);
      try {
        const result = await searchByPublicId(trimmed);
        if (cancelled) return;
        if (result.data) router.push(`/project-management/${result.data.task_id}`);
        else toast.error(`No project found with Ref ID "${trimmed}"`);
      } catch { if (!cancelled) toast.error("Search failed"); }
      finally { if (!cancelled) setIsSearchingById(false); }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQuery, router]);

  // Track which task rows are currently loading their subtasks
  const [loadingSubtasksFor, setLoadingSubtasksFor] = useState<Set<number>>(new Set());

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    const apiStatusFilter = statusFilter === "overdue" || statusFilter === "warning"
      ? undefined
      : statusFilter === "new" || statusFilter === "todo"
        ? "todo"
        : statusFilter === "completed"
          ? "approved"
          : (statusFilter || undefined);
    const [tasksResult, empResult, workspaceResult, settingsResult] = await Promise.all([
      getAllTasks(apiStatusFilter, assigneeFilter, workspaceFilter, { rootsOnly: true }),
      getAssignableUsers(),
      getWorkspaces(),
      getMyOrganizationSettings(),
    ]);
    let tasksToPrime: Task[] = tasksResult.data || [];

    if (settingsResult.data) {
      setTaskWarningSettings({
        task_warning_stage_days: settingsResult.data.task_warning_stage_days || 3,
        task_warning_comment_days: settingsResult.data.task_warning_comment_days || 2,
      });
    }

    const workspaceFilterInvalid = Boolean(
      workspaceFilter &&
      workspaceResult.data &&
      !workspaceResult.data.some((ws) => ws.id === workspaceFilter)
    );

    if (workspaceFilterInvalid) {
      const fallbackTasks = await getAllTasks(apiStatusFilter, assigneeFilter, undefined, { rootsOnly: true });
      if (fallbackTasks.data) {
        setTasks(fallbackTasks.data);
        tasksToPrime = fallbackTasks.data;
      } else {
        tasksToPrime = [];
      }
      setWorkspaceFilter(undefined);
      if (workspaceQuery) {
        router.replace("/project-management/projects");
      }
      toast.error("Selected workspace no longer exists. Showing all projects.");
    } else if (tasksResult.data) {
      setTasks(tasksResult.data);
    }

    if (empResult.data) setEmployees(empResult.data);
    if (workspaceResult.data) setWorkspaces(workspaceResult.data);
    if (!silent) setIsLoading(false);
    // Pre-fetch subtasks for every task so they're ready on expand (and the count badge shows)
    if (tasksToPrime.length > 0) {
      tasksToPrime.forEach(task => loadSubtasksQuietly(task.id));
    }
  // loadSubtasksQuietly is stable (defined below with useCallback + no deps)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assigneeFilter, router, statusFilter, workspaceFilter, workspaceQuery]);

  useEffect(() => {
    setStatusFilter(normalizeStatusFilterValue(statusQuery));
  }, [statusQuery]);

  useEffect(() => {
    if (projectFilter === "__all" || projectFilter === "__subtasks__") return;
    const parsedProjectFilter = Number(projectFilter);
    if (Number.isNaN(parsedProjectFilter) || !tasks.some((task) => task.id === parsedProjectFilter)) {
      setProjectFilter("__all");
    }
  }, [projectFilter, tasks]);

  useEffect(() => {
    if (!workspaceQuery) return;
    const parsed = Number(workspaceQuery);
    if (!Number.isNaN(parsed) && parsed > 0) {
      setWorkspaceFilter(parsed);
      setNewTask((prev) => ({ ...prev, workspace_id: parsed }));
    }
  }, [workspaceQuery]);

  useEffect(() => { loadData(); }, [loadData]);

  // Keep a stable ref to expandedTasks so the event listener always sees the latest value
  const expandedTasksRef = React.useRef(expandedTasks);
  useEffect(() => { expandedTasksRef.current = expandedTasks; }, [expandedTasks]);

  const fetchAllDescendants = useCallback(async (parentId: number): Promise<Task[]> => {
    const result = await getTaskChildren(parentId);
    if (!result.data || result.data.length === 0) {
      return [];
    }

    const directChildren = result.data;
    const descendantGroups = await Promise.all(
      directChildren.map((child) => fetchAllDescendants(child.id))
    );

    return [...directChildren, ...descendantGroups.flat()];
  }, []);

  // Silent background fetch — no spinner, just updates state
  const loadSubtasksQuietly = useCallback(async (taskId: number) => {
    const descendants = await fetchAllDescendants(taskId);
    setTaskChildren(prev => ({ ...prev, [taskId]: descendants }));
  }, [fetchAllDescendants]);

  // Visible fetch — shows spinner inside the expansion panel
  const loadSubtasks = useCallback(async (taskId: number) => {
    setLoadingSubtasksFor((prev) => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });
    const descendants = await fetchAllDescendants(taskId);
    setTaskChildren(prev => ({ ...prev, [taskId]: descendants }));
    setLoadingSubtasksFor(prev => { const next = new Set(prev); next.delete(taskId); return next; });
  }, [fetchAllDescendants]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wfp-project-resolution-edits");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, string>;
      const normalized: Record<number, string> = {};
      Object.entries(parsed).forEach(([k, v]) => {
        const id = Number(k);
        if (!Number.isNaN(id) && typeof v === "string") normalized[id] = v;
      });
      setResolutionEdits(normalized);
    } catch {
      // Ignore malformed local storage data.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("wfp-project-resolution-edits", JSON.stringify(resolutionEdits));
    } catch {
      // Ignore browser storage write failures.
    }
  }, [resolutionEdits]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(columnPreferenceKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const allowed = new Set(
        LIST_COLUMN_DEFS
          .filter((column) => (column.adminOnly ? isAdmin : true))
          .map((column) => column.id)
      );
      const normalized = parsed.filter((id): id is ListColumnId => allowed.has(id));
      if (normalized.length > 0) {
        setVisibleColumns(normalized);
      }
    } catch {
      // Ignore malformed local storage data.
    }
  }, [columnPreferenceKey, isAdmin]);

  useEffect(() => {
    try {
      const filtered = visibleColumns.filter((columnId) => {
        const definition = LIST_COLUMN_DEFS.find((column) => column.id === columnId);
        if (!definition) return false;
        return definition.adminOnly ? isAdmin : true;
      });
      localStorage.setItem(columnPreferenceKey, JSON.stringify(filtered));
    } catch {
      // Ignore browser storage write failures.
    }
  }, [columnPreferenceKey, isAdmin, visibleColumns]);

  useEffect(() => {
    const handleRefresh = async () => {
      // Silent reload — keeps the table visible so expandedTasks state stays intact
      await loadData(true);
      // Reload subtasks for every currently expanded task (no spinner — already visible)
      expandedTasksRef.current.forEach((taskId) => loadSubtasksQuietly(taskId));
    };
    window.addEventListener("refresh-tasks", handleRefresh);
    return () => window.removeEventListener("refresh-tasks", handleRefresh);
  }, [loadData, loadSubtasksQuietly]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) { toast.error("Task title is required"); return; }
    if (!newTask.workspace_id) { toast.error("Workspace is required"); return; }
    const resolvedAssignee = newTask.assigned_to || (!isAdmin ? user?.id : undefined);
    if (!resolvedAssignee) { toast.error("Assignee is required"); return; }
    if (!newTask.due_date) { toast.error("Due date is required"); return; }
    const reporterId = newTask.assigned_by || user?.id;
    if (!reporterId) { toast.error("Reporter is required"); return; }
    setIsCreating(true);

    let voicePayload: Pick<TaskCreate, "voice_note_url" | "voice_note_transcript"> = uploadedVoicePayload
      ? {
          voice_note_url: uploadedVoicePayload.voice_note_url,
          voice_note_transcript: uploadedVoicePayload.voice_note_transcript ?? undefined,
        }
      : {};
    if (voiceNoteBlob && !uploadedVoicePayload) {
      setIsUploadingVoice(true);
      const voiceFile = getVoiceFileForUpload();
      if (!voiceFile) {
        setIsUploadingVoice(false);
        setIsCreating(false);
        toast.error("Voice note is unavailable. Please re-record.");
        return;
      }
      const uploadResult = await uploadTaskVoiceNote(voiceFile);
      setIsUploadingVoice(false);

      if (uploadResult.error || !uploadResult.data?.voice_note_url) {
        toast.error(uploadResult.error || "Failed to upload voice note");
        setIsCreating(false);
        return;
      }

      voicePayload = {
        voice_note_url: uploadResult.data.voice_note_url,
        voice_note_transcript: uploadResult.data.voice_note_transcript ?? undefined,
      };
      setUploadedVoicePayload(uploadResult.data);
      setVoiceNoteTranscriptPreview(uploadResult.data.voice_note_transcript || null);
    }

    const result = await createTask({ ...newTask, assigned_to: resolvedAssignee, assigned_by: reporterId, ...voicePayload });
    if (result.error) toast.error(result.error);
    else {
      toast.success("Project created!");
      closeCreateModal();
      setNewTask({
        title: "", description: "", priority: "medium", workspace_id: workspaceFilter || 0,
        assigned_to: !isAdmin ? user?.id : undefined, assigned_by: user?.id, due_date: undefined, github_link: undefined, deployed_link: undefined,
        is_recurring: false, recurrence_type: "weekly", recurrence_interval: 1, repeat_days: [],
        recurrence_start_date: undefined, recurrence_end_date: undefined, monthly_day: undefined,
      });
      loadData();
    }
    setIsCreating(false);
  };

  const handlePriorityChange = async (taskId: number, priority: "low" | "medium" | "high") => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, priority } : t));
    const result = taskId < 0
      ? await updateSubtask(Math.abs(taskId), { priority })
      : await updateTask(taskId, { priority });
    if (result.error) { toast.error(result.error); loadData(); }
    else toast.success("Priority updated!");
  };

  const handleStatusChange = async (taskId: number, selectedStatus: string) => {
    const targetTask =
      tasks.find((task) => task.id === taskId) ||
      Object.values(taskChildren).flat().find((subtask) => subtask.id === taskId);
    if (!targetTask || !canEditTaskStatus(targetTask)) {
      toast.error("Only the assigned employee can change status.");
      return;
    }

    const isLegacySubtaskRow = taskId < 0;
    const backendStatus = selectedStatus;
    const previousTask = tasks.find((task) => task.id === taskId);

    // Optimistic UI update to avoid page-level loading flicker.
    setTasks((prev) => prev.map((task) => (
      task.id === taskId ? { ...task, status: backendStatus as Task["status"] } : task
    )));
    if (isLegacySubtaskRow) {
      setTaskChildren((prev) => {
        const next: Record<number, Task[]> = {};
        Object.entries(prev).forEach(([rootTaskId, subtasks]) => {
          next[Number(rootTaskId)] = subtasks.map((subtask) => (
            subtask.id === taskId ? { ...subtask, status: backendStatus as Task["status"] } : subtask
          ));
        });
        return next;
      });
    }

    const result = isLegacySubtaskRow
      ? await updateSubtaskStatus(Math.abs(taskId), backendStatus)
      : await updateTaskStatus(taskId, backendStatus as any);
    if (result.error) {
      toast.error(result.error);
      // Revert only the changed row and sync quietly.
      if (previousTask) {
        setTasks((prev) => prev.map((task) => (
          task.id === taskId ? { ...task, status: previousTask.status } : task
        )));
      }
      void loadData(true);
      return;
    }

    toast.success("Status updated!");
    // Quiet refresh keeps the current screen stable while syncing server state.
    void loadData(true);
  };

  const handleAssigneeChange = async (taskId: number, userId?: number) => {
    const result = taskId < 0
      ? await updateSubtask(Math.abs(taskId), { assigned_to: userId })
      : await updateTask(taskId, { assigned_to: userId });
    if (result.error) toast.error(result.error);
    else { toast.success("Assignee updated!"); loadData(); }
  };

  const handleReporterChange = async (taskId: number, userId: number) => {
    const result = taskId < 0
      ? await updateSubtask(Math.abs(taskId), { assigned_by: userId })
      : await updateTask(taskId, { assigned_by: userId });
    if (result.error) toast.error(result.error);
    else { toast.success("Reporter updated!"); loadData(); }
  };

  const handleSubtaskDateChange = async (
    taskId: number,
    field: "start_date" | "due_date",
    value: string
  ) => {
    if (taskId < 0 && field === "start_date") {
      toast.info("Start date is only available for main tasks.");
      return;
    }

    const payload = { [field]: value || undefined } as Pick<TaskCreate, "start_date" | "due_date">;
    const result = taskId < 0
      ? await updateSubtask(Math.abs(taskId), { due_date: value || undefined })
      : await updateTask(taskId, payload);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(field === "due_date" ? "Due date updated!" : "Start date updated!");
    await loadData(true);
    expandedTasksRef.current.forEach((expandedTaskId) => {
      loadSubtasksQuietly(expandedTaskId);
    });
  };

  const parseRepeatDays = (value?: string | null): number[] => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((day) => typeof day === "number") : [];
    } catch {
      return [];
    }
  };

  const handleOpenEditTask = (task: Task) => {
    resetEditVoiceNote();
    releaseEditVoiceRecorderResources();
    setSelectedTaskForEdit(task);
    setEditingTaskForm({
      title: task.title,
      description: task.description || "",
      voice_note_url: task.voice_note_url || undefined,
      voice_note_transcript: task.voice_note_transcript || undefined,
      priority: task.priority,
      workspace_id: task.workspace_id || workspaceFilter || 0,
      assigned_to: task.assigned_to ?? undefined,
      due_date: task.due_date || undefined,
      github_link: task.github_link || undefined,
      deployed_link: task.deployed_link || undefined,
      is_recurring: task.is_recurring,
      recurrence_type: toRecurrenceType(task.recurrence_type),
      recurrence_interval: task.recurrence_interval || 1,
      repeat_days: parseRepeatDays(task.repeat_days),
      recurrence_start_date: task.recurrence_start_date || undefined,
      recurrence_end_date: task.recurrence_end_date || undefined,
      monthly_day: task.monthly_day || undefined,
      status: task.status,
      assigned_by: task.assigned_by,
    });
    setShowEditTaskModal(true);
  };

  useEffect(() => {
    if (!editQuery) {
      consumedEditTaskIdRef.current = null;
      return;
    }

    const editTaskId = Number(editQuery);
    if (Number.isNaN(editTaskId) || editTaskId <= 0) return;
    if (consumedEditTaskIdRef.current === editTaskId) return;

    const taskToEdit = tasks.find((task) => task.id === editTaskId);
    if (!taskToEdit) return;

    consumedEditTaskIdRef.current = editTaskId;

    if (canManageTasks) {
      handleOpenEditTask(taskToEdit);
    } else {
      toast.error("You are not allowed to edit this task");
    }

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.delete("edit");
      const query = params.toString();
      router.replace(query ? `/project-management/projects?${query}` : "/project-management/projects");
    }
  }, [canManageTasks, editQuery, router, tasks]);

  useEffect(() => {
    if (!createQuery) {
      consumedCreatePrefillRef.current = null;
      return;
    }

    const normalizedCreate = String(createQuery).toLowerCase();
    if (normalizedCreate !== "1" && normalizedCreate !== "true") return;

    const prefillKey = [
      createQuery,
      prefillTitleQuery,
      prefillDescriptionQuery,
      prefillDueDateQuery,
      prefillAssignedToQuery,
      prefillAssignedByQuery,
      workspaceQuery,
      String(workspaces.length),
    ].join("|");

    if (consumedCreatePrefillRef.current === prefillKey) return;
    consumedCreatePrefillRef.current = prefillKey;

    const title = (prefillTitleQuery || "").trim();
    const description = (prefillDescriptionQuery || "").trim();
    const dueDate = (prefillDueDateQuery || "").trim();
    const parsedAssignee = Number(prefillAssignedToQuery || "");
    const parsedReporter = Number(prefillAssignedByQuery || "");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const fallbackDueDate = tomorrow.toISOString().slice(0, 10);

    const queryWorkspaceId = Number(workspaceQuery || "");
    const happySheetPreferredWorkspaces = [
      "personal goals",
      "self improvement",
      "employee development",
    ];
    const preferredWorkspace = workspaces.find((workspace) =>
      happySheetPreferredWorkspaces.includes((workspace.name || "").trim().toLowerCase())
    );

    const fallbackWorkspaceId =
      preferredWorkspace?.id ||
      workspaceFilter ||
      (Number.isFinite(queryWorkspaceId) && queryWorkspaceId > 0 ? queryWorkspaceId : 0) ||
      workspaces[0]?.id ||
      0;

    setNewTask((prev) => ({
      ...prev,
      title: title || prev.title,
      description: description || prev.description,
      due_date: dueDate || prev.due_date || fallbackDueDate,
      workspace_id: fallbackWorkspaceId || prev.workspace_id,
      assigned_to:
        Number.isFinite(parsedAssignee) && parsedAssignee > 0
          ? parsedAssignee
          : prev.assigned_to || (!isAdmin ? user?.id : undefined),
      assigned_by:
        Number.isFinite(parsedReporter) && parsedReporter > 0
          ? parsedReporter
          : prev.assigned_by || user?.id,
    }));
    setShowCreateModal(true);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      [
        "create",
        "prefillTitle",
        "prefillDescription",
        "prefillDueDate",
        "prefillAssignedTo",
        "prefillAssignedBy",
      ].forEach((key) => params.delete(key));
      const query = params.toString();
      router.replace(query ? `/project-management/projects?${query}` : "/project-management/projects");
    }
  }, [
    createQuery,
    isAdmin,
    prefillAssignedByQuery,
    prefillAssignedToQuery,
    prefillDescriptionQuery,
    prefillDueDateQuery,
    prefillTitleQuery,
    router,
    user?.id,
    workspaceFilter,
    workspaceQuery,
    workspaces,
  ]);

  const handleWorkspaceChange = async (taskId: number, nextWorkspaceId: number) => {
    const result = await updateTask(taskId, { workspace_id: nextWorkspaceId });
    if (result.error) toast.error(result.error);
    else { toast.success("Project moved to workspace"); loadData(true); }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("Delete this project?")) return;
    const result = taskId < 0
      ? await deleteSubtask(Math.abs(taskId))
      : await deleteTask(taskId);
    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (selectedSubtaskForPanel?.id === taskId) {
      setSelectedSubtaskForPanel(null);
      setSelectedSubtaskRootTaskForPanel(null);
      setSubtaskComments([]);
      setNewSubtaskComment("");
    }

    toast.success("Project deleted!");
    loadData();
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForEdit) return;
    if (!editingTaskForm) return;
    setIsUpdatingTask(true);

    let editVoicePayload: Pick<TaskCreate, "voice_note_url" | "voice_note_transcript"> = {};
    if (!editingTaskForm.voice_note_url && editVoiceNoteBlob) {
      const voiceFile = getEditVoiceFileForUpload();
      if (!voiceFile) {
        toast.error("Failed to prepare voice note upload");
        setIsUpdatingTask(false);
        return;
      }

      setIsUploadingEditVoice(true);
      const uploadResult = await uploadTaskVoiceNote(voiceFile);
      setIsUploadingEditVoice(false);

      if (uploadResult.error || !uploadResult.data?.voice_note_url) {
        toast.error(uploadResult.error || "Failed to upload voice note");
        setIsUpdatingTask(false);
        return;
      }

      editVoicePayload = {
        voice_note_url: uploadResult.data.voice_note_url,
        voice_note_transcript: uploadResult.data.voice_note_transcript ?? undefined,
      };
    }

    const result = await updateTask(selectedTaskForEdit.id, {
      ...editingTaskForm,
      ...editVoicePayload,
      title: editingTaskForm.title.trim(),
      description: editingTaskForm.description || undefined,
      workspace_id: editingTaskForm.workspace_id,
      assigned_to: editingTaskForm.assigned_to ?? undefined,
      assigned_by: editingTaskForm.assigned_by,
      due_date: editingTaskForm.due_date || undefined,
      github_link: editingTaskForm.github_link || undefined,
      deployed_link: editingTaskForm.deployed_link || undefined,
      recurrence_type: editingTaskForm.recurrence_type || undefined,
      recurrence_interval: editingTaskForm.recurrence_interval || undefined,
      repeat_days: editingTaskForm.repeat_days || undefined,
      recurrence_start_date: editingTaskForm.recurrence_start_date || undefined,
      recurrence_end_date: editingTaskForm.recurrence_end_date || undefined,
      monthly_day: editingTaskForm.monthly_day || undefined,
    });
    if (result.error) toast.error(result.error);
    else {
      toast.success("Task updated!");
      resetEditVoiceNote();
      releaseEditVoiceRecorderResources();
      setShowEditTaskModal(false);
      setSelectedTaskForEdit(null);
      setEditingTaskForm(null);
      loadData();
    }
    setIsUpdatingTask(false);
  };

  const toggleExpandTask = async (taskId: number) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
      await loadSubtasks(taskId); // Always reload — ensures newly created subtasks are shown
    }
    setExpandedTasks(newExpanded);
  };

  const handleCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.title?.trim()) { toast.error("Subtask title is required"); return; }
    const taskId = selectedTaskForSubtask;
    if (!taskId) { toast.error("No task selected"); return; }

    setIsCreatingSubtask(true);
    const assigneeValue = newSubtask.assigned_to;
    const parsedAssignee =
      typeof assigneeValue === "number"
        ? assigneeValue
        : undefined;
    const reporterValue = newSubtask.assigned_by;
    const parsedReporter = typeof reporterValue === "number" ? reporterValue : undefined;
    const parsedDueDate = typeof newSubtask.due_date === "string" ? newSubtask.due_date : undefined;

    if (!Number.isFinite(parsedAssignee as number)) {
      toast.error("Please assign this subtask to an employee");
      setIsCreatingSubtask(false);
      return;
    }

    if (!Number.isFinite(parsedReporter as number)) {
      toast.error("Please select a reporter for this subtask");
      setIsCreatingSubtask(false);
      return;
    }

    if (!parsedDueDate) {
      toast.error("Due date is required for subtask creation");
      setIsCreatingSubtask(false);
      return;
    }

    const result = await createSubtask(taskId, {
      title: newSubtask.title,
      description: newSubtask.description || "",
      assigned_to: parsedAssignee as number,
      assigned_by: parsedReporter as number,
      due_date: parsedDueDate,
      parent_subtask_id: selectedParentSubtaskId ?? undefined,
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(selectedParentSubtaskId ? "Sub-subtask created" : "Subtask created");
      setExpandedTasks((prev) => {
        const next = new Set(prev);
        next.add(taskId);
        return next;
      });
      setShowSubtaskModal(false);
      setNewSubtask({ title: "", description: "", assigned_to: undefined, assigned_by: user?.id, due_date: undefined, priority: "medium" });
      setSelectedTaskForSubtask(null);
      setSelectedParentSubtaskId(null);
      await loadSubtasks(taskId);
    }
    setIsCreatingSubtask(false);
  };

  type HierarchyTaskNode = Task & { children: HierarchyTaskNode[] };

  const openSubtaskModal = (taskId: number, parentSubtaskId: number | null = null) => {
    setSelectedTaskForSubtask(taskId);
    setSelectedParentSubtaskId(parentSubtaskId);
    setNewSubtask({
      title: "",
      description: "",
      assigned_to: undefined,
      assigned_by: user?.id,
      due_date: undefined,
      priority: "medium",
    });
    setShowSubtaskModal(true);
  };

  const buildSubtaskTree = (children: Task[]): HierarchyTaskNode[] => {
    const nodeMap = new Map<number, HierarchyTaskNode>();
    children.forEach((child) => {
      nodeMap.set(child.id, { ...child, children: [] });
    });

    const roots: HierarchyTaskNode[] = [];
    children.forEach((child) => {
      const node = nodeMap.get(child.id)!;
      if (child.parent_task_id && nodeMap.has(child.parent_task_id)) {
        nodeMap.get(child.parent_task_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

    const getTaskLatestActivityAt = (task: Task) => {
      const subtasks = taskChildren[task.id] || [];
      const latestSubtaskTs = subtasks.reduce<number>(
        (latest, subtask) => {
          const ts = Date.parse(subtask.updated_at || subtask.created_at || "");
          return Number.isNaN(ts) ? latest : Math.max(latest, ts);
        },
        0
      );
      const taskTs = Date.parse(task.updated_at || task.start_date || "");
      const effectiveTs = Math.max(Number.isNaN(taskTs) ? 0 : taskTs, latestSubtaskTs);
      return effectiveTs ? new Date(effectiveTs).toISOString() : null;
    };

  const renderSubtaskRows = (nodes: HierarchyTaskNode[], rootTask: Task, depth = 0): React.ReactNode[] => {
    return nodes.flatMap((subtask) => {
      const hasChildren = subtask.children.length > 0;
      const isExpanded = expandedSubtasks.has(subtask.id);
      const warningState = getTaskWarningState(subtask, taskWarningSettings);
      const row = (
        <tr
          key={subtask.id}
          className="cursor-pointer transition-all duration-200 hover:bg-secondary/40 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.26)] hover:scale-[1.002] active:scale-[0.998]"
          onClick={() => openSubtaskPanel(subtask, rootTask)}
        >
          <td className="py-3.5 pl-4">
            <div className="flex items-center justify-center">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedSubtasks((prev) => {
                      const next = new Set(prev);
                      if (next.has(subtask.id)) next.delete(subtask.id);
                      else next.add(subtask.id);
                      return next;
                    });
                  }}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  aria-label={isExpanded ? "Collapse child tasks" : "Expand child tasks"}
                >
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
              ) : (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-primary/20 bg-background/70 text-primary/40 dark:border-primary/30 dark:bg-white/5 dark:text-primary/60">
                  <ChevronRight size={12} />
                </span>
              )}
            </div>
          </td>
          <td className={`py-3.5 px-4 ${isColumnVisible("refId") ? "" : "hidden"}`}>
            {subtask.public_id ? (
              <div className="flex items-center gap-1">
                <span className="font-mono text-[11px] font-semibold px-2 py-1 rounded-md tracking-wider select-all bg-gradient-to-r from-purple-500/15 to-pink-500/15 border border-purple-500/30 text-purple-400">
                  {subtask.public_id}
                </span>
                <button onClick={(e) => handleCopyRefId(e, subtask.public_id)} className="text-muted-foreground hover:text-purple-400 transition-colors p-0.5">
                  <Copy size={11} />
                </button>
              </div>
            ) : <span className="text-[10px] text-muted-foreground italic">—</span>}
          </td>
          <td className={`py-3.5 px-4 min-w-[280px] ${isColumnVisible("task") ? "" : "hidden"}`}>
            <div className="relative" style={{ paddingLeft: `${depth * 20 + 14}px` }}>
              <span className="pointer-events-none absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-primary/30 dark:bg-primary/45" />
              <span className="pointer-events-none absolute left-3 top-0 h-full w-px bg-primary/20 dark:bg-primary/35" />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-card-foreground">{subtask.title}</span>
                {warningState.isWarning && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowWarningLinks(true); }}
                    className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-500/10 border border-red-500/30 text-red-500"
                    title={warningState.reason || "Task warning"}
                  >
                    <AlertCircle size={10} /> Warning
                  </button>
                )}
                {
                  <button
                    onClick={(e) => { e.stopPropagation(); openSubtaskModal(rootTask.id, subtask.id); }}
                    className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-500 hover:bg-blue-500/20 transition-colors"
                    title="Add sub-subtask"
                  >
                    <Plus size={10} />
                  </button>
                }
              </div>
              {subtask.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{subtask.description}</p>}
              {warningState.isWarning && warningState.reason && (
                <p className="text-[10px] text-red-500/90 mt-0.5 line-clamp-1">{warningState.reason}</p>
              )}
            </div>
          </td>
          <td className={`py-3.5 px-4 min-w-[140px] ${isColumnVisible("workspace") ? "" : "hidden"}`}>
            <div onClick={(e) => e.stopPropagation()}>
              <div className="inline-flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-card-foreground opacity-90">
                <span
                  className="inline-flex h-2.5 w-2.5 rounded-full border border-white/20"
                  style={{ backgroundColor: subtask.workspace_color || rootTask.workspace_color || "#6b7280" }}
                />
                <span>{subtask.workspace_icon || rootTask.workspace_icon || "•"}</span>
                <span>{subtask.workspace_name || rootTask.workspace_name || "Inherited"}</span>
              </div>
            </div>
          </td>
          <td className={`py-3.5 px-4 ${isColumnVisible("priority") ? "" : "hidden"}`}>
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu
                value={subtask.priority}
                onValueChange={(value) => handlePriorityChange(subtask.id, value as "low" | "medium" | "high")}
                options={priorityOptions}
                placeholder="Priority"
                triggerClassName={`w-[132px] rounded-xl px-2.5 py-1.5 text-[10px] font-semibold capitalize ${priorityColors[subtask.priority]}`}
              />
            </div>
          </td>
          <td className={`py-3.5 px-4 ${isColumnVisible("status") ? "" : "hidden"}`}>
            <div onClick={(e) => e.stopPropagation()}>
              {canEditTaskStatus(subtask) ? (
                <DropdownMenu
                  value={subtask.status === "submitted" ? "done" : subtask.status}
                  onValueChange={(value) => handleStatusChange(subtask.id, value)}
                  options={employeeStatusOptions}
                  placeholder="Status"
                  triggerClassName={`w-[170px] rounded-xl px-2.5 py-1.5 text-xs font-medium ${statusColors[subtask.status]}`}
                />
              ) : (
                <span className={`inline-flex w-[170px] items-center rounded-xl px-2.5 py-1.5 text-xs font-medium ${statusColors[subtask.status]}`}>
                  {getStatusDisplayLabel(subtask.status)}
                </span>
              )}
            </div>
          </td>
          <td className={`py-3.5 px-4 text-card-foreground text-xs whitespace-nowrap text-center min-w-[140px] ${isColumnVisible("reporter") ? "" : "hidden"}`}>
            {isAdmin ? (
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu
                  value={String(subtask.assigned_by)}
                  onValueChange={(value) => handleReporterChange(subtask.id, Number(value))}
                  options={employeeOptions}
                  placeholder="Reporter"
                  triggerClassName="w-[190px] rounded-xl px-2.5 py-1.5 text-xs font-medium text-card-foreground"
                />
              </div>
            ) : (
              getReporterName(subtask)
            )}
          </td>
          <td className={`py-3.5 px-4 text-xs whitespace-nowrap text-center min-w-[180px] ${isColumnVisible("resolution") ? "" : "hidden"}`}>
            <input
              type="text"
              value={getEditableResolution(subtask)}
              onChange={(e) => handleResolutionEdit(subtask.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Enter resolution"
              className="w-full rounded-md border border-primary/25 bg-primary/10 px-2 py-1 text-xs text-primary font-medium focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </td>
          <td className={`py-3.5 px-4 text-muted-foreground text-xs whitespace-nowrap ${isColumnVisible("createdDate") ? "" : "hidden"}`}>
            {subtask.created_at ? new Date(subtask.created_at).toLocaleDateString("en-IN") : "--"}
          </td>
          <td className={`py-3.5 px-4 text-muted-foreground text-xs whitespace-nowrap ${isColumnVisible("startDate") ? "" : "hidden"}`}>
            <input
              type="date"
              value={subtask.start_date ? new Date(subtask.start_date).toISOString().slice(0, 10) : ""}
              onChange={(e) => handleSubtaskDateChange(subtask.id, "start_date", e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="rounded-md border border-border bg-card/70 px-2 py-1 text-xs text-card-foreground"
            />
          </td>
          <td className={`py-3.5 px-4 text-card-foreground text-xs font-medium whitespace-nowrap ${isColumnVisible("updatedDate") ? "" : "hidden"}`}>
            {getTaskUpdatedDate(subtask)}
          </td>
          <td className={`py-3.5 px-4 min-w-[220px] ${isColumnVisible("assignee") ? "" : "hidden"}`}>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold shrink-0" style={{ background: "hsl(289 36% 26% / 0.12)", color: "#522B5B", border: "1px solid hsl(289 36% 26% / 0.2)" }}>
                {subtask.assignee_name ? subtask.assignee_name.split(" ").map((n) => n[0]).join("") : "?"}
              </div>
              {isAdmin ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu
                    value={subtask.assigned_to ? String(subtask.assigned_to) : ""}
                    onValueChange={(value) => {
                      if (!value) return;
                      handleAssigneeChange(subtask.id, Number(value));
                    }}
                    options={employeeOptions}
                    placeholder="Assignee"
                    triggerClassName="w-[210px] rounded-xl px-2.5 py-1.5 text-sm font-medium text-card-foreground"
                  />
                </div>
              ) : (
                <span className="text-sm font-medium text-card-foreground">
                  {subtask.assignee_name || "Unassigned"}
                  {subtask.assigned_to === user?.id && (
                    <span className="ml-1.5 text-[10px] font-semibold text-primary">(You)</span>
                  )}
                </span>
              )}
            </div>
          </td>
          <td className={`py-3.5 px-4 text-card-foreground text-xs font-medium whitespace-nowrap ${isColumnVisible("dueDate") ? "" : "hidden"}`}>
            <input
              type="date"
              value={subtask.due_date ? new Date(subtask.due_date).toISOString().slice(0, 10) : ""}
              onChange={(e) => handleSubtaskDateChange(subtask.id, "due_date", e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="rounded-md border border-border bg-card/70 px-2 py-1 text-xs text-card-foreground"
            />
          </td>
          <td className={`py-3.5 px-4 text-center whitespace-nowrap ${isAdmin && isColumnVisible("actions") ? "" : "hidden"}`}>
            {isAdmin && (
              <div className="flex items-center justify-center gap-3">
                <button onClick={(e) => { e.stopPropagation(); openSubtaskPanel(subtask, rootTask); }} className="text-primary hover:text-primary/80 text-xs">Edit</button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(subtask.id); }} className="text-red-500 hover:text-red-600 text-xs">Delete</button>
              </div>
            )}
          </td>
        </tr>
      );

      if (!hasChildren || !isExpanded) {
        return [row];
      }

      return [row, ...renderSubtaskRows(subtask.children, rootTask, depth + 1)];
    });
  };

  const handleCopyRefId = (e: React.MouseEvent, refId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(refId).then(() => toast.success(`Copied ${refId}`));
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getTimelineChip = (task: Task) => {
    if (task.completed_at && task.start_date) {
      const start = new Date(task.start_date).getTime();
      const done = new Date(task.completed_at).getTime();
      const days = Math.max(1, Math.ceil((done - start) / (1000 * 60 * 60 * 24)));
      return { label: `Completed in ${days} day${days === 1 ? "" : "s"}`, tone: "green" };
    }

    if (!task.due_date) {
      return { label: "No due date", tone: "neutral" };
    }

    const now = new Date();
    const due = new Date(task.due_date);
    const delta = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (delta < 0) {
      const over = Math.abs(delta);
      return { label: `Overdue by ${over} day${over === 1 ? "" : "s"}`, tone: "red" };
    }
    if (delta <= 2) {
      return { label: `Due in ${delta} day${delta === 1 ? "" : "s"}`, tone: "orange" };
    }
    return { label: `Due in ${delta} days`, tone: "neutral" };
  };

  const getTimelineChipClass = (tone: string) => {
    if (tone === "green") return "bg-green-500/12 border-green-500/30 text-green-600 dark:text-green-400";
    if (tone === "orange") return "bg-amber-500/12 border-amber-500/30 text-amber-600 dark:text-amber-400";
    if (tone === "red") return "bg-red-500/12 border-red-500/30 text-red-500";
    return "bg-muted border-border text-muted-foreground";
  };

  const loadSubtaskComments = useCallback(async (taskId: number) => {
    setLoadingSubtaskComments(true);
    const response = await getTaskComments(taskId);
    if (response.error) {
      toast.error(response.error);
      setSubtaskComments([]);
    } else {
      setSubtaskComments(response.data || []);
    }
    setLoadingSubtaskComments(false);
  }, []);

  const getSubtaskCommentTaskId = useCallback(
    (subtask: Task, rootTask?: Task | null) => {
      if (subtask.id > 0) return subtask.id;
      return rootTask?.id ?? null;
    },
    []
  );

  const openSubtaskPanel = (subtask: Task, rootTask: Task) => {
    setSelectedSubtaskForPanel(subtask);
    setSelectedSubtaskRootTaskForPanel(rootTask);
    setNewSubtaskComment("");
    const draftStatus: SubtaskDraftStatus = !isAdmin && subtask.status === "submitted"
      ? "done"
      : subtask.status;
    setDetailDraft({
      title: subtask.title || "",
      description: subtask.description || "",
      status: draftStatus,
      priority: subtask.priority,
      assigned_to: subtask.assigned_to ? String(subtask.assigned_to) : "__unassigned",
      assigned_by: String(subtask.assigned_by || ""),
      start_date: subtask.start_date ? new Date(subtask.start_date).toISOString().slice(0, 10) : "",
      due_date: subtask.due_date || "",
      completed_at: subtask.completed_at ? new Date(subtask.completed_at).toISOString().slice(0, 10) : "",
      estimated_hours: subtask.estimated_hours != null ? String(subtask.estimated_hours) : "",
      actual_hours: subtask.actual_hours != null ? String(subtask.actual_hours) : "",
    });

    const commentTaskId = getSubtaskCommentTaskId(subtask, rootTask);
    if (commentTaskId) {
      loadSubtaskComments(commentTaskId);
    } else {
      setSubtaskComments([]);
    }
  };

  const handleAddSubtaskComment = async () => {
    if (!selectedSubtaskForPanel || !newSubtaskComment.trim()) return;

    const commentTaskId = getSubtaskCommentTaskId(selectedSubtaskForPanel, selectedSubtaskRootTaskForPanel);
    if (!commentTaskId) {
      toast.error("Unable to determine comment target task");
      return;
    }

    setIsCommentSaving(true);
    const response = await createTaskComment({
      task_id: commentTaskId,
      comment: newSubtaskComment.trim(),
    });

    if (response.error) {
      toast.error(response.error);
    } else {
      setNewSubtaskComment("");
      toast.success("Comment added");
      await loadSubtaskComments(commentTaskId);
    }
    setIsCommentSaving(false);
  };

  const handleDeleteSubtaskComment = async (commentId: number) => {
    setDeletingCommentId(commentId);
    const response = await deleteTaskComment(commentId);
    if (response.error) {
      toast.error(response.error);
    } else if (selectedSubtaskForPanel) {
      const commentTaskId = getSubtaskCommentTaskId(selectedSubtaskForPanel, selectedSubtaskRootTaskForPanel);
      if (commentTaskId) {
        await loadSubtaskComments(commentTaskId);
      }
      toast.success("Comment deleted");
    }
    setDeletingCommentId(null);
  };

  const saveTaskDetails = async () => {
    if (!selectedSubtaskForPanel) return;

    const title = detailDraft.title.trim();
    if (!title) {
      toast.error("Subtask title is required");
      return;
    }

    const parseOptionalNumber = (value: string) => {
      if (!value.trim()) return undefined;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    };

    const assignedToValue = detailDraft.assigned_to === "__unassigned"
      ? undefined
      : parseOptionalNumber(detailDraft.assigned_to);
    const assignedByValue = parseOptionalNumber(detailDraft.assigned_by);
    const estimatedHoursValue = parseOptionalNumber(detailDraft.estimated_hours);
    const actualHoursValue = parseOptionalNumber(detailDraft.actual_hours);
    const isLegacySubtaskRow = selectedSubtaskForPanel.id < 0;

    const fallbackAssigneeId =
      assignedToValue ??
      selectedSubtaskForPanel.assigned_to ??
      selectedSubtaskRootTaskForPanel?.assigned_to ??
      undefined;
    if (isLegacySubtaskRow && !fallbackAssigneeId) {
      toast.error("Please select an assignee for this subtask");
      return;
    }

    setIsDetailSaving(true);
    try {
      const updateResult = isLegacySubtaskRow
        ? await updateSubtask(Math.abs(selectedSubtaskForPanel.id), {
            title,
            description: detailDraft.description.trim(),
            priority: detailDraft.priority,
            assigned_to: fallbackAssigneeId,
            assigned_by: assignedByValue,
            due_date: detailDraft.due_date || undefined,
          })
        : await updateTask(selectedSubtaskForPanel.id, {
            title,
            description: detailDraft.description.trim(),
            priority: detailDraft.priority,
            assigned_to: assignedToValue,
            assigned_by: assignedByValue,
            start_date: detailDraft.start_date || undefined,
            due_date: detailDraft.due_date || undefined,
            completed_at: detailDraft.completed_at || undefined,
            estimated_hours: estimatedHoursValue,
            actual_hours: actualHoursValue,
          });

      if (updateResult.error) {
        toast.error(updateResult.error);
        return;
      }

      const normalizedStatus = isLegacySubtaskRow
        ? (detailDraft.status === "done" || detailDraft.status === "submitted" ? "completed" : detailDraft.status)
        : (detailDraft.status === "done" ? "submitted" : detailDraft.status);
      if (normalizedStatus !== selectedSubtaskForPanel.status) {
        const statusResult = isLegacySubtaskRow
          ? await updateSubtaskStatus(Math.abs(selectedSubtaskForPanel.id), normalizedStatus)
          : await updateTaskStatus(selectedSubtaskForPanel.id, normalizedStatus as Task["status"]);
        if (statusResult.error) {
          toast.error(statusResult.error);
          return;
        }
      }

      const selectedAssignee = employees.find((emp) => emp.id === assignedToValue);
      const selectedReporter = employees.find((emp) => emp.id === assignedByValue);
      const updatedSubtask: Task = {
        ...selectedSubtaskForPanel,
        title,
        description: detailDraft.description.trim(),
        priority: detailDraft.priority,
        status: normalizedStatus as Task["status"],
        assigned_to: assignedToValue ?? null,
        assigned_by: assignedByValue ?? selectedSubtaskForPanel.assigned_by,
        assignee_name: assignedToValue != null ? (selectedAssignee?.name || selectedSubtaskForPanel.assignee_name) : undefined,
        assigned_by_name: assignedByValue != null ? (selectedReporter?.name || selectedSubtaskForPanel.assigned_by_name) : undefined,
        start_date: isLegacySubtaskRow ? selectedSubtaskForPanel.start_date : (detailDraft.start_date || selectedSubtaskForPanel.start_date),
        due_date: detailDraft.due_date || null,
        completed_at: isLegacySubtaskRow ? selectedSubtaskForPanel.completed_at : (detailDraft.completed_at || null),
        estimated_hours: isLegacySubtaskRow ? selectedSubtaskForPanel.estimated_hours : (estimatedHoursValue ?? null),
        actual_hours: isLegacySubtaskRow ? selectedSubtaskForPanel.actual_hours : (actualHoursValue ?? null),
      };

      setSelectedSubtaskForPanel(updatedSubtask);
      setTaskChildren((prev) => {
        const next: Record<number, Task[]> = {};
        Object.entries(prev).forEach(([taskId, subtasks]) => {
          next[Number(taskId)] = subtasks.map((subtask) =>
            subtask.id === updatedSubtask.id ? { ...subtask, ...updatedSubtask } : subtask
          );
        });
        return next;
      });

      toast.success("Subtask updated");
      await loadData(true);
      expandedTasksRef.current.forEach((taskId) => {
        loadSubtasksQuietly(taskId);
      });
    } finally {
      setIsDetailSaving(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (projectFilter === "__subtasks__") {
      if ((taskChildren[t.id] || []).length === 0) return false;
    } else if (projectFilter !== "__all") {
      const parsedProjectFilter = Number(projectFilter);
      if (!Number.isNaN(parsedProjectFilter) && t.id !== parsedProjectFilter) return false;
    }

    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.public_id?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "new" || statusFilter === "todo") return t.status === "todo";
    if (statusFilter === "completed") return t.status === "approved";
    if (statusFilter === "in_progress") return t.status === "in_progress";
    if (statusFilter === "submitted") return t.status === "submitted";
    if (statusFilter === "reviewing") return t.status === "reviewing";
    if (statusFilter === "approved") return t.status === "approved";
    if (statusFilter === "rejected") return t.status === "rejected";

    const warningState = getTaskWarningState(t, taskWarningSettings, new Date(), getTaskLatestActivityAt(t));
    if (statusFilter === "warning") return warningState.isWarning;

    if (statusFilter !== "overdue") return true;
    if (!t.due_date || t.status === "approved") return false;

    const dueDate = new Date(t.due_date);
    if (Number.isNaN(dueDate.getTime())) return false;
    const today = new Date();
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  });

  const warningLinkItems = useMemo(() => {
    const items: Array<{
      kind: "project" | "task";
      id: number;
      title: string;
      reason: string;
      rootTaskId: number;
      rootTaskTitle: string;
    }> = [];

    filteredTasks.forEach((task) => {
      const taskWarningState = getTaskWarningState(task, taskWarningSettings, new Date(), getTaskLatestActivityAt(task));
      if (taskWarningState.isWarning) {
        items.push({
          kind: "project",
          id: task.id,
          title: task.title,
          reason: taskWarningState.reason || "Task warning",
          rootTaskId: task.id,
          rootTaskTitle: task.title,
        });
      }

      (taskChildren[task.id] || []).forEach((subtask) => {
        const subtaskWarningState = getTaskWarningState(subtask, taskWarningSettings);
        if (subtaskWarningState.isWarning) {
          items.push({
            kind: "task",
            id: subtask.id,
            title: subtask.title,
            reason: subtaskWarningState.reason || "Task warning",
            rootTaskId: task.id,
            rootTaskTitle: task.title,
          });
        }
      });
    });

    return items.sort((left, right) => left.title.localeCompare(right.title));
  }, [filteredTasks, taskChildren, taskWarningSettings]);

  const getTaskUpdatedDate = (task: Task) => {
    const subtasks = taskChildren[task.id] || [];
    const latestSubtaskTs = subtasks.reduce<number>(
      (latest, s) => {
        const ts = Date.parse(s.updated_at || s.created_at || "");
        return Number.isNaN(ts) ? latest : Math.max(latest, ts);
      },
      0
    );
    const taskTs = Date.parse(task.updated_at || task.start_date || "");
    const effectiveTs = Math.max(Number.isNaN(taskTs) ? 0 : taskTs, latestSubtaskTs);
    return effectiveTs ? new Date(effectiveTs).toLocaleDateString("en-IN") : "--";
  };

  const getReporterName = (task: Task) => {
    if (task.assigned_by_name) return task.assigned_by_name;
    const reporter = employees.find((emp) => emp.id === task.assigned_by);
    return reporter?.name || "--";
  };

  const getResolution = (task: Task) => {
    const map: Record<string, string> = {
      approved: "Resolved",
      rejected: "Rejected",
      reviewing: "Testing",
      submitted: "Pending",
      in_progress: "Open",
      todo: "Unresolved",
    };
    return map[task.status] || "Unresolved";
  };

  const getEditableResolution = (task: Task) => {
    const edited = resolutionEdits[task.id];
    return edited !== undefined ? edited : getResolution(task);
  };

  const handleResolutionEdit = (taskId: number, value: string) => {
    setResolutionEdits((prev) => ({ ...prev, [taskId]: value }));
  };

  const handleNavigate = useCallback(
    (url: string, e?: React.MouseEvent) => {
      if (e && (e.ctrlKey || e.metaKey || e.button === 1)) {
        // Ctrl+Click or Middle-Click: open in new tab
        window.open(url, "_blank");
      } else {
        // Regular click: open in current tab
        router.push(url);
      }
    },
    [router]
  );

  const selectedWorkspace = useMemo(
    () => workspaces.find((ws) => ws.id === workspaceFilter),
    [workspaces, workspaceFilter]
  );

  const workspaceScopedView = Boolean(workspaceFilter);

  const newProjectBtn = isAdmin ? (
    <button
      onClick={() => {
        setNewTask((prev) => ({ ...prev, assigned_by: prev.assigned_by || user?.id }));
        setShowCreateModal(true);
      }}
      className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md hover:opacity-90 transition-opacity"
      style={{ background: "#522B5B" }}
    >
      <Plus size={16} /> New Project
    </button>
  ) : null;

  return (
    <ProjectShell headerAction={newProjectBtn} activeWorkspaceId={workspaceQuery || null}>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="relative w-full lg:flex-1 lg:max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks or Ref ID (e.g. A7X9K2)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg glass-input py-2 pl-9 pr-9 text-sm"
            />
            {isSearchingById && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-purple-500" />}
          </div>
          <DropdownMenu
            value={statusFilter || "__all"}
            onValueChange={(value) => setStatusFilter(value === "__all" ? "" : value)}
            options={statusFilterOptions}
            placeholder="All Status"
            triggerClassName="w-full lg:w-52"
          />
          <DropdownMenu
            value={workspaceFilter ? String(workspaceFilter) : "__all"}
            onValueChange={(value) => setWorkspaceFilter(value === "__all" ? undefined : Number(value))}
            options={workspaceFilterOptions}
            placeholder="All Workspaces"
            triggerClassName="w-full lg:w-56"
            disabled={workspaceScopedView}
          />
          <DropdownMenu
            value={assigneeFilter ? String(assigneeFilter) : "__all"}
            onValueChange={(value) => setAssigneeFilter(value === "__all" ? undefined : Number(value))}
            options={assigneeFilterOptions}
            placeholder="All Users"
            triggerClassName="w-full lg:w-52"
          />
          <DropdownMenu
            value={projectFilter}
            onValueChange={(value) => setProjectFilter(value)}
            options={projectFilterOptions}
            placeholder="All Projects"
            triggerClassName="w-full lg:w-56"
          />
          <div className="relative w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setShowProjectLinks((prev) => !prev)}
              className="inline-flex w-full lg:w-auto items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <ListTree size={14} />
              Project Links
            </button>

            {showProjectLinks && (
              <div className="absolute left-0 top-full z-20 mt-2 w-80 max-h-96 overflow-hidden rounded-xl border border-border bg-card p-3 shadow-xl">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Quick Project Links</p>
                    <p className="text-[11px] text-muted-foreground">Open any project directly</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProjectLinks(false)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Close project links"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                  {projectLinkItems.length > 0 ? (
                    projectLinkItems.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => {
                          setShowProjectLinks(false);
                          router.push(`/project-management/${project.id}`);
                        }}
                        className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-left text-xs hover:bg-primary/10 hover:border-primary/30 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{project.title}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {project.publicId || `Project #${project.id}`}
                            {project.workspace ? ` • ${project.workspace}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] font-semibold text-primary">Open</span>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
                      No projects available
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="relative w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setShowSubtaskLinks((prev) => !prev)}
              className="inline-flex w-full lg:w-auto items-center justify-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-500 hover:bg-blue-500/15 transition-colors"
            >
              <ListTree size={14} />
              Subtask Links
            </button>

            {showSubtaskLinks && (
              <div className="absolute left-0 top-full z-20 mt-2 w-96 max-h-96 overflow-hidden rounded-xl border border-border bg-card p-3 shadow-xl">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Subtasks</p>
                    <p className="text-[11px] text-muted-foreground">Open any subtask directly</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSubtaskLinks(false)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Close subtask links"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                  {subtaskLinkItems.length > 0 ? (
                    subtaskLinkItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setShowSubtaskLinks(false);
                          const rootTask = tasks.find((task) => task.id === item.rootTaskId);
                          const subtask = (taskChildren[item.rootTaskId] || []).find((candidate) => candidate.id === item.id);
                          if (rootTask && subtask) {
                            setExpandedTasks((prev) => new Set(prev).add(item.rootTaskId));
                            openSubtaskPanel(subtask, rootTask);
                          }
                        }}
                        className="flex w-full items-start justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-left text-xs hover:bg-blue-500/10 hover:border-blue-500/30 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{item.title}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {item.publicId || `Subtask #${item.id}`}
                            {item.workspace ? ` • ${item.workspace}` : ""}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">{item.rootTaskTitle}</p>
                        </div>
                        <span className="shrink-0 text-[10px] font-semibold text-blue-500">Open</span>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
                      No subtasks available
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="relative w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setShowWarningLinks((prev) => !prev)}
              className="inline-flex w-full lg:w-auto items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/15 transition-colors"
            >
              <AlertCircle size={14} />
              Warning Links
            </button>

            {showWarningLinks && (
              <div className="absolute left-0 top-full z-20 mt-2 w-96 max-h-96 overflow-hidden rounded-xl border border-border bg-card p-3 shadow-xl">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Warnings</p>
                    <p className="text-[11px] text-muted-foreground">Jump to projects and tasks that need attention</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowWarningLinks(false)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Close warning links"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                  {warningLinkItems.length > 0 ? (
                    warningLinkItems.map((item) => (
                      <button
                        key={`${item.kind}-${item.id}`}
                        type="button"
                        onClick={() => {
                          setShowWarningLinks(false);
                          if (item.kind === "project") {
                            router.push(`/project-management/${item.id}`);
                            return;
                          }

                          const rootTask = tasks.find((task) => task.id === item.rootTaskId);
                          const subtask = (taskChildren[item.rootTaskId] || []).find((candidate) => candidate.id === item.id);
                          if (rootTask && subtask) {
                            setExpandedTasks((prev) => new Set(prev).add(item.rootTaskId));
                            openSubtaskPanel(subtask, rootTask);
                          }
                        }}
                        className="flex w-full items-start justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-left text-xs hover:bg-red-500/10 hover:border-red-500/30 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {item.kind === "project" ? "Project" : "Task"}: {item.title}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">{item.rootTaskTitle}</p>
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-red-500/90">{item.reason}</p>
                        </div>
                        <span className="shrink-0 text-[10px] font-semibold text-red-500">Open</span>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
                      No warnings right now
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {workspaceScopedView && selectedWorkspace && (
            <div className="inline-flex w-full lg:w-auto items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              <span
                className="inline-flex h-2.5 w-2.5 rounded-full border border-white/20"
                style={{ backgroundColor: selectedWorkspace.color || "#6b7280" }}
              />
              <span>{selectedWorkspace.icon || "•"}</span>
              <span>{selectedWorkspace.name} workspace projects</span>
            </div>
          )}
          <div className="relative w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setShowColumnSettings((prev) => !prev)}
              className="inline-flex w-full lg:w-auto items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <SlidersHorizontal size={14} />
              Customize List Fields
            </button>
            {showColumnSettings && (
              <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-border bg-card p-3 shadow-xl">
                <div className="mb-2 text-xs font-semibold text-muted-foreground">Visible Columns</div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {LIST_COLUMN_DEFS.filter((column) => !column.adminOnly || isAdmin).map((column) => {
                    const checked = isColumnVisible(column.id);
                    return (
                      <label key={column.id} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleVisibleColumn(column.id)}
                          disabled={checked && visibleColumnCount <= 1}
                        />
                        <span>{column.label}</span>
                      </label>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setShowColumnSettings(false)}
                  className="mt-3 w-full rounded-md border border-border px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500 drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
          </div>
        ) : (
          <div className="rounded-xl glass-card overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[1700px] text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20 text-purple-400 font-semibold">
                  <th className="py-3 px-4 text-center font-semibold"></th>
                  <th className={`py-3 px-4 text-center font-semibold whitespace-nowrap ${isColumnVisible("refId") ? "" : "hidden"}`}>Ref ID</th>
                  <th className={`py-3 px-4 text-center font-semibold whitespace-nowrap ${isColumnVisible("task") ? "" : "hidden"}`}>Task</th>
                  <th className={`py-3 px-4 text-center font-semibold whitespace-nowrap ${isColumnVisible("workspace") ? "" : "hidden"}`}>Workspace</th>
                  <th className={`py-3 px-4 text-center font-semibold whitespace-nowrap ${isColumnVisible("priority") ? "" : "hidden"}`}>Priority</th>
                  <th className={`py-3 px-4 text-center font-semibold whitespace-nowrap ${isColumnVisible("status") ? "" : "hidden"}`}>Status</th>
                  <th className={`py-3 px-4 text-center font-semibold whitespace-nowrap ${isColumnVisible("reporter") ? "" : "hidden"}`}>Reporter</th>
                  <th className={`py-3 px-4 text-center font-semibold whitespace-nowrap ${isColumnVisible("resolution") ? "" : "hidden"}`}>Resolution</th>
                  <th className={`py-3 px-4 text-center font-semibold whitespace-nowrap ${isColumnVisible("createdDate") ? "" : "hidden"}`}>Created Date</th>
                  <th className={`py-3 px-4 text-center font-semibold whitespace-nowrap ${isColumnVisible("startDate") ? "" : "hidden"}`}>Start Date</th>
                  <th className={`py-3 px-4 text-center font-semibold whitespace-nowrap ${isColumnVisible("updatedDate") ? "" : "hidden"}`}>Updated Date</th>
                  <th className={`py-3 px-4 text-center font-semibold whitespace-nowrap ${isColumnVisible("assignee") ? "" : "hidden"}`}>Assignee</th>
                  <th className={`py-3 px-4 text-center font-semibold whitespace-nowrap ${isColumnVisible("dueDate") ? "" : "hidden"}`}>Due Date</th>
                  <th className={`py-3 px-4 text-center font-semibold whitespace-nowrap ${canManageTasks && isColumnVisible("actions") ? "" : "hidden"}`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#DFB6B2" }}>
                {filteredTasks.map((task) => {
                  const warningState = getTaskWarningState(task, taskWarningSettings, new Date(), getTaskLatestActivityAt(task));
                  return (
                    <React.Fragment key={task.id}>
                      <tr
                        className="cursor-pointer transition-all duration-200 hover:bg-secondary/40 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.26)] hover:scale-[1.002] active:scale-[0.998]"
                        onClick={(e) => handleNavigate(`/project-management/${task.id}`, e as React.MouseEvent)}
                      >
                        <td className="py-3.5 pl-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpandTask(task.id); }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={expandedTasks.has(task.id) ? "Collapse subtasks" : "Expand subtasks"}
                          >
                            {expandedTasks.has(task.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </td>
                        <td className={`py-3.5 px-4 ${isColumnVisible("refId") ? "" : "hidden"}`}>
                          {task.public_id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNavigate(`/project-management/${task.id}`, e);
                                }}
                                className="font-mono text-[11px] font-semibold px-2 py-1 rounded-md tracking-wider select-all bg-gradient-to-r from-purple-500/15 to-pink-500/15 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 transition-colors cursor-pointer"
                                title="Open project details (Ctrl+Click for new tab)"
                              >
                                {task.public_id}
                              </button>
                              <button onClick={(e) => handleCopyRefId(e, task.public_id)} className="text-muted-foreground hover:text-purple-400 transition-colors p-0.5">
                                <Copy size={11} />
                              </button>
                            </div>
                          ) : <span className="text-[10px] text-muted-foreground italic">—</span>}
                        </td>
                        <td className={`py-3.5 px-4 min-w-[280px] ${isColumnVisible("task") ? "" : "hidden"}`}>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-card-foreground">{task.title}</span>
                              {task.is_recurring && (
                                <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400" title="Recurring task">
                                  <Repeat size={10} /> Recurring
                                </span>
                              )}
                              {warningState.isWarning && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setShowWarningLinks(true); }}
                                  className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-500/10 border border-red-500/30 text-red-500"
                                  title={warningState.reason || "Task warning"}
                                >
                                  <AlertCircle size={10} /> Warning
                                </button>
                              )}
                              {(isAdmin || task.assigned_to === user?.id) && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedTaskForSubtask(task.id); setShowSubtaskModal(true); }}
                                  className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-500 hover:bg-blue-500/20 transition-colors"
                                  title="Add subtask"
                                >
                                  <Plus size={10} />
                                </button>
                              )}
                              {taskChildren[task.id]?.length > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-500">
                                  <ListTree size={10} />
                                  {taskChildren[task.id].filter((s) => s.status === "approved").length}/{taskChildren[task.id].length}
                                </span>
                              )}
                            </div>
                            {warningState.isWarning && warningState.reason && (
                              <p className="mt-0.5 text-[10px] text-red-500/90 line-clamp-1">{warningState.reason}</p>
                            )}
                            {task.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>}
                            <div className="mt-1.5 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNavigate(`/project-management/${task.id}`, e);
                                }}
                                className="text-[10px] font-semibold text-primary hover:text-primary/80 cursor-pointer"
                                title="Ctrl+Click to open in new tab"
                              >
                                Open
                              </button>
                              {canManageTasks && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditTask(task);
                                  }}
                                  className="text-[10px] font-semibold text-amber-500 hover:text-amber-400"
                                >
                                  Quick Edit
                                </button>
                              )}
                              {task.workspace_id && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNavigate(`/project-management/workspaces/${task.workspace_id}`, e);
                                  }}
                                  className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
                                  title="Ctrl+Click to open in new tab"
                                >
                                  Workspace
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className={`py-3.5 px-4 min-w-[140px] ${isColumnVisible("workspace") ? "" : "hidden"}`}>
                          {isAdmin ? (
                            <div onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu
                                value={String(task.workspace_id || "")}
                                onValueChange={(value) => handleWorkspaceChange(task.id, Number(value))}
                                options={workspaceSelectOptions}
                                placeholder="Select workspace"
                                triggerClassName="w-[180px] rounded-xl px-2.5 py-1.5 text-xs"
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (task.workspace_id) {
                                  handleNavigate(`/project-management/workspaces/${task.workspace_id}`, e);
                                }
                              }}
                              className="flex items-center gap-2 text-xs text-foreground hover:text-primary transition-colors cursor-pointer"
                              title="Ctrl+Click to open in new tab"
                            >
                              <span
                                className="inline-flex h-2.5 w-2.5 rounded-full border border-white/20"
                                style={{ backgroundColor: task.workspace_color || "#6b7280" }}
                              />
                              <span>{task.workspace_icon || "•"}</span>
                              <span>{task.workspace_name || "Unassigned"}</span>
                            </button>
                          )}
                        </td>
                        <td className={`py-3.5 px-4 ${isColumnVisible("priority") ? "" : "hidden"}`}>
                          <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu
                              value={task.priority}
                              onValueChange={(value) => handlePriorityChange(task.id, value as "low" | "medium" | "high")}
                              options={priorityOptions}
                              placeholder="Priority"
                              triggerClassName={`w-[132px] rounded-xl px-2.5 py-1.5 text-[10px] font-semibold capitalize ${priorityColors[task.priority]}`}
                            />
                          </div>
                        </td>
                        <td className={`py-3.5 px-4 ${isColumnVisible("status") ? "" : "hidden"}`}>
                          <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu
                              value={task.status === "submitted" ? "done" : task.status}
                              onValueChange={(value) => handleStatusChange(task.id, value)}
                              options={employeeStatusOptions.map(option => ({
                                ...option,
                                disabled: user?.role === "employee" && task.assigned_to !== user?.id
                              }))}
                              placeholder="Status"
                              triggerClassName={`w-[170px] rounded-xl px-2.5 py-1.5 text-xs font-medium ${statusColors[task.status]}`}
                            />
                          </div>
                        </td>
                        <td className={`py-3.5 px-4 text-card-foreground text-xs whitespace-nowrap text-center min-w-[140px] ${isColumnVisible("reporter") ? "" : "hidden"}`}>
                          {isAdmin ? (
                            <div onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu
                                value={String(task.assigned_by)}
                                onValueChange={(value) => handleReporterChange(task.id, Number(value))}
                                options={employeeOptions}
                                placeholder="Reporter"
                                triggerClassName="w-[190px] rounded-xl px-2.5 py-1.5 text-xs font-medium text-card-foreground"
                              />
                            </div>
                          ) : (
                            getReporterName(task)
                          )}
                        </td>
                        <td className={`py-3.5 px-4 text-xs whitespace-nowrap text-center min-w-[180px] ${isColumnVisible("resolution") ? "" : "hidden"}`}>
                          <input
                            type="text"
                            value={getEditableResolution(task)}
                            onChange={(e) => handleResolutionEdit(task.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Enter resolution"
                            className="w-full rounded-md border border-primary/25 bg-primary/10 px-2 py-1 text-xs text-primary font-medium focus:outline-none focus:ring-1 focus:ring-primary/40"
                          />
                        </td>
                        <td className={`py-3.5 px-4 text-muted-foreground text-xs whitespace-nowrap ${isColumnVisible("createdDate") ? "" : "hidden"}`}>
                          {task.created_at ? new Date(task.created_at).toLocaleDateString("en-IN") : "--"}
                        </td>
                        <td className={`py-3.5 px-4 text-muted-foreground text-xs whitespace-nowrap ${isColumnVisible("startDate") ? "" : "hidden"}`}>
                          {task.start_date ? new Date(task.start_date).toLocaleDateString("en-IN") : "--"}
                        </td>
                        <td className={`py-3.5 px-4 text-card-foreground text-xs font-medium whitespace-nowrap ${isColumnVisible("updatedDate") ? "" : "hidden"}`}>
                          {getTaskUpdatedDate(task)}
                        </td>
                        <td className={`py-3.5 px-4 min-w-[220px] ${isColumnVisible("assignee") ? "" : "hidden"}`}>
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold shrink-0" style={{ background: "hsl(289 36% 26% / 0.12)", color: "#522B5B", border: "1px solid hsl(289 36% 26% / 0.2)" }}>
                              {task.assignee_name ? task.assignee_name.split(" ").map(n => n[0]).join("") : "?"}
                            </div>
                            <div onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu
                                value={task.assigned_to ? String(task.assigned_to) : "__unassigned"}
                                onValueChange={(value) => handleAssigneeChange(task.id, value === "__unassigned" ? undefined : Number(value))}
                                options={[
                                  { value: "__unassigned", label: "Unassigned", icon: <span className="text-muted-foreground">◌</span>, disabled: user?.role !== "admin" },
                                  ...employeeOptions.map(option => ({
                                    ...option,
                                    disabled: user?.role !== "admin"
                                  })),
                                ]}
                                placeholder="Assignee"
                                triggerClassName="w-[180px] rounded-xl px-2.5 py-1.5 text-sm font-medium text-card-foreground"
                              />
                            </div>
                          </div>
                        </td>
                        <td className={`py-3.5 px-4 text-card-foreground text-xs font-medium whitespace-nowrap ${isColumnVisible("dueDate") ? "" : "hidden"}`}>
                          <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                            {canManageTasks ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="date"
                                  value={task.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : ""}
                                  onChange={(e) => {
                                    void handleSubtaskDateChange(task.id, "due_date", e.target.value);
                                  }}
                                  className="w-[140px] rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                                />
                                {task.due_date && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleSubtaskDateChange(task.id, "due_date", "");
                                    }}
                                    className="text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span>{formatDate(task.due_date)}</span>
                            )}
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getTimelineChipClass(getTimelineChip(task).tone)}`}>
                              {getTimelineChip(task).label}
                            </span>
                          </div>
                        </td>
                        <td className={`py-3.5 px-4 text-center whitespace-nowrap ${canManageTasks && isColumnVisible("actions") ? "" : "hidden"}`}>
                          {canManageTasks && (
                            <div className="flex items-center justify-center gap-3">
                              <button onClick={(e) => { e.stopPropagation(); handleOpenEditTask(task); }} className="text-primary hover:text-primary/80 text-xs">Edit</button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} className="text-red-500 hover:text-red-600 text-xs">Delete</button>
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Subtasks expansion */}
                      {expandedTasks.has(task.id) && (
                        loadingSubtasksFor.has(task.id) ? (
                          <tr>
                            <td colSpan={13} className="py-3 px-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Loader2 size={13} className="animate-spin" /> Loading subtasks…
                              </div>
                            </td>
                          </tr>
                        ) : taskChildren[task.id]?.length > 0 ? (
                          renderSubtaskRows(buildSubtaskTree(taskChildren[task.id]), task)
                        ) : (
                          <tr>
                            <td colSpan={13} className="py-3 px-4 text-center text-muted-foreground text-xs">No subtasks yet. Click &ldquo;+&rdquo; next to the task name to create one.</td>
                          </tr>
                        )
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={13} className="py-10 text-center text-muted-foreground">
                      {searchQuery ? "No projects match your search" : "No projects yet"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Create Project Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl bg-card border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                Create New Project
              </h2>
              <button onClick={closeCreateModal} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4">
              {[
                { label: "Title *", name: "title", type: "text", placeholder: "Project title", required: true },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-sm font-semibold mb-1 text-foreground">{f.label}</label>
                  <input type={f.type} value={(newTask as any)[f.name] || ""} onChange={e => setNewTask({ ...newTask, [f.name]: e.target.value })} className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder={f.placeholder} required={f.required} />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Description</label>
                <textarea value={newTask.description || ""} onChange={e => setNewTask({ ...newTask, description: e.target.value })} className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" rows={3} />
              </div>
              <div className="rounded-xl border border-border/80 bg-primary/[0.03] dark:bg-white/[0.02] p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-semibold text-foreground">Voice Note (optional)</label>
                  {isRecordingVoice && (
                    <span className="text-xs font-medium text-red-500">
                      Recording... {formatVoiceTime(voiceRecordingSec)} / {formatVoiceTime(MAX_VOICE_NOTE_SECONDS)}
                    </span>
                  )}
                </div>

                {!isRecordingVoice && !voiceNoteBlob && (
                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Mic size={16} className="text-primary" />
                    Record Voice Note
                  </button>
                )}

                {isRecordingVoice && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={stopVoiceRecording}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/20 transition-colors"
                    >
                      <Square size={14} /> Stop
                    </button>
                  </div>
                )}

                {!isRecordingVoice && voiceNoteBlob && (
                  <div className="space-y-3">
                    <div className="text-xs text-muted-foreground">
                      {formatVoiceTime(voiceNoteDurationSec || voiceRecordingSec)} captured
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleVoicePlayPause}
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                      >
                        {isPlayingVoice ? <Pause size={14} /> : <Play size={14} />}
                        {isPlayingVoice ? "Pause" : "Play"}
                      </button>
                      <button
                        type="button"
                        onClick={resetVoiceNote}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                      <button
                        type="button"
                        onClick={startVoiceRecording}
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <RotateCcw size={14} /> Re-record
                      </button>
                    </div>
                    {voiceNoteTranscriptPreview && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Transcript: {voiceNoteTranscriptPreview}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-foreground">Workspace *</label>
                  <DropdownMenu
                    value={newTask.workspace_id ? String(newTask.workspace_id) : ""}
                    onValueChange={(value) => setNewTask({ ...newTask, workspace_id: value ? Number(value) : 0 })}
                    options={workspaceSelectOptions}
                    placeholder="Select workspace"
                    triggerClassName="w-full"
                  />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-foreground">Priority</label>
                  <DropdownMenu
                    value={newTask.priority || "medium"}
                    onValueChange={(value) => setNewTask({ ...newTask, priority: value as any })}
                    options={priorityOptions}
                    placeholder="Priority"
                    triggerClassName="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-foreground">Due Date *</label>
                  <input type="date" value={newTask.due_date || ""} onChange={e => setNewTask({ ...newTask, due_date: e.target.value || undefined })} className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none" required />
                </div>
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-sm font-semibold mb-1 text-foreground">Assign To *</label>
                  <DropdownMenu
                    value={newTask.assigned_to ? String(newTask.assigned_to) : ""}
                    onValueChange={(value) => setNewTask({ ...newTask, assigned_to: value ? Number(value) : undefined })}
                    options={employeeOptions}
                    placeholder="Select team member"
                    triggerClassName="w-full"
                  />
                </div>
              )}
              {isAdmin && (
                <div>
                  <label className="block text-sm font-semibold mb-1 text-foreground">Reporter *</label>
                  <DropdownMenu
                    value={newTask.assigned_by ? String(newTask.assigned_by) : (user?.id ? String(user.id) : "")}
                    onValueChange={(value) => setNewTask({ ...newTask, assigned_by: value ? Number(value) : undefined })}
                    options={employeeOptions}
                    placeholder="Select reporter"
                    triggerClassName="w-full"
                  />
                </div>
              )}
              {isAdmin && (
                <div className="rounded-xl border border-border/80 bg-primary/[0.03] dark:bg-white/[0.02] p-4 space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!newTask.is_recurring}
                      onChange={e => setNewTask({ ...newTask, is_recurring: e.target.checked })}
                      className="rounded border-border"
                    />
                    <Repeat size={16} className="text-amber-500" />
                    Repeat task (recurring)
                  </label>
                  {newTask.is_recurring && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Frequency</label>
                          <DropdownMenu
                            value={newTask.recurrence_type || "weekly"}
                            onValueChange={(value) => setNewTask({ ...newTask, recurrence_type: value as any })}
                            options={recurringFrequencyOptions}
                            placeholder="Frequency"
                            triggerClassName="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Every (interval)</label>
                          <input
                            type="number"
                            min={1}
                            max={52}
                            value={newTask.recurrence_interval || 1}
                            onChange={e => setNewTask({ ...newTask, recurrence_interval: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                            className="w-full rounded-lg py-2 px-2 text-sm bg-background border border-border"
                          />
                        </div>
                      </div>
                      {newTask.recurrence_type === "weekly" && (
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-2">On weekdays</label>
                          <div className="flex flex-wrap gap-1.5">
                            {WEEKDAY_OPTS.map(({ v, l }) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => toggleRepeatDay(v)}
                                className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                                  (newTask.repeat_days || []).includes(v)
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background border-border text-muted-foreground hover:border-primary/40"
                                }`}
                              >
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {newTask.recurrence_type === "monthly" && (
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Day of month (1–31)</label>
                          <input
                            type="number"
                            min={1}
                            max={31}
                            value={newTask.monthly_day ?? ""}
                            placeholder="e.g. 15"
                            onChange={e => setNewTask({ ...newTask, monthly_day: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                            className="w-full rounded-lg py-2 px-2 text-sm bg-background border border-border"
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Series start</label>
                          <input
                            type="date"
                            value={newTask.recurrence_start_date || newTask.due_date || ""}
                            onChange={e => setNewTask({ ...newTask, recurrence_start_date: e.target.value || undefined })}
                            className="w-full rounded-lg py-2 px-2 text-sm bg-background border border-border"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Series end (optional)</label>
                          <input
                            type="date"
                            value={newTask.recurrence_end_date || ""}
                            onChange={e => setNewTask({ ...newTask, recurrence_end_date: e.target.value || undefined })}
                            className="w-full rounded-lg py-2 px-2 text-sm bg-background border border-border"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeCreateModal} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={isCreating || isUploadingVoice || isRecordingVoice} className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {isCreating || isUploadingVoice ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create Subtask Modal ── */}
      {showSubtaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <ListTree size={20} className="text-primary" /> {selectedParentSubtaskId ? "Create Sub-Subtask" : "Create Subtask"}
              </h2>
              <button onClick={() => { setShowSubtaskModal(false); setNewSubtask({ title: "", description: "", assigned_to: undefined }); setSelectedParentSubtaskId(null); }} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateSubtask} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-foreground">Title *</label>
                <input type="text" value={newSubtask.title} onChange={e => setNewSubtask({ ...newSubtask, title: e.target.value })} className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="Subtask title" required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-foreground">Description</label>
                <textarea value={newSubtask.description || ""} onChange={e => setNewSubtask({ ...newSubtask, description: e.target.value })} className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-foreground">Assign To *</label>
                <DropdownMenu
                  value={newSubtask.assigned_to ? String(newSubtask.assigned_to) : ""}
                  onValueChange={(value) => setNewSubtask({ ...newSubtask, assigned_to: value ? Number(value) : undefined })}
                  options={employeeOptions}
                  placeholder="Select team member"
                  triggerClassName="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-foreground">Reporter *</label>
                <DropdownMenu
                  value={newSubtask.assigned_by ? String(newSubtask.assigned_by) : (user?.id ? String(user.id) : "")}
                  onValueChange={(value) => setNewSubtask({ ...newSubtask, assigned_by: value ? Number(value) : undefined })}
                  options={employeeOptions}
                  placeholder="Select reporter"
                  triggerClassName="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-foreground">Due Date *</label>
                <input
                  type="date"
                  value={newSubtask.due_date || ""}
                  onChange={(e) => setNewSubtask({ ...newSubtask, due_date: e.target.value || undefined })}
                  className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowSubtaskModal(false); setNewSubtask({ title: "", description: "", assigned_to: undefined, assigned_by: user?.id, due_date: undefined }); setSelectedParentSubtaskId(null); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={isCreatingSubtask} className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {isCreatingSubtask ? <Loader2 className="h-4 w-4 animate-spin" /> : (selectedParentSubtaskId ? "Create Sub-Subtask" : "Create Subtask")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Task Modal ── */}
      {showEditTaskModal && selectedTaskForEdit && editingTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl bg-card border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-foreground"><Link size={20} className="text-primary" /> Edit Task</h2>
              <button onClick={() => { resetEditVoiceNote(); releaseEditVoiceRecorderResources(); setShowEditTaskModal(false); setSelectedTaskForEdit(null); setEditingTaskForm(null); }} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm font-medium text-foreground">{selectedTaskForEdit.title}</p>
            </div>
            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-foreground">Task Name *</label>
                  <input
                    type="text"
                    value={editingTaskForm.title}
                    onChange={(e) => setEditingTaskForm({ ...editingTaskForm, title: e.target.value })}
                    className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="Task title"
                    required
                  />
                </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-foreground">Workspace *</label>
                    <DropdownMenu
                      value={String(editingTaskForm.workspace_id)}
                      onValueChange={(value) => setEditingTaskForm({ ...editingTaskForm, workspace_id: Number(value) })}
                      options={workspaceSelectOptions}
                      placeholder="Workspace"
                      triggerClassName="w-full"
                    />
                  </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-foreground">Description</label>
                <textarea
                  value={editingTaskForm.description || ""}
                  onChange={(e) => setEditingTaskForm({ ...editingTaskForm, description: e.target.value })}
                  className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  rows={3}
                />
              </div>
              {!selectedTaskForEdit.voice_note_url && !editingTaskForm.voice_note_url && (
                <div className="rounded-xl border border-border/80 bg-primary/[0.03] dark:bg-white/[0.02] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-semibold text-foreground">Voice Note (optional)</label>
                    {isRecordingEditVoice && (
                      <span className="text-xs font-medium text-red-500">
                        Recording... {formatVoiceTime(editVoiceRecordingSec)} / {formatVoiceTime(MAX_VOICE_NOTE_SECONDS)}
                      </span>
                    )}
                  </div>

                  {!isRecordingEditVoice && !editVoiceNoteBlob && (
                    <button
                      type="button"
                      onClick={startEditVoiceRecording}
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <Mic size={16} className="text-primary" />
                      Record Voice Note
                    </button>
                  )}

                  {isRecordingEditVoice && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={stopEditVoiceRecording}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/20 transition-colors"
                      >
                        <Square size={14} /> Stop
                      </button>
                    </div>
                  )}

                  {!isRecordingEditVoice && editVoiceNoteBlob && (
                    <div className="space-y-3">
                      <div className="text-xs text-muted-foreground">
                        {formatVoiceTime(editVoiceNoteDurationSec || editVoiceRecordingSec)} captured. This will be attached when you save.
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleEditVoicePlayPause}
                          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                        >
                          {isPlayingEditVoice ? <Pause size={14} /> : <Play size={14} />}
                          {isPlayingEditVoice ? "Pause" : "Play"}
                        </button>
                        <button
                          type="button"
                          onClick={resetEditVoiceNote}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                        <button
                          type="button"
                          onClick={startEditVoiceRecording}
                          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                        >
                          <RotateCcw size={14} /> Re-record
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-foreground">Priority</label>
                  <DropdownMenu
                    value={editingTaskForm.priority || "medium"}
                    onValueChange={(value) => setEditingTaskForm({ ...editingTaskForm, priority: value as any })}
                    options={priorityOptions}
                    placeholder="Priority"
                    triggerClassName="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-foreground">Status</label>
                  <DropdownMenu
                    value={editingTaskForm.status || selectedTaskForEdit.status}
                    onValueChange={(value) => setEditingTaskForm({ ...editingTaskForm, status: value as Task["status"] })}
                    options={taskAdminStatusOptions}
                    placeholder="Status"
                    disabled={!['submitted', 'reviewing', 'approved', 'rejected'].includes(editingTaskForm.status || selectedTaskForEdit.status)}
                    triggerClassName="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-foreground">Due Date</label>
                  <input
                    type="date"
                    value={editingTaskForm.due_date || ""}
                    onChange={(e) => setEditingTaskForm({ ...editingTaskForm, due_date: e.target.value || undefined })}
                    className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none"
                  />
                </div>
              </div>
              {isAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-foreground">Assignee</label>
                    <DropdownMenu
                      value={editingTaskForm.assigned_to ? String(editingTaskForm.assigned_to) : "__unassigned"}
                      onValueChange={(value) => setEditingTaskForm({ ...editingTaskForm, assigned_to: value === "__unassigned" ? undefined : Number(value) })}
                      options={[
                        { value: "__unassigned", label: "Unassigned", icon: <span className="text-muted-foreground">◌</span> },
                        ...employeeOptions,
                      ]}
                      placeholder="Assignee"
                      triggerClassName="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-foreground">Reporter</label>
                    <DropdownMenu
                      value={String(editingTaskForm.assigned_by || selectedTaskForEdit.assigned_by)}
                      onValueChange={(value) => setEditingTaskForm({ ...editingTaskForm, assigned_by: Number(value) })}
                      options={employeeOptions}
                      placeholder="Reporter"
                      triggerClassName="w-full"
                    />
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-border/80 bg-primary/[0.03] dark:bg-white/[0.02] p-4 space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editingTaskForm.is_recurring}
                    onChange={(e) => setEditingTaskForm({ ...editingTaskForm, is_recurring: e.target.checked })}
                    className="rounded border-border"
                  />
                  <Repeat size={16} className="text-amber-500" />
                  Repeat task (recurring)
                </label>
                {editingTaskForm.is_recurring && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Frequency</label>
                        <DropdownMenu
                          value={editingTaskForm.recurrence_type || "weekly"}
                          onValueChange={(value) => setEditingTaskForm({ ...editingTaskForm, recurrence_type: value as any })}
                          options={recurringFrequencyOptions}
                          placeholder="Frequency"
                          triggerClassName="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Every (interval)</label>
                        <input
                          type="number"
                          min={1}
                          max={52}
                          value={editingTaskForm.recurrence_interval || 1}
                          onChange={(e) => setEditingTaskForm({ ...editingTaskForm, recurrence_interval: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                          className="w-full rounded-lg py-2 px-2 text-sm bg-background border border-border"
                        />
                      </div>
                    </div>
                    {editingTaskForm.recurrence_type === "weekly" && (
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2">On weekdays</label>
                        <div className="flex flex-wrap gap-1.5">
                          {WEEKDAY_OPTS.map(({ v, l }) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => {
                                const cur = new Set(editingTaskForm.repeat_days || []);
                                if (cur.has(v)) cur.delete(v);
                                else cur.add(v);
                                setEditingTaskForm({ ...editingTaskForm, repeat_days: Array.from(cur).sort((a, b) => a - b) });
                              }}
                              className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                                (editingTaskForm.repeat_days || []).includes(v)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background border-border text-muted-foreground hover:border-primary/40"
                              }`}
                            >
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {editingTaskForm.recurrence_type === "monthly" && (
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Day of month (1–31)</label>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={editingTaskForm.monthly_day ?? ""}
                          placeholder="e.g. 15"
                          onChange={(e) => setEditingTaskForm({ ...editingTaskForm, monthly_day: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                          className="w-full rounded-lg py-2 px-2 text-sm bg-background border border-border"
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Series start</label>
                        <input
                          type="date"
                          value={editingTaskForm.recurrence_start_date || editingTaskForm.due_date || ""}
                          onChange={(e) => setEditingTaskForm({ ...editingTaskForm, recurrence_start_date: e.target.value || undefined })}
                          className="w-full rounded-lg py-2 px-2 text-sm bg-background border border-border"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Series end (optional)</label>
                        <input
                          type="date"
                          value={editingTaskForm.recurrence_end_date || ""}
                          onChange={(e) => setEditingTaskForm({ ...editingTaskForm, recurrence_end_date: e.target.value || undefined })}
                          className="w-full rounded-lg py-2 px-2 text-sm bg-background border border-border"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { resetEditVoiceNote(); releaseEditVoiceRecorderResources(); setShowEditTaskModal(false); setSelectedTaskForEdit(null); setEditingTaskForm(null); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={isUpdatingTask || isRecordingEditVoice || isUploadingEditVoice} className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors">
                  {isUpdatingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                  {isUpdatingTask || isUploadingEditVoice ? "Saving..." : "Save Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMounted && selectedSubtaskForPanel && selectedSubtaskRootTaskForPanel && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-5xl rounded-2xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">Edit Subtask</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Parent task: {selectedSubtaskRootTaskForPanel.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSubtaskForPanel(null);
                  setSelectedSubtaskRootTaskForPanel(null);
                  setSubtaskComments([]);
                  setNewSubtaskComment("");
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close subtask panel"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
              <div className="lg:col-span-2 border-b lg:border-b-0 lg:border-r border-border p-5 space-y-4 overflow-y-auto max-h-[72vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Title</label>
                    <input
                      type="text"
                      value={detailDraft.title}
                      onChange={(e) => setDetailDraft((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder="Subtask title"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Description</label>
                    <textarea
                      value={detailDraft.description}
                      onChange={(e) => setDetailDraft((prev) => ({ ...prev, description: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      rows={3}
                      placeholder="Subtask description"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Priority</label>
                    <DropdownMenu
                      value={detailDraft.priority}
                      onValueChange={(value) => setDetailDraft((prev) => ({ ...prev, priority: value as Task["priority"] }))}
                      options={priorityOptions}
                      placeholder="Priority"
                      triggerClassName="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Status</label>
                    <DropdownMenu
                      value={detailDraft.status}
                      onValueChange={(value) => setDetailDraft((prev) => ({ ...prev, status: value as SubtaskDraftStatus }))}
                      options={isAdmin ? taskAdminStatusOptions : employeeStatusOptions}
                      placeholder="Status"
                      triggerClassName="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Assignee</label>
                    <DropdownMenu
                      value={detailDraft.assigned_to}
                      onValueChange={(value) => setDetailDraft((prev) => ({ ...prev, assigned_to: value }))}
                      options={[
                        { value: "__unassigned", label: "Unassigned", icon: <span className="text-muted-foreground">◌</span> },
                        ...employeeOptions,
                      ]}
                      placeholder="Assignee"
                      triggerClassName="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Reporter</label>
                    <DropdownMenu
                      value={detailDraft.assigned_by}
                      onValueChange={(value) => setDetailDraft((prev) => ({ ...prev, assigned_by: value }))}
                      options={employeeOptions}
                      placeholder="Reporter"
                      triggerClassName="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Due Date</label>
                    <input
                      type="date"
                      value={detailDraft.due_date}
                      onChange={(e) => setDetailDraft((prev) => ({ ...prev, due_date: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Completed At</label>
                    <input
                      type="date"
                      value={detailDraft.completed_at}
                      onChange={(e) => setDetailDraft((prev) => ({ ...prev, completed_at: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubtaskForPanel(null);
                      setSelectedSubtaskRootTaskForPanel(null);
                      setSubtaskComments([]);
                      setNewSubtaskComment("");
                    }}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={saveTaskDetails}
                    disabled={isDetailSaving}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {isDetailSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {isDetailSaving ? "Saving..." : "Save Subtask"}
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-3 overflow-y-auto max-h-[72vh]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Comments</h3>
                  {loadingSubtaskComments && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
                </div>

                <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
                  {subtaskComments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No comments yet.</p>
                  ) : (
                    subtaskComments.map((comment) => (
                      <div key={comment.id} className="rounded-lg border border-border bg-background/60 p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-foreground">{comment.user_name || "Unknown"}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {comment.created_at ? new Date(comment.created_at).toLocaleString("en-IN") : ""}
                            </p>
                          </div>
                          {(isAdmin || comment.user_id === user?.id) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSubtaskComment(comment.id)}
                              disabled={deletingCommentId === comment.id}
                              className="text-[11px] font-semibold text-red-500 hover:text-red-600 disabled:opacity-60"
                            >
                              {deletingCommentId === comment.id ? "Deleting..." : "Delete"}
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-foreground whitespace-pre-wrap">{comment.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  <textarea
                    value={newSubtaskComment}
                    onChange={(e) => setNewSubtaskComment(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    rows={3}
                    placeholder="Write a comment..."
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtaskComment}
                    disabled={isCommentSaving || !newSubtaskComment.trim()}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    {isCommentSaving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    {isCommentSaving ? "Adding..." : "Add Comment"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </ProjectShell>
  );
}
