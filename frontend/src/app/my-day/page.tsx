"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar, 
  Star, 
  Zap,
  ArrowRight,
  Video,
  ExternalLink,
  Github,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { 
  getMyTasks, 
  Task, 
  updateTaskStatus, 
  getMyHappySheets, 
  HappySheetEntry,
  getMyPersonalProjects, 
  PersonalProjectEntry,
  getActiveMeeting,
  TeamsMeeting
} from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

const overviewCardBase =
  "admin-dashboard-card group relative overflow-hidden rounded-2xl border border-violet-200/70 bg-gradient-to-br from-white/95 via-violet-50/85 to-fuchsia-50/75 backdrop-blur-xl shadow-[0_16px_45px_rgba(109,40,217,0.14)] transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:border-violet-300/80 hover:shadow-[0_24px_70px_rgba(124,58,237,0.2)] dark:border-white/10 dark:bg-white/8 dark:from-transparent dark:via-transparent dark:to-transparent dark:shadow-[0_18px_60px_rgba(8,6,20,0.28)] dark:hover:shadow-[0_24px_80px_rgba(124,58,237,0.22)]";

const overviewCardGlow =
  "absolute inset-0 bg-gradient-to-br opacity-80 transition-opacity duration-300 group-hover:opacity-100";

const overviewEdgeGlow = (
  <>
    <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/55 to-transparent dark:via-white/45" />
    <div className="pointer-events-none absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/45 to-transparent dark:via-white/35" />
    <div className="pointer-events-none absolute inset-y-5 left-0 w-px bg-gradient-to-b from-transparent via-purple-400/45 to-transparent dark:via-white/35" />
    <div className="pointer-events-none absolute inset-y-5 right-0 w-px bg-gradient-to-b from-transparent via-sky-400/45 to-transparent dark:via-white/35" />
  </>
);

