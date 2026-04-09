"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, CheckCircle2, Clock3, FolderKanban, Layers3, ListChecks, Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import ProjectShell from "@/components/project-management/ProjectShell";
import { getAllTasks, getWorkspaces, Task, Workspace, createWorkspace, deleteWorkspace, updateWorkspace } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

export default function ProjectManagementGlobalPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
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
      toast.error("Workspace name is required");
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
  const totalTasks = useMemo(
    () => projects.reduce((acc, p) => acc + 1 + (p.subtask_count || 0), 0),
    [projects]
  );

  const recentActivity = useMemo(
    () => [...projects].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at)).slice(0, 8),
    [projects]
  );

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
      label: "Total Tasks",
      value: totalTasks,
      icon: <ListChecks size={18} className="text-purple-200" />,
      gradient: "from-purple-600 via-pink-600 to-indigo-700",
    },
    {
      label: "Tasks Completed",
      value: tasksCompleted,
      icon: <CheckCircle2 size={18} className="text-emerald-200" />,
      gradient: "from-emerald-600 via-teal-600 to-cyan-700",
    },
    {
      label: "Tasks Pending",
      value: tasksPending,
      icon: <Clock3 size={18} className="text-amber-200" />,
      gradient: "from-amber-500 via-orange-600 to-rose-700",
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
              <article
                key={card.label}
                onClick={card.onClick}
                className={`rounded-xl border border-white/20 bg-gradient-to-br ${card.gradient} p-4 text-white shadow-lg shadow-purple-900/20 dark:shadow-purple-900/30 ${card.onClick ? "cursor-pointer transition-transform hover:-translate-y-0.5" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/80">{card.label}</p>
                  {card.icon}
                </div>
                <p className="mt-3 text-2xl font-bold">{card.value}</p>
              </article>
            ))}
          </section>

          {isAdmin && (
            <section id="workspaces-section" className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Layers3 size={16} />
                  Workspaces
                </h3>
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
              </div>
              {workspaces.length === 0 ? (
                <p className="text-xs text-muted-foreground">No workspaces yet. Create one to get started.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {workspaces.map((ws) => (
                    <div key={ws.id} className="rounded-lg border border-border bg-muted/30 p-3 hover:border-primary/40 transition-colors">
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
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
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
                            onClick={() => onDeleteWorkspace(ws)}
                            className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                            title="Delete workspace"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`/project-management/workspaces/${ws.id}`)}
                        className="mt-2 w-full text-left text-xs font-semibold text-primary hover:underline"
                      >
                        View →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm dark:shadow-[0_0_20px_rgba(168,85,247,0.12)]">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Activity size={15} className="text-primary" />
              Recent Activity Across Workspaces
            </h3>
            {recentActivity.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 text-left">Project</th>
                      <th className="py-2 text-left">Workspace</th>
                      <th className="py-2 text-left">Owner</th>
                      <th className="py-2 text-left">Status</th>
                      <th className="py-2 text-left">Recent Activity</th>
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
                          <td className="py-2.5 font-medium text-foreground">{project.title}</td>
                          <td className="py-2.5 text-muted-foreground">{ws ? `${ws.icon || ""} ${ws.name}`.trim() : (project.workspace_name || "-")}</td>
                          <td className="py-2.5 text-muted-foreground">{project.assignee_name || "Unassigned"}</td>
                          <td className="py-2.5">
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                              {project.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-2.5 text-muted-foreground">{new Date(project.updated_at).toLocaleDateString("en-IN")}</td>
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
              <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5">
                <h3 className="text-lg font-bold text-foreground">Create Workspace</h3>
                <form onSubmit={onCreateWorkspace} className="mt-4 space-y-3">
                  <input
                    value={workspaceForm.name}
                    onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Workspace Name"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    required
                  />
                  <textarea
                    value={workspaceForm.description}
                    onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Description (optional)"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    rows={3}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={workspaceForm.icon}
                      onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, icon: e.target.value }))}
                      placeholder="Icon"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                    <input
                      type="color"
                      value={workspaceForm.color}
                      onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, color: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-border bg-background px-1"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowCreateWsModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>
                    <button type="submit" disabled={savingWorkspace} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                      {savingWorkspace ? "Saving..." : "Create"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showEditWsModal && editingWorkspace && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5">
                <h3 className="text-lg font-bold text-foreground">Edit Workspace</h3>
                <form onSubmit={onEditWorkspace} className="mt-4 space-y-3">
                  <input
                    value={workspaceForm.name}
                    onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Workspace Name"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    required
                  />
                  <textarea
                    value={workspaceForm.description}
                    onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Description (optional)"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    rows={3}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={workspaceForm.icon}
                      onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, icon: e.target.value }))}
                      placeholder="Icon"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                    <input
                      type="color"
                      value={workspaceForm.color}
                      onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, color: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-border bg-background px-1"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowEditWsModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>
                    <button type="submit" disabled={savingWorkspace} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
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
