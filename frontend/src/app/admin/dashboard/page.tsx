"use client";

import { useEffect, useState, useCallback, type CSSProperties } from "react";
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
  high: "bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-400 border border-red-500/30 shadow-lg shadow-red-500/20",
  medium: "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-400 border border-yellow-500/30 shadow-lg shadow-yellow-500/20",
  low: "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30 shadow-lg shadow-green-500/20",
};

type AdminCardAccentStyle = CSSProperties & {
  "--admin-card-accent": string;
  "--admin-card-accent-secondary": string;
};

const adminCardAccentStyles: Record<"primary" | "blue", AdminCardAccentStyle> = {
  primary: {
    "--admin-card-accent": "328 60% 60%",
    "--admin-card-accent-secondary": "228 92% 66%",
  },
  blue: {
    "--admin-card-accent": "217 91% 60%",
    "--admin-card-accent-secondary": "191 91% 55%",
  },
};

const premiumCardBase =
  "admin-dashboard-card group relative overflow-hidden rounded-2xl border border-violet-200/70 bg-gradient-to-br from-white/95 via-violet-50/85 to-fuchsia-50/75 backdrop-blur-xl shadow-[0_16px_45px_rgba(109,40,217,0.14)] transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:border-violet-300/80 hover:shadow-[0_24px_70px_rgba(124,58,237,0.2)] active:translate-y-0 active:scale-[0.99] dark:border-white/10 dark:bg-white/8 dark:from-transparent dark:via-transparent dark:to-transparent dark:shadow-[0_18px_60px_rgba(8,6,20,0.28)] dark:hover:shadow-[0_24px_80px_rgba(124,58,237,0.22)]";

const premiumCardGlow =
  "absolute inset-0 bg-gradient-to-br opacity-80 transition-opacity duration-300 group-hover:opacity-100";

