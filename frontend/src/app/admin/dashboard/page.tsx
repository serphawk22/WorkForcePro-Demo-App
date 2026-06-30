"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { 
  Users, UserCheck, Calendar, Clock, AlertCircle, 
  ListTodo, Target, CalendarDays, Loader2, Award, Copy, ArrowRight,
  Video, Link2, Trash2, Send, Github, ExternalLink, FileText
} from "lucide-react";
import { fetchAdminDashboard, fetchAllUsers, getAllTasks, getAllLeaveRequests, getTaskStats, AdminDashboardStats, TaskStats, shareMeetingLink, getActiveMeeting, removeMeetingLink, TeamsMeeting, Task, LeaveRequest, User, getAllTeamHappySheets, HappySheetEntry, getMyPersonalProjects, PersonalProjectEntry } from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Priority badge colors
const priorityColors: Record<string, string> = {
  high: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  medium: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  low: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
};

const premiumCardBase =
  "group relative bg-card rounded-2xl border border-border transition-all duration-200 hover:border-foreground/20 hover:shadow-sm";

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = globalThis.setTimeout(() => reject(new Error(`${label} request timed out`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== null) {
      globalThis.clearTimeout(timeoutId);
    }
  }
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [activeUsersCount, setActiveUsersCount] = useState<number | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allLeaveRequests, setAllLeaveRequests] = useState<LeaveRequest[]>([]);
  const [teamHappySheets, setTeamHappySheets] = useState<HappySheetEntry[]>([]);
  const [personalProjects, setPersonalProjects] = useState<PersonalProjectEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  // Teams meeting state
  const [activeMeeting, setActiveMeeting] = useState<TeamsMeeting | null>(null);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [isSharingMeeting, setIsSharingMeeting] = useState(false);
  const [isRemovingMeeting, setIsRemovingMeeting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dashboardResult, taskResult, meetingResult] = await Promise.allSettled([
        withTimeout(fetchAdminDashboard(), 6000, "Admin dashboard"),
        withTimeout(getTaskStats(), 6000, "Task stats"),
        withTimeout(getActiveMeeting(), 6000, "Active meeting"),
      ]);

      if (dashboardResult.status === "fulfilled" && dashboardResult.value.data) {
        setStats(dashboardResult.value.data);
      }
      if (taskResult.status === "fulfilled" && taskResult.value.data) {
        setTaskStats(taskResult.value.data);
      }
      if (meetingResult.status === "fulfilled" && meetingResult.value.data !== undefined) {
        setActiveMeeting(meetingResult.value.data);
      }

      // Release the page as soon as the core summary area is ready.
      setIsLoading(false);

      const [tasksResult, leaveRequestsResult, usersResult, happySheetsResult, personalProjectsResult] = await Promise.allSettled([
        withTimeout(getAllTasks(), 5000, "Tasks"),
        withTimeout(getAllLeaveRequests(), 5000, "Leave requests"),
        withTimeout(fetchAllUsers(), 5000, "Users"),
        withTimeout(getAllTeamHappySheets(100), 5000, "Happy sheets"),
        withTimeout(getMyPersonalProjects(50), 5000, "Personal projects"),
      ]);

      if (usersResult.status === "fulfilled" && usersResult.value.data) {
        setActiveUsersCount(usersResult.value.data.length);
        setAllUsers(usersResult.value.data);
      }
      if (tasksResult.status === "fulfilled" && tasksResult.value.data) {
        setAllTasks(tasksResult.value.data);
      }
      if (leaveRequestsResult.status === "fulfilled" && leaveRequestsResult.value.data) {
        setAllLeaveRequests(leaveRequestsResult.value.data);
      }
      if (happySheetsResult.status === "fulfilled" && happySheetsResult.value.data) {
        setTeamHappySheets(happySheetsResult.value.data);
      }
      if (personalProjectsResult.status === "fulfilled" && personalProjectsResult.value.data) {
        setPersonalProjects(personalProjectsResult.value.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleShareMeeting = async () => {
    if (!meetingTitle.trim() || !meetingLink.trim()) {
      toast.error("Please enter both a title and a meeting link.");
      return;
    }
    setIsSharingMeeting(true);
    try {
      const result = await shareMeetingLink({ title: meetingTitle.trim(), meeting_link: meetingLink.trim() });
      if (result.data) {
        setActiveMeeting(result.data);
        setMeetingTitle("");
        setMeetingLink("");
        toast.success("Teams meeting link shared with all employees!");
      } else {
        toast.error(result.error || "Failed to share meeting link.");
      }
    } finally {
      setIsSharingMeeting(false);
    }
  };

  const handleRemoveMeeting = async () => {
    setIsRemovingMeeting(true);
    try {
      const result = await removeMeetingLink();
      if (result.data) {
        setActiveMeeting(null);
        toast.success("Meeting link removed.");
      } else {
        toast.error(result.error || "Failed to remove meeting link.");
      }
    } finally {
      setIsRemovingMeeting(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // Calculate attendance metrics
  const totalEmployees = (activeUsersCount ?? stats?.total_employees) || 0;
  const activeSessions = stats?.active_sessions || 0;
  const presentToday = activeSessions;
  const onLeave = stats?.employees_on_leave_today ?? 0;
  const absent = Math.max(0, totalEmployees - presentToday - onLeave);
  const lateCheckins = stats?.late_checkins_today ?? 0;
  const activeTasks = stats?.active_tasks_count ?? stats?.pending_tasks ?? 0;

  // Task completion rate
  const totalTasks = stats?.total_tasks_count || 0;
  const completedTasks = taskStats?.approved || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const upcomingTasks = stats?.upcoming_tasks || [];
  const currentUserId = user?.id ?? null;
  const todayKey = now.toDateString();
  const isToday = (value?: string | null) => Boolean(value && new Date(value).toDateString() === todayKey);

  const greetingHour = now.getHours();
  const greetingLabel = greetingHour < 12 ? "Good Morning" : greetingHour < 18 ? "Good Afternoon" : "Good Evening";

  const pendingApprovals = stats?.pending_tasks ?? 0;
  const newRequests = stats?.leave_requests_pending ?? 0;
  const tasksDueToday = allTasks.filter((task) => isToday(task.due_date) && task.status !== "approved" && task.status !== "rejected").length;
  const projectsInProgress = allTasks.filter((task) => !task.parent_task_id && task.status !== "approved" && task.status !== "rejected").length;

  const approvalsDoneToday = allLeaveRequests.filter((request) => request.reviewed_by === currentUserId && request.status === "approved" && isToday(request.reviewed_at)).length;
  const projectsCreatedToday = allTasks.filter((task) => task.assigned_by === currentUserId && isToday(task.created_at)).length;
  const employeesAddedToday = allUsers.filter((member) => member.id !== currentUserId && member.approved_by === currentUserId && isToday(member.approved_at || member.created_at)).length;

  const employeeCount = allUsers.filter((member) => member.role === "employee").length || totalEmployees;
  const happySheetsTodayEntries = teamHappySheets.filter((entry) => isToday(entry.created_at || entry.date));
  const submissionsToday = new Set(happySheetsTodayEntries.map((entry) => entry.user_id)).size;
  const participationRate = employeeCount > 0 ? Math.round((submissionsToday / employeeCount) * 100) : 0;

  const sortedHappySheets = [...teamHappySheets].sort(
    (a, b) => +new Date(b.created_at || `${b.date}T00:00:00`) - +new Date(a.created_at || `${a.date}T00:00:00`)
  );
  const latestHappySheetEntry = sortedHappySheets[0] || null;
  const recentHappySheetEntries = sortedHappySheets.slice(0, 3);

  const themeSignals = [
    { label: "Collaboration", keywords: ["team", "help", "support", "collabor", "mentor", "onboard"] },
    { label: "Delivery", keywords: ["deploy", "release", "ship", "complete", "launch"] },
    { label: "Learning", keywords: ["learn", "improve", "study", "practice", "skill"] },
    { label: "Problem Solving", keywords: ["fix", "debug", "resolve", "issue", "bug"] },
    { label: "Ownership", keywords: ["ownership", "initiative", "lead", "responsible", "drive"] },
  ];

  const moodSourceEntries = happySheetsTodayEntries.length > 0 ? happySheetsTodayEntries : recentHappySheetEntries;
  const moodSourceText = moodSourceEntries
    .map((entry) => [entry.what_made_you_happy, entry.what_made_others_happy, entry.goals_without_greed, entry.dreams_supported].join(" ").toLowerCase())
    .join(" ");

  const dominantTheme = themeSignals
    .map((theme) => ({
      label: theme.label,
      score: theme.keywords.reduce((count, word) => count + (moodSourceText.includes(word) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score)[0];

  const lighthouseGroups: Record<"old" | "current" | "future", PersonalProjectEntry[]> = {
    old: personalProjects.filter((project) => project.stage === "old"),
    current: personalProjects.filter((project) => project.stage === "current"),
    future: personalProjects.filter((project) => project.stage === "future"),
  };

  const prioritySummaryCards = [
    {
      title: "Pending Approvals",
      value: pendingApprovals,
      subtitle: "Tasks waiting for review",
      valueTone: "text-foreground",
      redirectUrl: "/project-management?status=reviewing",
    },
    {
      title: "New Requests",
      value: newRequests,
      subtitle: "Leave requests submitted today",
      valueTone: "text-foreground",
      redirectUrl: "/requests",
    },
    {
      title: "Tasks Due Today",
      value: tasksDueToday,
      subtitle: "Need attention before day end",
      valueTone: "text-foreground",
      redirectUrl: "/tasks",
    },
    {
      title: "Projects In Progress",
      value: projectsInProgress,
      subtitle: "Active projects still moving",
      valueTone: "text-foreground",
      redirectUrl: "/project-management",
    },
    {
      title: "Team Productivity",
      value: `${completionRate}%`,
      subtitle: `${completedTasks}/${totalTasks || 0} tasks approved`,
      valueTone: "text-foreground",
      redirectUrl: "/project-management/reports",
    },
  ];

  const quickActions = [
    {
      label: "Add Employee",
      description: "Invite a new team member",
      icon: Users,
      onClick: () => router.push("/employees"),
    },
    {
      label: "Create Workspace",
      description: "Set up a new project space",
      icon: ListTodo,
      onClick: () => router.push("/project-management"),
    },
    {
      label: "Create Project",
      description: "Open the project creator",
      icon: Target,
      onClick: () => router.push("/project-management/projects"),
    },
    {
      label: "Approve Requests",
      description: "Review pending leave requests",
      icon: Calendar,
      onClick: () => router.push("/requests"),
    },
  ];

  const activityCards = [
    {
      label: "Approvals Done Today",
      value: approvalsDoneToday,
      helpText: "Your approvals only",
      valueTone: "text-foreground",
      redirectUrl: "/requests",
    },
    {
      label: "Projects Created",
      value: projectsCreatedToday,
      helpText: "Created by you today",
      valueTone: "text-foreground",
      redirectUrl: "/project-management/projects",
    },
    {
      label: "Employees Added",
      value: employeesAddedToday,
      helpText: "Accounts added by you",
      valueTone: "text-foreground",
      redirectUrl: "/employees",
    },
  ];

  const teamSnapshotCards = [
    {
      title: "Employees Present Today",
      value: presentToday,
      icon: UserCheck,
      redirectUrl: "/attendance",
      valueTone: "text-foreground",
    },
    {
      title: "On Leave",
      value: onLeave,
      icon: Calendar,
      redirectUrl: "/attendance?filter=leave",
      valueTone: "text-foreground",
    },
    {
      title: "Late Check-ins",
      value: lateCheckins,
      icon: AlertCircle,
      redirectUrl: "/attendance?filter=late",
      valueTone: "text-foreground",
    },
    {
      title: "Pending Requests",
      value: newRequests,
      icon: Clock,
      redirectUrl: "/requests",
      valueTone: "text-foreground",
    },
  ];

  const handleCopyRefId = (refId: string) => {
    navigator.clipboard.writeText(refId).then(() => toast.success(`Copied ${refId}`));
  };

  // Department performance derived from real task stats
  const deptPerformance = [
    { dept: "Approved", completion: taskStats?.approved || 0, color: "bg-emerald-500" },
    { dept: "In Progress", completion: taskStats?.in_progress || 0, color: "bg-blue-500" },
    { dept: "Reviewing", completion: taskStats?.reviewing || 0, color: "bg-amber-500" },
    { dept: "To Do", completion: taskStats?.todo || 0, color: "bg-zinc-400" },
    { dept: "Rejected", completion: taskStats?.rejected || 0, color: "bg-red-500" },
  ].filter(d => d.completion > 0);

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout role="admin" userName={user?.name || "Administrator"} userHandle={`@${user?.email?.split("@")[0] || "admin"}`}>
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 pb-8">
            <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 text-foreground">
              <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-3xl space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Admin Overview
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                    {greetingLabel},{" "}
                    <span className="text-foreground">
                      {user?.name || "Administrator"}
                    </span>
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                    Here&apos;s your personalized workforce snapshot for today. The cards below highlight what needs your attention, your most common actions, and the live status of the team.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-secondary/50 p-4">
                  <div className="rounded-xl border border-border bg-card px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Active Staff</p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">{totalEmployees}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Open Tasks</p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">{activeTasks}</p>
                  </div>
                  <div className="col-span-2 rounded-xl border border-border bg-card px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Today</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {prioritySummaryCards.map((card) => (
                <button
                  key={card.title}
                  type="button"
                  onClick={() => router.push(card.redirectUrl)}
                  className={`${premiumCardBase} p-5 text-left`}
                >
                  <div className="relative flex h-full flex-col justify-between gap-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Priority Summary</p>
                        <h2 className="mt-2 text-lg font-semibold text-foreground">{card.title}</h2>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-foreground shrink-0 ml-2" />
                    </div>
                    <div>
                      <p className={`text-3xl font-semibold ${card.valueTone}`}>{card.value}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{card.subtitle}</p>
                    </div>
                  </div>
                </button>
              ))}
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
                  <p className="text-sm text-muted-foreground">Jump straight to the most common admin flows.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      type="button"
                      onClick={action.onClick}
                      className={`${premiumCardBase} flex items-center justify-between px-4 py-4 text-left`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{action.label}</p>
                          <p className="text-xs text-muted-foreground">{action.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-foreground" />
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <article className={`${premiumCardBase} p-5`}>
                <div className="relative space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Happy Sheet</p>
                      <h3 className="mt-2 text-lg font-semibold text-foreground">Team Reflection Snapshot</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push("/my-space/happy-sheet")}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
                    >
                      Open
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-secondary/40 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Submissions Today</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {submissionsToday} / {employeeCount} employees
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/40 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Participation Rate</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">{participationRate}%</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Recent Entries</p>
                    {recentHappySheetEntries.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No submissions yet.</p>
                    ) : (
                      recentHappySheetEntries.map((entry) => (
                        <p key={entry.id} className="text-xs text-foreground line-clamp-1">
                          <span className="font-semibold text-foreground">{entry.user_name || `User #${entry.user_id}`}</span>
                          {" - "}
                          {(entry.what_made_you_happy || entry.what_made_others_happy || "Shared a reflection").slice(0, 56)}
                        </p>
                      ))
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-secondary/40 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Latest Submission</p>
                      <p className="mt-1 text-xs font-semibold text-foreground">
                        {latestHappySheetEntry
                          ? new Date(latestHappySheetEntry.created_at || `${latestHappySheetEntry.date}T00:00:00`).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }).replace(",", " -")
                          : "No entries yet"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/40 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Most Common Theme</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {dominantTheme?.score ? dominantTheme.label : "Positive"}
                      </p>
                    </div>
                  </div>
                </div>
              </article>

              <article className={`${premiumCardBase} p-5`}>
                <div className="relative space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">The Lighthouse</p>
                      <h3 className="mt-2 text-lg font-semibold text-foreground">Personal Projects</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-border bg-secondary/40 p-2.5 text-center">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Old</p>
                      <p className="mt-1 text-xl font-semibold text-foreground">{lighthouseGroups.old.length}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/40 p-2.5 text-center">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Current</p>
                      <p className="mt-1 text-xl font-semibold text-foreground">{lighthouseGroups.current.length}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/40 p-2.5 text-center">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Future</p>
                      <p className="mt-1 text-xl font-semibold text-foreground">{lighthouseGroups.future.length}</p>
                    </div>
                  </div>

                  {personalProjects.length === 0 ? (
                    <p className="text-xs text-muted-foreground rounded-xl border border-dashed border-border p-3">
                      Add your old/current/future projects in Lighthouse. You can include links, images, GitHub references, and writeups.
                    </p>
                  ) : (
                    <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-2">
                      <p className="text-xs font-semibold text-foreground">Latest project</p>
                      <p className="text-sm font-medium text-foreground line-clamp-1">{personalProjects[0].title}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {personalProjects[0].github_link && <span className="inline-flex items-center gap-1"><Github className="h-3.5 w-3.5" />GitHub</span>}
                        {personalProjects[0].demo_link && <span className="inline-flex items-center gap-1"><ExternalLink className="h-3.5 w-3.5" />Link</span>}
                        {personalProjects[0].image_url && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Image</span>}
                        {personalProjects[0].writeup && <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" />Writeup</span>}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              {activityCards.map((card) => (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => router.push(card.redirectUrl)}
                  className={`${premiumCardBase} p-5 text-left`}
                >
                  <div className="relative space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Your Admin Activity</p>
                        <h3 className="text-lg font-semibold text-foreground">{card.label}</h3>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-foreground shrink-0 ml-2" />
                    </div>
                    <p className={`text-3xl font-semibold ${card.valueTone}`}>{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.helpText}</p>
                  </div>
                </button>
              ))}
            </section>

            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-secondary text-foreground flex items-center justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Team Snapshot</h2>
                    <p className="text-xs text-muted-foreground">Today&apos;s attendance and request status</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground hidden md:block">
                  {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {teamSnapshotCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.title}
                      type="button"
                      onClick={() => router.push(card.redirectUrl)}
                      className={`${premiumCardBase} w-full p-4 text-left`}
                    >
                      <div className="relative space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
                            <Icon className="h-5 w-5" />
                          </span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${card.valueTone}`}>{card.value}</p>
                        <p className="text-sm font-medium text-foreground">{card.title}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-foreground" />
                      <h3 className="font-semibold text-foreground">Task Completion</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Overall:</span>
                      <span className="font-semibold text-foreground">{completionRate}%</span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-foreground rounded-full transition-all duration-500"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>{taskStats?.approved || 0} completed</span>
                      <span>{totalTasks} total tasks</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground mb-3">Task Status Breakdown</h4>
                    {deptPerformance.length > 0 ? deptPerformance.map((item, index) => (
                      <div key={index} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{item.dept}</span>
                          <span className="font-semibold text-foreground">{item.completion}</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.color} rounded-full transition-all duration-500`}
                            style={{ width: `${totalTasks > 0 ? Math.round((item.completion / totalTasks) * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    )) : (
                      <p className="text-xs text-muted-foreground py-2">No task data yet.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="p-5 border-b border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-5 w-5 text-foreground" />
                      <h3 className="font-semibold text-foreground">Upcoming Deadlines</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">Active projects nearest to due date</p>
                  </div>

                  <div className="p-5 space-y-3">
                    {upcomingTasks.length > 0 ? upcomingTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => router.push(`/project-management/${task.id}`)}
                        className="relative p-4 rounded-xl border border-border bg-secondary/40 hover:border-foreground/30 hover:bg-secondary transition-colors duration-200 cursor-pointer group"
                      >
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {task.public_id && (
                              <>
                                <span className="font-mono text-[10px] font-semibold bg-card text-foreground border border-border px-1.5 py-0.5 rounded shrink-0 tracking-wider">
                                  {task.public_id}
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCopyRefId(task.public_id); }}
                                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                                  title="Copy Ref ID"
                                  aria-label="Copy Ref ID"
                                >
                                  <Copy size={10} />
                                </button>
                              </>
                            )}
                            <h4 className="font-semibold text-sm text-foreground truncate">{task.title}</h4>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${priorityColors[task.priority] || priorityColors.medium}`}>
                            {task.priority}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground group-hover:text-foreground transition-colors">
                            <CalendarDays className="h-3 w-3" />
                            <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString('en-IN') : 'No date'}</span>
                          </div>
                          {task.assignee_name && (
                            <div className="flex items-center gap-1 text-muted-foreground group-hover:text-foreground transition-colors">
                              <Users className="h-3 w-3" />
                              <span>{task.assignee_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-8">
                        <ListTodo className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">Tasks with due dates will appear here</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <Video className="h-5 w-5 text-foreground" />
                    <h3 className="font-semibold text-foreground">Teams Meeting</h3>
                  </div>

                  {activeMeeting && (
                    <div className="mb-4 p-4 rounded-xl bg-secondary border border-border flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{activeMeeting.title}</p>
                        <a
                          href={activeMeeting.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-foreground hover:underline underline-offset-2 break-all"
                        >
                          {activeMeeting.meeting_link}
                        </a>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Shared by {activeMeeting.creator_name} · {new Date(activeMeeting.created_at).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={handleRemoveMeeting}
                        disabled={isRemovingMeeting}
                        className="shrink-0 p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        title="Remove meeting link"
                        aria-label="Remove meeting link"
                      >
                        {isRemovingMeeting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  )}

                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Meeting title (e.g. Weekly Standup)"
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                      className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                    />
                    <div className="flex gap-2">
                      <div className="flex-1 flex items-center gap-2 rounded-lg bg-background border border-border px-3 py-2">
                        <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <input
                          type="url"
                          placeholder="Paste Teams meeting link"
                          value={meetingLink}
                          onChange={(e) => setMeetingLink(e.target.value)}
                          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={handleShareMeeting}
                        disabled={isSharingMeeting || !meetingTitle.trim() || !meetingLink.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground text-sm font-medium transition-opacity"
                      >
                        {isSharingMeeting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {activeMeeting ? "Update" : "Share"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-foreground" />
                      <h3 className="font-semibold text-foreground">Overall Performance</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="h-24 w-24 rounded-full border-2 border-border bg-secondary flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-semibold text-foreground">87</div>
                          <div className="text-xs text-muted-foreground">Score</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Attendance Rate</span>
                        <span className="font-semibold text-foreground">92%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Task Completion</span>
                        <span className="font-semibold text-foreground">{completionRate}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">On-time Delivery</span>
                        <span className="font-semibold text-foreground">84%</span>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