export default function MyDayPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [happySheets, setHappySheets] = useState<HappySheetEntry[]>([]);
  const [personalProjects, setPersonalProjects] = useState<PersonalProjectEntry[]>([]);
  const [activeMeeting, setActiveMeeting] = useState<TeamsMeeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tasksRes, happyRes, projectsRes, meetingRes] = await Promise.all([
        getMyTasks(),
        getMyHappySheets(30),
        getMyPersonalProjects(30),
        getActiveMeeting()
      ]);

      if (tasksRes.data) setTasks(tasksRes.data);
      if (happyRes.data) setHappySheets(happyRes.data);
      if (projectsRes.data) setPersonalProjects(projectsRes.data);
      if (meetingRes.data !== undefined) setActiveMeeting(meetingRes.data);
    } catch (err) {
      console.error("Failed to load My Day data", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, [loadData]);

  const todayStr = new Date().toISOString().split("T")[0];
  const isToday = (dateStr?: string | null) => dateStr === todayStr;

  const categorizedTasks = useMemo(() => {
    const today: Task[] = [];
    const overdue: Task[] = [];
    const priority: Task[] = [];

    tasks.forEach(task => {
      if (task.status === "approved" || task.status === "rejected") return;

      const isCompleted = task.status === "submitted";
      const isHighPriority = task.priority === "high";
      const isOverdue = task.due_date && task.due_date < todayStr && !isCompleted;
      const isDueToday = task.due_date === todayStr;

      if (isOverdue) overdue.push(task);
      else if (isDueToday) today.push(task);
      
      if (isHighPriority && !isCompleted) priority.push(task);
    });

    return { today, overdue, priority };
  }, [tasks, todayStr]);

  const stats = useMemo(() => {
    const dueTodayCount = categorizedTasks.today.length;
    const overdueCount = categorizedTasks.overdue.length;
    const pendingCount = tasks.filter(t => t.status === "todo" || t.status === "in_progress").length;
    const completedToday = tasks.filter(t => t.status === "submitted" && isToday(t.updated_at)).length;

    return [
      {
        title: "Due Today",
        value: dueTodayCount,
        subtitle: "Tasks for today",
        accent: "from-amber-500/24 via-yellow-500/12 to-transparent dark:from-amber-500/20 dark:via-yellow-500/10",
        valueTone: "text-amber-600 dark:text-amber-300",
      },
      {
        title: "Overdue",
        value: overdueCount,
        subtitle: "Past deadlines",
        accent: "from-rose-500/24 via-red-500/12 to-transparent dark:from-rose-500/20 dark:via-red-500/10",
        valueTone: "text-rose-600 dark:text-rose-300",
      },
      {
        title: "Pending Total",
        value: pendingCount,
        subtitle: "Active workspace tasks",
        accent: "from-sky-500/24 via-cyan-500/12 to-transparent dark:from-sky-500/20 dark:via-cyan-500/10",
        valueTone: "text-sky-600 dark:text-sky-300",
      },
      {
        title: "Done Today",
        value: completedToday,
        subtitle: "Submitted for review",
        accent: "from-emerald-500/24 via-green-500/12 to-transparent dark:from-emerald-500/20 dark:via-green-500/10",
        valueTone: "text-emerald-600 dark:text-emerald-300",
      },
      {
        title: "Personal Projects",
        value: personalProjects.length,
        subtitle: "In Lighthouse",
        accent: "from-violet-500/24 via-fuchsia-500/12 to-transparent dark:from-violet-500/20 dark:via-fuchsia-500/10",
        valueTone: "text-violet-600 dark:text-violet-300",
      }
    ];
  }, [categorizedTasks, tasks, personalProjects.length, todayStr]);

  const handleStatusToggle = async (task: Task) => {
    const nextStatusMap: Record<string, "todo" | "in_progress" | "submitted"> = {
        todo: "in_progress",
        in_progress: "submitted",
        submitted: "todo",
        reviewing: "todo",
        approved: "todo",
        rejected: "todo"
    };
    
    const newStatus = nextStatusMap[task.status] || "todo";
    const res = await updateTaskStatus(task.id, newStatus);
    if (res.data) {
      setTasks(prev => prev.map(t => t.id === task.id ? res.data! : t));
      toast.success(`Task updated to ${newStatus === 'submitted' ? 'Submitted' : newStatus}`);
    } else {
      toast.error(res.error || "Failed to update task");
    }
  };

  const happySheetsToday = happySheets.filter(e => isToday(e.created_at || e.date));
  const lighthouseGroups = {
    old: personalProjects.filter(p => p.stage === "old").length,
    current: personalProjects.filter(p => p.stage === "current").length,
    future: personalProjects.filter(p => p.stage === "future").length,
  };

  return (
    <ProtectedRoute>
      <DashboardLayout 
        role={user?.role} 
        userName={user?.name} 
        userHandle={user?.email ? `@${user.email.split("@")[0]}` : undefined}
      >
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 pb-8 animate-in fade-in duration-700">
            {/* 1. Slim Hero Section */}
            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-indigo-700 p-6 text-white shadow-2xl shadow-fuchsia-900/20 dark:border-white/5 dark:from-violet-950 dark:via-fuchsia-900 dark:to-slate-950">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_35%)]" />
              <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-2xl space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/75 backdrop-blur-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" />
                    Personal Overview
                  </div>
                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    My Day,{" "}
                    <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-300 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(251,191,36,0.45)]">
                      {user?.name?.split(" ")[0]}
                    </span>{" "}
                    ✨
                  </h1>
                  <p className="text-sm leading-6 text-white/80">
                    Stay focused and synchronize your workspace activities. Track deadlines, reflections, and personal growth projects in one unified view.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-xl min-w-[140px]">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">Time</p>
                    <p className="mt-1 text-xl font-bold text-white">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-xl min-w-[180px]">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">Today</p>
                    <p className="mt-1 text-sm font-semibold text-white/90">{now.toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Summary Cards Grid */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {stats.map((card) => (
                <div
                  key={card.title}
                  className={`${overviewCardBase} p-5 text-left`}
                >
                  <div className={`${overviewCardGlow} ${card.accent}`} />
                  {overviewEdgeGlow}
                  <div className="relative flex h-full flex-col justify-between gap-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">My Summary</p>
                      <h2 className="mt-1.5 text-lg font-semibold text-foreground">{card.title}</h2>
                    </div>
                    <div>
                      <p className={`text-4xl font-bold ${card.valueTone}`}>{card.value}</p>
                      <p className="mt-1 text-[10px] font-medium text-muted-foreground">{card.subtitle}</p>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {/* 3. Snapshot Articles */}
            <section className="grid gap-4 xl:grid-cols-2">
              <article className={`${overviewCardBase} p-5`}>
                <div className={`${overviewCardGlow} from-emerald-500/20 via-sky-500/10 to-transparent dark:from-emerald-500/20 dark:via-sky-500/10`} />
                {overviewEdgeGlow}
                <div className="relative space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Happy Sheet</p>
                      <h3 className="mt-2 text-lg font-semibold text-foreground">My Reflection Snapshot</h3>
                    </div>
                    <button onClick={() => router.push("/my-space/happy-sheet")} className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background/60 px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-background">
                      Manage <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Today&apos;s Status</p>
                      <p className={`mt-1 text-lg font-bold ${happySheetsToday.length > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                        {happySheetsToday.length > 0 ? "Sync Completed" : "Not Synced Yet"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Total Reflections</p>
                      <p className="mt-1 text-2xl font-bold text-sky-600">{happySheets.length}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/40 p-3 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Latest Entries</p>
                    {happySheets.slice(0, 2).map((entry) => (
                      <p key={entry.id} className="text-xs text-muted-foreground line-clamp-1 italic">
                        &quot;{(entry.what_made_you_happy || "No reflection shared").slice(0, 80)}...&quot;
                      </p>
                    ))}
                    {happySheets.length === 0 && <p className="text-xs text-muted-foreground">No submissions yet.</p>}
                  </div>
                </div>
              </article>

              <article className={`${overviewCardBase} p-5`}>
                <div className={`${overviewCardGlow} from-violet-500/20 via-fuchsia-500/10 to-transparent dark:from-violet-500/20 dark:via-fuchsia-500/10`} />
                {overviewEdgeGlow}
                <div className="relative space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Lighthouse</p>
                      <h3 className="mt-2 text-lg font-semibold text-foreground">Personal Projects</h3>
                    </div>
                    <button onClick={() => router.push("/my-space/learning-canvas")} className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background/60 px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-background">
                      Manage <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-border/60 bg-background/40 p-2.5 text-center">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Old</p>
                      <p className="mt-1 text-xl font-bold text-amber-700">{lighthouseGroups.old}</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/40 p-2.5 text-center">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Current</p>
                      <p className="mt-1 text-xl font-bold text-violet-700">{lighthouseGroups.current}</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/40 p-2.5 text-center">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Future</p>
                      <p className="mt-1 text-xl font-bold text-sky-700">{lighthouseGroups.future}</p>
                    </div>
                  </div>
                  {personalProjects.length > 0 ? (
                    <div className="rounded-xl border border-border/60 bg-background/40 p-3 space-y-2">
                      <p className="text-xs font-semibold text-violet-700">Latest: {personalProjects[0].title}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        {personalProjects[0].github_link && <span className="flex items-center gap-1"><Github size={12}/> GitHub</span>}
                        {personalProjects[0].demo_link && <span className="flex items-center gap-1"><ExternalLink size={12}/> Demo</span>}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic rounded-xl border border-dashed border-border/70 p-3">
                      Capture your moonshot projects and growth roadmap.
                    </p>
                  )}
                </div>
              </article>
            </section>

            {/* 4. Active Teams Meeting (If any) */}
            {activeMeeting && (
              <div className={`${overviewCardBase} p-5 border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-transparent to-transparent`}>
                <div className="flex items-center justify-between gap-4 flex-wrap relative z-10">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-blue-500 shadow-lg shadow-blue-500/40">
                      <Video className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wide">Live Meeting</p>
                      <p className="font-bold text-foreground truncate">{activeMeeting.title}</p>
                    </div>
                  </div>
                  <a href={activeMeeting.meeting_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-500/30">
                    <ExternalLink size={14} /> Join Now
                  </a>
                </div>
              </div>
            )}

            {/* 5. Detailed Task Lists */}
            <div className="grid gap-6">
              {[
                { title: "Critical & Overdue", list: categorizedTasks.overdue, icon: AlertCircle, color: "text-rose-500" },
                { title: "Today's Commitment", list: categorizedTasks.today, icon: Calendar, color: "text-amber-500" },
                { title: "High Priority Focus", list: categorizedTasks.priority, icon: Star, color: "text-violet-500" },
              ].map(sec => (
                <div key={sec.title} className={`${overviewCardBase} p-6`}>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-background/50 border border-border/50 ${sec.color}`}>
                          <sec.icon size={20} />
                        </div>
                        <h3 className="font-bold text-foreground">{sec.title}</h3>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-secondary/50 px-2 py-1 rounded-md">
                        {sec.list.length} Tasks
                      </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {sec.list.length > 0 ? sec.list.map(task => (
                        <div key={task.id} className="relative group/task rounded-xl border border-border/40 bg-background/40 p-4 transition-all hover:bg-background/60 hover:border-primary/30">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate mb-1">
                                {task.workspace_name}
                              </p>
                              <h4 className="text-sm font-bold text-foreground line-clamp-1 group-hover/task:text-primary transition-colors">
                                {task.title}
                              </h4>
                            </div>
                            <button 
                              onClick={() => handleStatusToggle(task)}
                              className={`h-9 w-9 shrink-0 flex items-center justify-center rounded-lg transition-all ${
                                task.status === 'submitted' ? 'bg-emerald-500 text-white' :
                                task.status === 'in_progress' ? 'bg-blue-500 text-white' :
                                'bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary'
                              }`}
                            >
                              {task.status === 'submitted' ? <CheckCircle2 size={18}/> : 
                               task.status === 'in_progress' ? <Zap size={18} className="animate-pulse"/> : 
                               <Clock size={18}/>}
                            </button>
                          </div>
                          <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-muted-foreground border-t border-border/20 pt-3">
                            <span className="flex items-center gap-1"><Calendar size={12}/> {task.due_date || 'No Date'}</span>
                            <Link href={`/project-management?edit=${task.id}`} className="text-primary hover:underline">View Details</Link>
                          </div>
                        </div>
                      )) : (
                        <div className="col-span-full py-8 text-center border border-dashed border-border/60 rounded-xl bg-background/20">
                          <p className="text-xs text-muted-foreground">No tasks in this category</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 6. Quick Action Tip */}
            <div className={`${overviewCardBase} p-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent`}>
               <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <Zap size={24} />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h4 className="font-bold text-foreground">Pro-Tip for Today</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Start your day by tackling one <span className="text-rose-500 font-bold uppercase">Critical</span> task. 
                      Completing it early generates massive momentum for the rest of your commitments.
                    </p>
                  </div>
                  <button onClick={() => router.push('/project-management')} className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20">
                    Open Projects
                  </button>
               </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