const fourSideEdgeGlow = (
  <>
    <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/55 to-transparent dark:via-white/45" />
    <div className="pointer-events-none absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/45 to-transparent dark:via-white/35" />
    <div className="pointer-events-none absolute inset-y-5 left-0 w-px bg-gradient-to-b from-transparent via-purple-400/45 to-transparent dark:via-white/35" />
    <div className="pointer-events-none absolute inset-y-5 right-0 w-px bg-gradient-to-b from-transparent via-sky-400/45 to-transparent dark:via-white/35" />
  </>
);

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
      const [dashboardResult, taskResult, meetingResult, tasksResult, leaveRequestsResult, usersResult, happySheetsResult, personalProjectsResult] = await Promise.all([
        fetchAdminDashboard(),
        getTaskStats(),
        getActiveMeeting(),
        getAllTasks(),
        getAllLeaveRequests(),
        fetchAllUsers(),
        getAllTeamHappySheets(100),
        getMyPersonalProjects(50),
      ]);

      if (usersResult.data) {
        setActiveUsersCount(usersResult.data.length);
        setAllUsers(usersResult.data);
      }
      if (tasksResult.data) {
        setAllTasks(tasksResult.data);
      }
      if (leaveRequestsResult.data) {
        setAllLeaveRequests(leaveRequestsResult.data);
      }
      if (happySheetsResult.data) {
        setTeamHappySheets(happySheetsResult.data);
      }
      if (personalProjectsResult.data) {
        setPersonalProjects(personalProjectsResult.data);
      }
      
      if (dashboardResult.data) {
        setStats(dashboardResult.data);
      }
      if (taskResult.data) {
        setTaskStats(taskResult.data);
      }
      if (meetingResult.data !== undefined) {
        setActiveMeeting(meetingResult.data);
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
  const greetingEmoji = greetingHour < 18 ? "☀️" : "🌙";

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
      accent: "from-violet-500/24 via-fuchsia-500/12 to-transparent dark:from-violet-500/20 dark:via-fuchsia-500/10",
      accentDark: "dark:from-violet-500/20 dark:via-fuchsia-500/10",
      valueTone: "text-fuchsia-600 dark:text-fuchsia-300",
      redirectUrl: "/project-management?status=reviewing",
    },
    {
      title: "New Requests",
      value: newRequests,
      subtitle: "Leave requests submitted today",
      accent: "from-sky-500/24 via-cyan-500/12 to-transparent dark:from-sky-500/20 dark:via-cyan-500/10",
      accentDark: "dark:from-sky-500/20 dark:via-cyan-500/10",
      valueTone: "text-sky-600 dark:text-sky-300",
      redirectUrl: "/requests",
    },
    {
      title: "Tasks Due Today",
      value: tasksDueToday,
      subtitle: "Need attention before day end",
      accent: "from-amber-500/24 via-yellow-500/12 to-transparent dark:from-amber-500/20 dark:via-yellow-500/10",
      accentDark: "dark:from-amber-500/20 dark:via-yellow-500/10",
      valueTone: "text-amber-600 dark:text-amber-300",
      redirectUrl: "/tasks",
    },
    {
      title: "Projects In Progress",
      value: projectsInProgress,
      subtitle: "Active projects still moving",
      accent: "from-emerald-500/24 via-green-500/12 to-transparent dark:from-emerald-500/20 dark:via-green-500/10",
      accentDark: "dark:from-emerald-500/20 dark:via-green-500/10",
      valueTone: "text-emerald-600 dark:text-emerald-300",
      redirectUrl: "/project-management",
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
      accent: "from-violet-500/24 to-transparent dark:from-violet-500/20",
      accentDark: "dark:from-violet-500/20",
      valueTone: "text-violet-700 dark:text-violet-300",
      redirectUrl: "/requests",
    },
    {
      label: "Projects Created",
      value: projectsCreatedToday,
      helpText: "Created by you today",
      accent: "from-blue-500/24 to-transparent dark:from-blue-500/20",
      accentDark: "dark:from-blue-500/20",
      valueTone: "text-sky-700 dark:text-sky-300",
      redirectUrl: "/project-management/projects",
    },
    {
      label: "Employees Added",
      value: employeesAddedToday,
      helpText: "Accounts added by you",
      accent: "from-emerald-500/24 to-transparent dark:from-emerald-500/20",
      accentDark: "dark:from-emerald-500/20",
      valueTone: "text-emerald-700 dark:text-emerald-300",
      redirectUrl: "/employees",
    },
  ];

  const teamSnapshotCards = [
    {
      title: "Employees Present Today",
      value: presentToday,
      icon: UserCheck,
      redirectUrl: "/attendance",
      accent: "from-emerald-500/28 via-green-500/14 to-transparent dark:from-emerald-500/25 dark:via-green-500/10",
      accentDark: "dark:from-emerald-500/25 dark:via-green-500/10",
      valueTone: "text-emerald-600 dark:text-emerald-300",
    },
    {
      title: "On Leave",
      value: onLeave,
      icon: Calendar,
      redirectUrl: "/attendance?filter=leave",
      accent: "from-sky-500/28 via-blue-500/14 to-transparent dark:from-sky-500/25 dark:via-blue-500/10",
      accentDark: "dark:from-sky-500/25 dark:via-blue-500/10",
      valueTone: "text-sky-600 dark:text-sky-300",
    },
    {
      title: "Late Check-ins",
      value: lateCheckins,
      icon: AlertCircle,
      redirectUrl: "/attendance?filter=late",
      accent: "from-amber-500/28 via-yellow-500/14 to-transparent dark:from-amber-500/25 dark:via-yellow-500/10",
      accentDark: "dark:from-amber-500/25 dark:via-yellow-500/10",
      valueTone: "text-amber-600 dark:text-amber-300",
    },
    {
      title: "Pending Requests",
      value: newRequests,
      icon: Clock,
      redirectUrl: "/requests",
      accent: "from-violet-500/28 via-fuchsia-500/14 to-transparent dark:from-violet-500/25 dark:via-fuchsia-500/10",
      accentDark: "dark:from-violet-500/25 dark:via-fuchsia-500/10",
      valueTone: "text-violet-600 dark:text-violet-300",
    },
  ];

  const handleCopyRefId = (refId: string) => {
    navigator.clipboard.writeText(refId).then(() => toast.success(`Copied ${refId}`));
  };

  // Department performance derived from real task stats
  const deptPerformance = [
    { dept: "Approved", completion: taskStats?.approved || 0, color: "from-green-400 to-green-600" },
    { dept: "In Progress", completion: taskStats?.in_progress || 0, color: "from-blue-400 to-blue-600" },
    { dept: "Reviewing", completion: taskStats?.reviewing || 0, color: "from-purple-400 to-purple-600" },
    { dept: "To Do", completion: taskStats?.todo || 0, color: "from-gray-400 to-gray-500" },
    { dept: "Rejected", completion: taskStats?.rejected || 0, color: "from-red-400 to-red-500" },
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
            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-indigo-700 p-6 text-white shadow-2xl shadow-fuchsia-900/20 dark:border-white/5 dark:from-violet-950 dark:via-fuchsia-900 dark:to-slate-950">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_35%)]" />
              <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-3xl space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/75 backdrop-blur-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" />
                    Admin Overview
                  </div>
                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                    {greetingLabel},{" "}
                    <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-300 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(251,191,36,0.45)]">
                      {user?.name || "Administrator"}
                    </span>{" "}
                    {greetingEmoji}
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
                    Here&apos;s your personalized workforce snapshot for today. The cards below highlight what needs your attention, your most common actions, and the live status of the team.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl">
                  <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/10 px-4 py-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_14px_36px_rgba(147,51,234,0.25)]">
                    {fourSideEdgeGlow}
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-300/18 via-white/15 to-transparent opacity-85 transition-opacity duration-300 group-hover:opacity-100 dark:from-violet-300/10 dark:via-white/5" />
                    <p className="text-[11px] uppercase tracking-[0.25em] text-white/60">Active Staff</p>
                    <p className="mt-1 text-2xl font-bold text-white">{totalEmployees}</p>
                  </div>
                  <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/10 px-4 py-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_14px_36px_rgba(56,189,248,0.22)]">
                    {fourSideEdgeGlow}
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-300/18 via-white/15 to-transparent opacity-85 transition-opacity duration-300 group-hover:opacity-100 dark:from-sky-300/10 dark:via-white/5" />
                    <p className="text-[11px] uppercase tracking-[0.25em] text-white/60">Open Tasks</p>
                    <p className="mt-1 text-2xl font-bold text-white">{activeTasks}</p>
                  </div>
                  <div className="group relative col-span-2 overflow-hidden rounded-xl border border-white/10 bg-white/10 px-4 py-3 transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_14px_36px_rgba(236,72,153,0.2)]">
                    {fourSideEdgeGlow}
                    <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-300/18 via-white/15 to-transparent opacity-85 transition-opacity duration-300 group-hover:opacity-100 dark:from-fuchsia-300/10 dark:via-white/5" />
                    <p className="text-[11px] uppercase tracking-[0.25em] text-white/60">Today</p>
                    <p className="mt-1 text-sm font-medium text-white/90">
                      {now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {prioritySummaryCards.map((card) => (
                <button
                  key={card.title}
                  type="button"
                  onClick={() => router.push(card.redirectUrl)}
                  className={`${premiumCardBase} p-5 text-left`}
                >
                  <div className={`${premiumCardGlow} ${card.accent} ${card.accentDark}`} />
                  {fourSideEdgeGlow}
                  <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/10 blur-3xl opacity-50 transition-all duration-300 group-hover:h-32 group-hover:w-32 group-hover:opacity-70" />
                  <div className="relative flex h-full flex-col justify-between gap-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Priority Summary</p>
                        <h2 className="mt-2 text-lg font-semibold text-foreground">{card.title}</h2>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary shrink-0 ml-2" />
                    </div>
                    <div>
                      <p className={`text-4xl font-bold ${card.valueTone}`}>{card.value}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{card.subtitle}</p>
                    </div>
                  </div>
                </button>
              ))}
            </section>

            <section className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-sm">
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
                      className={`${premiumCardBase} flex items-center justify-between px-4 py-4 text-left border-violet-200/70 bg-gradient-to-br from-white/95 via-violet-50/85 to-fuchsia-50/75 hover:border-primary/45 dark:border-white/15 dark:bg-white/10 dark:from-transparent dark:via-transparent dark:to-transparent dark:hover:border-primary/35`}
                    >
                      <div className={`${premiumCardGlow} from-primary/20 via-fuchsia-500/10 to-transparent dark:from-primary/20 dark:via-fuchsia-500/10`} />
                      {fourSideEdgeGlow}
                      <div className="absolute left-0 top-0 h-16 w-16 rounded-full bg-primary/25 blur-3xl opacity-50 transition-all duration-300 group-hover:h-24 group-hover:w-24 group-hover:opacity-70 dark:bg-primary/20 dark:opacity-40 dark:group-hover:opacity-60" />
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-200/80 to-fuchsia-200/60 text-violet-700 transition-transform duration-300 group-hover:scale-105 dark:from-primary/20 dark:to-primary/10 dark:text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{action.label}</p>
                          <p className="text-xs text-muted-foreground">{action.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <article className={`${premiumCardBase} p-5`}>
                <div className={`${premiumCardGlow} from-emerald-500/20 via-sky-500/10 to-transparent dark:from-emerald-500/20 dark:via-sky-500/10`} />
                {fourSideEdgeGlow}
                <div className="relative space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Happy Sheet</p>
                      <h3 className="mt-2 text-lg font-semibold text-foreground">Team Reflection Snapshot</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push("/my-space/happy-sheet")}
                      className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background/60 px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-background"
                    >
                      Open
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Submissions Today</p>
                      <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-300">
                        {submissionsToday} / {employeeCount} employees
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Participation Rate</p>
                      <p className="mt-1 text-2xl font-bold text-sky-600 dark:text-sky-300">{participationRate}%</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background/40 p-3 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Recent Entries</p>
                    {recentHappySheetEntries.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No submissions yet.</p>
                    ) : (
                      recentHappySheetEntries.map((entry) => (
                        <p key={entry.id} className="text-xs text-slate-700 dark:text-foreground/90 line-clamp-1">
                          <span className="font-semibold text-violet-700 dark:text-violet-300">{entry.user_name || `User #${entry.user_id}`}</span>
                          {" - "}
                          {(entry.what_made_you_happy || entry.what_made_others_happy || "Shared a reflection").slice(0, 56)}
                        </p>
                      ))
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
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
                    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Most Common Theme</p>
                      <p className="mt-1 text-sm font-bold text-fuchsia-600 dark:text-fuchsia-300">
                        {dominantTheme?.score ? dominantTheme.label : "Positive"}
                      </p>
                    </div>
                  </div>
                </div>
              </article>

              <article className={`${premiumCardBase} p-5`}>
                <div className={`${premiumCardGlow} from-violet-500/20 via-fuchsia-500/10 to-transparent dark:from-violet-500/20 dark:via-fuchsia-500/10`} />
                {fourSideEdgeGlow}
                <div className="relative space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">The Lighthouse</p>
                      <h3 className="mt-2 text-lg font-semibold text-foreground">Personal Projects</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push("/my-space/learning-canvas")}
                      className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background/60 px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-background"
                    >
                      Manage
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-border/60 bg-background/40 p-2.5 text-center">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Old</p>
                      <p className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-300">{lighthouseGroups.old.length}</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/40 p-2.5 text-center">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Current</p>
                      <p className="mt-1 text-xl font-bold text-violet-700 dark:text-violet-300">{lighthouseGroups.current.length}</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/40 p-2.5 text-center">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Future</p>
                      <p className="mt-1 text-xl font-bold text-sky-700 dark:text-sky-300">{lighthouseGroups.future.length}</p>
                    </div>
                  </div>

                  {personalProjects.length === 0 ? (
                    <p className="text-xs text-muted-foreground rounded-xl border border-dashed border-border/70 p-3">
                      Add your old/current/future projects in Lighthouse. You can include links, images, GitHub references, and writeups.
                    </p>
                  ) : (
                    <div className="rounded-xl border border-border/60 bg-background/40 p-3 space-y-2">
                      <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">Latest project</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-foreground line-clamp-1">{personalProjects[0].title}</p>
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
                  <div className={`${premiumCardGlow} ${card.accent} ${card.accentDark}`} />
                  {fourSideEdgeGlow}
                  <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-white/10 blur-3xl opacity-40 transition-all duration-300 group-hover:h-28 group-hover:w-28 group-hover:opacity-60" />
                  <div className="relative space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Your Admin Activity</p>
                        <h3 className="text-lg font-semibold text-foreground">{card.label}</h3>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary shrink-0 ml-2" />
                    </div>
                    <p className={`text-4xl font-bold ${card.valueTone}`}>{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.helpText}</p>
                  </div>
                </button>
              ))}
            </section>

            <div className="glass-panel rounded-2xl p-8 glow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-lg glow-primary">
                    <Users className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Team Snapshot</h2>
                    <p className="text-xs text-muted-foreground">Today&apos;s attendance and request status</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 xl:justify-items-center">
                {teamSnapshotCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.title}
                      type="button"
                      onClick={() => router.push(card.redirectUrl)}
                      className={`${premiumCardBase} w-full xl:max-w-[255px] p-4 text-left border-white/15 bg-white/10 hover:border-primary/35`}
                    >
                      <div className={`${premiumCardGlow} ${card.accent} ${card.accentDark}`} />
                      {fourSideEdgeGlow}
                      <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-white/10 blur-3xl opacity-40 transition-all duration-300 group-hover:h-28 group-hover:w-28 group-hover:opacity-60" />
                      <div className="relative space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-primary shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
                            <Icon className="h-5 w-5" />
                          </span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                        </div>
                        <p className={`text-3xl font-bold ${card.valueTone}`}>{card.value}</p>
                        <p className="text-sm font-medium text-foreground">{card.title}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 🔷 2-COLUMN GRID */}
            <div className="space-y-6">
                {/* Task Completion Overview */}
                <div
                  className="admin-dashboard-card group rounded-2xl glass-card glow-sm p-6"
                  style={adminCardAccentStyles.primary}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <span className="admin-dashboard-card-icon">
                        <Target className="h-5 w-5 text-primary" />
                      </span>
                      <h3 className="font-bold text-foreground">Task Completion</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Overall:</span>
                      <span className="font-bold text-primary">{completionRate}%</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="h-3 bg-secondary/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-500 shadow-lg shadow-primary/20"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>{taskStats?.approved || 0} completed</span>
                      <span>{totalTasks} total tasks</span>
                    </div>
                  </div>

                  {/* Department Breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground mb-3">Task Status Breakdown</h4>
                    {deptPerformance.length > 0 ? deptPerformance.map((item, index) => (
                      <div key={index} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{item.dept}</span>
                          <span className="font-semibold text-foreground">{item.completion}</span>
                        </div>
                        <div className="h-2 bg-secondary/40 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-500`}
                            style={{ width: `${totalTasks > 0 ? Math.round((item.completion / totalTasks) * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    )) : (
                      <p className="text-xs text-muted-foreground py-2">No task data yet.</p>
                    )}
                  </div>
                </div>

                {/* Upcoming Deadlines — real tasks */}
                <div
                  className="admin-dashboard-card group rounded-2xl glass-card glow-sm overflow-hidden"
                  style={adminCardAccentStyles.blue}
                >
                  <div className="bg-gradient-to-r from-primary-light/10 to-transparent p-5 border-b border-border/30">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="admin-dashboard-card-icon">
                        <Clock className="h-5 w-5 text-primary-light" />
                      </span>
                      <h3 className="font-bold text-foreground">Upcoming Deadlines</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">Active projects nearest to due date</p>
                  </div>
                  
                  <div className="p-5 space-y-3">
                    {upcomingTasks.length > 0 ? upcomingTasks.map((task, index) => (
                      <div
                        key={task.id}
                        onClick={() => router.push(`/project-management/${task.id}`)}
                        className="relative p-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent hover:from-primary/20 hover:border-primary/40 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 cursor-pointer overflow-hidden group"
                      >
                        {/* subtle left accent bar */}
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-accent to-primary/30 rounded-l-xl opacity-70 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {task.public_id && (
                              <>
                                <span className="font-mono text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded shrink-0 tracking-wider">
                                  {task.public_id}
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCopyRefId(task.public_id); }}
                                  className="shrink-0 text-muted-foreground hover:text-purple-500 transition-colors"
                                  title="Copy Ref ID"
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
                          <div className="flex items-center gap-1 text-primary/70 group-hover:text-primary transition-colors">
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
                        <ListTodo className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Tasks with due dates will appear here</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Teams Meeting Link */}
                <div
                  className="admin-dashboard-card group rounded-2xl glass-card glow-sm p-6"
                  style={adminCardAccentStyles.blue}
                >
                  <div className="flex items-center gap-2 mb-5">
                    <span className="admin-dashboard-card-icon">
                      <Video className="h-5 w-5 text-blue-400" />
                    </span>
                    <h3 className="font-bold text-foreground">Teams Meeting</h3>
                  </div>

                  {/* Active meeting banner */}
                  {activeMeeting && (
                    <div className="mb-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-blue-300 truncate">{activeMeeting.title}</p>
                        <a
                          href={activeMeeting.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 break-all"
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
                        className="shrink-0 p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors disabled:opacity-50"
                        title="Remove meeting link"
                      >
                        {isRemovingMeeting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  )}

                  {/* Share form */}
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Meeting title (e.g. Weekly Standup)"
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                      className="w-full rounded-lg bg-secondary/40 border border-border/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <div className="flex gap-2">
                      <div className="flex-1 flex items-center gap-2 rounded-lg bg-secondary/40 border border-border/60 px-3 py-2">
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
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                      >
                        {isSharingMeeting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {activeMeeting ? "Update" : "Share"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Performance Score */}
                <div
                  className="admin-dashboard-card group rounded-2xl glass-card glow-primary p-6"
                  style={adminCardAccentStyles.primary}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="admin-dashboard-card-icon">
                        <Award className="h-5 w-5 text-primary" />
                      </span>
                      <h3 className="font-bold text-foreground">Overall Performance</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-lg shadow-primary/30">
                        <div className="h-20 w-20 rounded-full bg-card flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">87</div>
                            <div className="text-xs text-muted-foreground">Score</div>
                          </div>
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
