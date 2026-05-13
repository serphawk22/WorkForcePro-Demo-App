"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, CheckCircle2, Clock3, FolderKanban, Layers3, ListChecks, Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import ProjectShell from "@/components/project-management/ProjectShell";
import { getAllTasks, getWorkspaces, Task, Workspace, createWorkspace, deleteWorkspace, updateWorkspace } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

const WORKSPACE_ICON_OPTIONS = [
  { value: "⭐", label: "Star" },
  { value: "📁", label: "Folder" },
  { value: "📊", label: "Analytics" },
  { value: "📘", label: "Book" },
  { value: "🧠", label: "Brain" },
  { value: "⚙", label: "Settings" },
];

const WORKSPACE_COLOR_OPTIONS = [
  { value: "#7C3AED", label: "Purple" },
  { value: "#2563EB", label: "Blue" },
  { value: "#EA580C", label: "Orange" },
  { value: "#16A34A", label: "Green" },
  { value: "#DB2777", label: "Pink" },
];

const getColorPickerValue = (color: string) =>
  /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#7C3AED";

export default function ProjectManagementGlobalPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canManageTasks = isAdmin;
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Task[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showCreateWsModal, setShowCreateWsModal] = useState(false);
  const [showEditWsModal, setShowEditWsModal] = useState(false);
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [workspaceForm, setWorkspaceForm] = useState({
    name: "",
    description: "",
    icon: "📁",
    color: "#4F46E5",
  });

  const loadData = async () => {
    setLoading(true);
    const [projectsRes, workspacesRes] = await Promise.all([getAllTasks(), getWorkspaces()]);
    if (projectsRes.data) setProjects(projectsRes.data);
    if (workspacesRes.data) setWorkspaces(workspacesRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    
    const handleWorkspacesUpdated = () => {
      loadData();
    };
    
    window.addEventListener("workspaces-updated", handleWorkspacesUpdated);
    return () => window.removeEventListener("workspaces-updated", handleWorkspacesUpdated);
  }, []);

  const onCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceForm.name.trim()) {
      toast.error("Workspace title is required");
      return;
    }

    setSavingWorkspace(true);
    const result = await createWorkspace({
      name: workspaceForm.name.trim(),
      description: workspaceForm.description || undefined,
      icon: workspaceForm.icon || undefined,
      color: workspaceForm.color || undefined,
    });

    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      toast.success("Workspace created");
      setShowCreateWsModal(false);
      setWorkspaceForm({ name: "", description: "", icon: "📁", color: "#4F46E5" });
      window.dispatchEvent(new Event("workspaces-updated"));
    }
    setSavingWorkspace(false);
  };

  const onEditWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkspace) return;

    setSavingWorkspace(true);
    const result = await updateWorkspace(editingWorkspace.id, {
      name: workspaceForm.name.trim(),
      description: workspaceForm.description || "",
      icon: workspaceForm.icon || undefined,
      color: workspaceForm.color || undefined,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Workspace updated");
      setShowEditWsModal(false);
      setEditingWorkspace(null);
      setWorkspaceForm({ name: "", description: "", icon: "📁", color: "#4F46E5" });
      window.dispatchEvent(new Event("workspaces-updated"));
    }
    setSavingWorkspace(false);
  };

  const onDeleteWorkspace = async (ws: Workspace) => {
    if (!confirm("Delete this workspace? It must be empty first.")) return;

    const result = await deleteWorkspace(ws.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Workspace deleted");
    window.dispatchEvent(new Event("workspaces-updated"));
  };

  const headerAction = isAdmin && (
    <button
      onClick={() => {
        setWorkspaceForm({ name: "", description: "", icon: "📁", color: "#4F46E5" });
        setShowCreateWsModal(true);
      }}
      className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-colors"
    >
      <Plus size={16} />
      Create Workspace
    </button>
  );

  const workspaceMap = useMemo(
    () => new Map(workspaces.map((ws) => [ws.id, ws])),
    [workspaces]
  );

  const tasksCompleted = useMemo(
    () => projects.filter((p) => p.status === "approved").length,
    [projects]
  );
  const tasksPending = useMemo(
    () => projects.filter((p) => p.status !== "approved").length,
    [projects]
  );
  const overdueTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return projects.filter((project) => {
      if (!project.due_date) return false;
      if (project.status === "approved") return false;

      const dueDate = new Date(project.due_date);
      if (Number.isNaN(dueDate.getTime())) return false;
      dueDate.setHours(0, 0, 0, 0);

      return dueDate < today;
    }).length;
  }, [projects]);

  const recentActivity = useMemo(
    () => [...projects].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at)).slice(0, 8),
    [projects]
  );

  const workspaceMetrics = useMemo(() => {
    return workspaces.map((workspace) => {
      const workspaceTasks = projects.filter((task) => task.workspace_id === workspace.id);
      const workspaceProjects = workspaceTasks.filter((task) => !task.parent_task_id);
      const completedTasks = workspaceTasks.filter((task) => task.status === "approved").length;
      const completionRate = workspaceTasks.length > 0
        ? Math.round((completedTasks / workspaceTasks.length) * 100)
        : 0;
      const latestActivityTs = workspaceTasks.reduce<number>((latest, task) => {
        const updatedTs = Date.parse(task.updated_at || task.created_at || "");
        return Number.isNaN(updatedTs) ? latest : Math.max(latest, updatedTs);
      }, 0);

      return {
        workspace,
        projectCount: workspaceProjects.length,
        taskCount: workspaceTasks.length,
        completedTasks,
        completionRate,
        lastActivity: latestActivityTs ? new Date(latestActivityTs) : null,
      };
    });
  }, [projects, workspaces]);

  const statCards = [
    {
      label: "Total Workspaces",
      value: workspaces.length,
      icon: <Layers3 size={18} className="text-purple-200" />,
      gradient: "from-violet-600 via-fuchsia-600 to-purple-700",
      onClick: () => {
        document.getElementById("workspaces-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      },
    },
    {
      label: "Total Projects",
      value: projects.length,
      icon: <FolderKanban size={18} className="text-purple-200" />,
      gradient: "from-indigo-600 via-purple-600 to-fuchsia-700",
      onClick: () => {
        router.push("/project-management/projects");
      },
    },
    {
      label: "Overdue Tasks",
      value: overdueTasks,
      icon: <ListChecks size={18} className="text-purple-200" />,
      gradient: "from-purple-600 via-pink-600 to-indigo-700",
      onClick: () => {
        router.push("/project-management/projects?status=overdue");
      },
    },
    {
      label: "Tasks Completed",
      value: tasksCompleted,
      icon: <CheckCircle2 size={18} className="text-emerald-200" />,
      gradient: "from-emerald-600 via-teal-600 to-cyan-700",
      onClick: () => {
        router.push("/project-management/reports");
      },
    },
    {
      label: "Tasks Pending",
      value: tasksPending,
      icon: <Clock3 size={18} className="text-amber-200" />,
      gradient: "from-amber-500 via-orange-600 to-rose-700",
      onClick: () => {
        router.push("/project-management/board");
      },
    },
  ];

  return (
    <ProjectShell headerAction={headerAction}>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-5">
          <section className="rounded-2xl border border-white/20 bg-gradient-to-r from-violet-600/90 via-fuchsia-600/90 to-indigo-700/90 p-5 text-white shadow-xl shadow-fuchsia-900/20">
            <h2 className="text-xl font-bold tracking-tight">Global Project Dashboard</h2>
            <p className="mt-1 text-sm text-fuchsia-100/90">Company-wide overview across all workspaces and projects.</p>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {statCards.map((card) => (
              <button
                type="button"
                key={card.label}
                onClick={card.onClick}
                className={`rounded-xl border border-white/20 bg-gradient-to-br ${card.gradient} p-4 text-left text-white shadow-lg shadow-purple-900/20 dark:shadow-purple-900/30 cursor-pointer transform-gpu transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:shadow-2xl hover:shadow-fuchsia-900/35 active:translate-y-0 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/80">{card.label}</p>
                  {card.icon}
                </div>
                <p className="mt-3 text-2xl font-bold">{card.value}</p>
              </button>
            ))}
          </section>

          <section id="workspaces-section" className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Layers3 size={16} />
                  Workspaces
                </h3>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setWorkspaceForm({ name: "", description: "", icon: "📁", color: "#4F46E5" });
                      setShowCreateWsModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold border border-border text-foreground hover:bg-muted transition-colors"
                  >
                    <Plus size={13} />
                    New
                  </button>
                )}
              </div>
              {workspaces.length === 0 ? (
                <p className="text-xs text-muted-foreground">No workspaces yet. Create one to get started.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {workspaceMetrics.map(({ workspace: ws, projectCount, taskCount, completedTasks, completionRate, lastActivity }) => (
                    <div
                      key={ws.id}
                      onClick={() => router.push(`/project-management/workspaces/${ws.id}`)}
                      className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent p-3 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-700/20 hover:border-primary/40"
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_48%)] opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
                      <div className="relative">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{ws.icon || "📁"}</span>
                              <h4 className="font-semibold text-sm text-foreground line-clamp-1">{ws.name}</h4>
                            </div>
                            {ws.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{ws.description}</p>
                            )}
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingWorkspace(ws);
                                  setWorkspaceForm({
                                    name: ws.name,
                                    description: ws.description || "",
                                    icon: ws.icon || "📁",
                                    color: ws.color || "#4F46E5",
                                  });
                                  setShowEditWsModal(true);
                                }}
                                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                                title="Edit workspace"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteWorkspace(ws);
                                }}
                                className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                                title="Delete workspace"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <p className="text-muted-foreground">Projects: <span className="font-semibold text-foreground">{projectCount}</span></p>
                          <p className="text-muted-foreground">Tasks: <span className="font-semibold text-foreground">{taskCount}</span></p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Last Activity: {lastActivity ? lastActivity.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-"}
                        </p>

                        <div className="mt-3 rounded-lg border border-border/70 bg-background/60 p-2">
                          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Tasks Completed</span>
                            <span className="font-semibold text-foreground">{completionRate}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/70">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">{completedTasks}/{taskCount || 0} done</p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/project-management/workspaces/${ws.id}`);
                          }}
                          className="mt-3 w-full rounded-md border border-primary/30 bg-primary/10 px-2 py-1.5 text-left text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                        >
                          Open Workspace
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm dark:shadow-[0_0_20px_rgba(168,85,247,0.12)]">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Activity size={15} className="text-primary" />
              Recent Activity Across Workspaces
            </h3>
            {recentActivity.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col className={canManageTasks ? "w-[38%]" : "w-[44%]"} />
                    <col className={canManageTasks ? "w-[22%]" : "w-[24%]"} />
                    <col className="w-[12%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                    {canManageTasks && <col className="w-[8%]" />}
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-3 text-left">Project</th>
                      <th className="py-2 pr-3 text-left">Workspace</th>
                      <th className="py-2 pr-2 text-left">Owner</th>
                      <th className="py-2 pr-2 text-left">Status</th>
                      <th className="py-2 text-left">Recent Activity</th>
                      {canManageTasks && <th className="py-2 text-left">Edit</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map((project) => {
                      const ws = workspaceMap.get(project.workspace_id || -1);
                      return (
                        <tr
                          key={project.id}
                          className="cursor-pointer border-b border-border/60 hover:bg-muted/40 transition-colors"
                          onClick={() => {
                            if (project.workspace_id) {
                              router.push(`/project-management/workspaces/${project.workspace_id}/projects/${project.id}`);
                            } else {
                              router.push(`/project-management/${project.id}`);
                            }
                          }}
                        >
                          <td className="py-2.5 pr-3 font-medium text-foreground max-w-0">
                            <span className="block truncate" title={project.title}>{project.title}</span>
                          </td>
                          <td className="py-2.5 pr-3 text-muted-foreground max-w-0">
                            <span className="block truncate" title={ws ? `${ws.icon || ""} ${ws.name}`.trim() : (project.workspace_name || "-")}>{ws ? `${ws.icon || ""} ${ws.name}`.trim() : (project.workspace_name || "-")}</span>
                          </td>
                          <td className="py-2.5 pr-2 text-muted-foreground max-w-0">
                            <span className="block truncate" title={project.assignee_name || "Unassigned"}>{project.assignee_name || "Unassigned"}</span>
                          </td>
                          <td className="py-2.5 pr-2">
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                              {project.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-2.5 text-muted-foreground">{new Date(project.updated_at).toLocaleDateString("en-IN")}</td>
                          {canManageTasks && (
                            <td className="py-2.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/project-management/projects?edit=${project.id}`);
                                }}
                                className="rounded-md border border-primary/35 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                              >
                                Edit
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {showCreateWsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-2xl border border-white/25 bg-gradient-to-br from-white/90 to-purple-50/70 p-5 shadow-2xl backdrop-blur-xl dark:border-white/15 dark:from-violet-950/70 dark:to-fuchsia-950/40">
                <h3 className="text-lg font-bold text-foreground">Create Workspace</h3>
                <form onSubmit={onCreateWorkspace} className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workspace Title</label>
                    <input
                      value={workspaceForm.name}
                      onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Workspace Title"
                      className="w-full rounded-lg border border-border bg-background/85 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
                    <textarea
                      value={workspaceForm.description}
                      onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe this workspace"
                      className="w-full rounded-lg border border-border bg-background/85 px-3 py-2 text-sm"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workspace Icon</label>
                      <div className="grid grid-cols-3 gap-2">
                        {WORKSPACE_ICON_OPTIONS.map((iconOpt) => {
                          const active = workspaceForm.icon === iconOpt.value;
                          return (
                            <button
                              key={iconOpt.value}
                              type="button"
                              onClick={() => setWorkspaceForm((prev) => ({ ...prev, icon: iconOpt.value }))}
                              title={iconOpt.label}
                              className={`rounded-lg border px-2 py-2 text-base transition-all duration-200 hover:-translate-y-0.5 ${
                                active
                                  ? "border-primary bg-primary/15 text-primary shadow-sm"
                                  : "border-border bg-background/80 hover:border-primary/40"
                              }`}
                            >
                              {iconOpt.value}
                            </button>
                          );
                        })}
                      </div>
                      <input
                        value={workspaceForm.icon}
                        onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, icon: e.target.value }))}
                        placeholder="Any emoji"
                        className="mt-2 w-full rounded-lg border border-border bg-background/85 px-2.5 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workspace Color</label>
                      <div className="grid grid-cols-3 gap-2">
                        {WORKSPACE_COLOR_OPTIONS.map((colorOpt) => {
                          const active = workspaceForm.color === colorOpt.value;
                          return (
                            <button
                              key={colorOpt.value}
                              type="button"
                              onClick={() => setWorkspaceForm((prev) => ({ ...prev, color: colorOpt.value }))}
                              title={colorOpt.label}
                              className={`h-9 rounded-lg border transition-all duration-200 hover:-translate-y-0.5 ${
                                active ? "border-white shadow-md ring-2 ring-primary/45" : "border-white/30"
                              }`}
                              style={{ backgroundColor: colorOpt.value }}
                            />
                          );
                        })}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="color"
                          value={getColorPickerValue(workspaceForm.color)}
                          onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, color: e.target.value }))}
                          className="h-8 w-10 rounded border border-border bg-background p-0.5"
                        />
                        <input
                          value={workspaceForm.color}
                          onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, color: e.target.value }))}
                          placeholder="Any color (hex/rgb/hsl/name)"
                          className="w-full rounded-lg border border-border bg-background/85 px-2.5 py-1.5 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowCreateWsModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>
                    <button type="submit" disabled={savingWorkspace} className="rounded-lg bg-gradient-to-r from-primary to-fuchsia-600 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25">
                      {savingWorkspace ? "Saving..." : "Create"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showEditWsModal && editingWorkspace && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-2xl border border-white/25 bg-gradient-to-br from-white/90 to-purple-50/70 p-5 shadow-2xl backdrop-blur-xl dark:border-white/15 dark:from-violet-950/70 dark:to-fuchsia-950/40">
                <h3 className="text-lg font-bold text-foreground">Edit Workspace</h3>
                <form onSubmit={onEditWorkspace} className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workspace Title</label>
                    <input
                      value={workspaceForm.name}
                      onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Workspace Title"
                      className="w-full rounded-lg border border-border bg-background/85 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
                    <textarea
                      value={workspaceForm.description}
                      onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe this workspace"
                      className="w-full rounded-lg border border-border bg-background/85 px-3 py-2 text-sm"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workspace Icon</label>
                      <div className="grid grid-cols-3 gap-2">
                        {WORKSPACE_ICON_OPTIONS.map((iconOpt) => {
                          const active = workspaceForm.icon === iconOpt.value;
                          return (
                            <button
                              key={iconOpt.value}
                              type="button"
                              onClick={() => setWorkspaceForm((prev) => ({ ...prev, icon: iconOpt.value }))}
                              title={iconOpt.label}
                              className={`rounded-lg border px-2 py-2 text-base transition-all duration-200 hover:-translate-y-0.5 ${
                                active
                                  ? "border-primary bg-primary/15 text-primary shadow-sm"
                                  : "border-border bg-background/80 hover:border-primary/40"
                              }`}
                            >
                              {iconOpt.value}
                            </button>
                          );
                        })}
                      </div>
                      <input
                        value={workspaceForm.icon}
                        onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, icon: e.target.value }))}
                        placeholder="Any emoji"
                        className="mt-2 w-full rounded-lg border border-border bg-background/85 px-2.5 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workspace Color</label>
                      <div className="grid grid-cols-3 gap-2">
                        {WORKSPACE_COLOR_OPTIONS.map((colorOpt) => {
                          const active = workspaceForm.color === colorOpt.value;
                          return (
                            <button
                              key={colorOpt.value}
                              type="button"
                              onClick={() => setWorkspaceForm((prev) => ({ ...prev, color: colorOpt.value }))}
                              title={colorOpt.label}
                              className={`h-9 rounded-lg border transition-all duration-200 hover:-translate-y-0.5 ${
                                active ? "border-white shadow-md ring-2 ring-primary/45" : "border-white/30"
                              }`}
                              style={{ backgroundColor: colorOpt.value }}
                            />
                          );
                        })}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="color"
                          value={getColorPickerValue(workspaceForm.color)}
                          onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, color: e.target.value }))}
                          className="h-8 w-10 rounded border border-border bg-background p-0.5"
                        />
                        <input
                          value={workspaceForm.color}
                          onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, color: e.target.value }))}
                          placeholder="Any color (hex/rgb/hsl/name)"
                          className="w-full rounded-lg border border-border bg-background/85 px-2.5 py-1.5 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowEditWsModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>
                    <button type="submit" disabled={savingWorkspace} className="rounded-lg bg-gradient-to-r from-primary to-fuchsia-600 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25">
                      {savingWorkspace ? "Saving..." : "Update"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </ProjectShell>
  );
}
