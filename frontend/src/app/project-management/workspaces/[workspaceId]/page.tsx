"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Plus, Pencil, Trash2, FolderOpen, Layers3, ListChecks, CheckCircle2, Clock3, Activity } from "lucide-react";
import ProjectShell from "@/components/project-management/ProjectShell";
import { DropdownMenu, type DropdownOption } from "@/components/ui/themed-dropdown";
import {
  Workspace,
  Task,
  User,
  getApiBaseUrl,
  createWorkspace,
  deleteWorkspace,
  getAssignableUsers,
  getWorkspaceProjects,
  getWorkspaces,
  updateWorkspace,
} from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "submitted", label: "Submitted" },
  { value: "reviewing", label: "Reviewing" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function WorkspaceProjectsPage() {
  const router = useRouter();
  const params = useParams<{ workspaceId: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const workspaceId = useMemo(() => Number(params?.workspaceId), [params?.workspaceId]);

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [allWorkspaces, setAllWorkspaces] = useState<Workspace[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<number | undefined>(undefined);
  const [recentDays, setRecentDays] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const [showCreateWsModal, setShowCreateWsModal] = useState(false);
  const [showEditWsModal, setShowEditWsModal] = useState(false);
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [workspaceForm, setWorkspaceForm] = useState({
    name: "",
    description: "",
    icon: "📁",
    color: "#4F46E5",
  });

  const getProfilePictureUrl = (profilePicture?: string | null) => {
    if (!profilePicture) return null;
    if (profilePicture.startsWith("data:")) return profilePicture;
    if (profilePicture.startsWith("http")) return profilePicture;
    return `${getApiBaseUrl()}${profilePicture}`;
  };

  const statusOptions: DropdownOption[] = [
    { value: "", label: "All Status", icon: <span className="text-muted-foreground">●</span> },
    { value: "todo", label: "To Do", icon: <span className="text-purple-400">●</span> },
    { value: "in_progress", label: "In Progress", icon: <span className="text-blue-400">●</span> },
    { value: "submitted", label: "Submitted", icon: <span className="text-yellow-400">●</span> },
    { value: "reviewing", label: "Reviewing", icon: <span className="text-amber-400">●</span> },
    { value: "approved", label: "Approved", icon: <span className="text-green-400">●</span> },
    { value: "rejected", label: "Rejected", icon: <span className="text-red-400">●</span> },
  ];

  const ownerOptions: DropdownOption[] = [
    { value: "", label: "All Owners", icon: <span className="text-muted-foreground">👥</span> },
    ...users.map((u) => ({
      value: String(u.id),
      label: u.name,
      avatarSrc: getProfilePictureUrl(u.profile_picture),
      avatarFallback: u.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
      icon: <span>{u.role === "admin" ? "⭐" : "👤"}</span>,
    })),
  ];

  const recentOptions: DropdownOption[] = [
    { value: "", label: "Any Activity", icon: <span className="text-muted-foreground">⏱️</span> },
    { value: "7", label: "Last 7 days", icon: <span>7</span> },
    { value: "14", label: "Last 14 days", icon: <span>14</span> },
    { value: "30", label: "Last 30 days", icon: <span>30</span> },
  ];

  const loadData = useCallback(async () => {
    if (!workspaceId || Number.isNaN(workspaceId)) {
      toast.error("Invalid workspace link. Redirecting...");
      router.replace("/project-management");
      return;
    }
    setLoading(true);

    const [workspaceProjectsRes, usersRes, workspacesRes] = await Promise.all([
      getWorkspaceProjects(workspaceId, {
        statusFilter: statusFilter || undefined,
        ownerId: ownerFilter,
        recentDays,
      }),
      getAssignableUsers(),
      getWorkspaces(),
    ]);

    if (workspacesRes.data) setAllWorkspaces(workspacesRes.data);
    if (usersRes.data) setUsers(usersRes.data);

    if (workspaceProjectsRes.error) {
      const normalized = workspaceProjectsRes.error.toLowerCase();
      const workspaceUnavailable =
        normalized.includes("workspace not found") ||
        normalized.includes("forbidden") ||
        normalized.includes("access forbidden");

      if (workspaceUnavailable) {
        const fallback = workspacesRes.data?.find((ws) => ws.id !== workspaceId) || workspacesRes.data?.[0];
        if (fallback) {
          toast.error("Workspace unavailable. Redirecting to an available workspace.");
          router.replace(`/project-management/workspaces/${fallback.id}`);
        } else {
          toast.error("No accessible workspace found. Redirecting to project overview.");
          router.replace("/project-management");
        }
      } else {
        toast.error(workspaceProjectsRes.error);
      }

      setWorkspace(null);
      setProjects([]);
      setLoading(false);
      return;
    }

    if (workspaceProjectsRes.data) {
      setWorkspace(workspaceProjectsRes.data.workspace);
      setProjects(workspaceProjectsRes.data.projects || []);
      setWorkspaceForm({
        name: workspaceProjectsRes.data.workspace.name,
        description: workspaceProjectsRes.data.workspace.description || "",
        icon: workspaceProjectsRes.data.workspace.icon || "📁",
        color: workspaceProjectsRes.data.workspace.color || "#4F46E5",
      });
    }
    setLoading(false);
  }, [ownerFilter, recentDays, router, statusFilter, workspaceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      window.dispatchEvent(new Event("workspaces-updated"));
      router.push(`/project-management/workspaces/${result.data.id}`);
    }
    setSavingWorkspace(false);
  };

  const onEditWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;

    setSavingWorkspace(true);
    const result = await updateWorkspace(workspace.id, {
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
      window.dispatchEvent(new Event("workspaces-updated"));
      loadData();
    }
    setSavingWorkspace(false);
  };

  const onDeleteWorkspace = async () => {
    if (!workspace) return;
    if (!confirm("Delete this workspace? It must be empty first.")) return;

    const result = await deleteWorkspace(workspace.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Workspace deleted");
    window.dispatchEvent(new Event("workspaces-updated"));
    const fallback = allWorkspaces.find((ws) => ws.id !== workspace.id);
    if (fallback) router.push(`/project-management/workspaces/${fallback.id}`);
    else router.push("/project-management/projects");
  };

  const headerAction = (
    <div className="flex items-center gap-2">
      {isAdmin && (
        <>
          <button
            onClick={() => {
              setWorkspaceForm({ name: "", description: "", icon: "📁", color: "#4F46E5" });
              setShowCreateWsModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold border border-border text-foreground hover:bg-muted transition-colors"
          >
            <Plus size={14} />
            Create Workspace
          </button>
          {workspace && (
            <>
              <button
                onClick={() => setShowEditWsModal(true)}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold border border-border text-foreground hover:bg-muted transition-colors"
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                onClick={onDeleteWorkspace}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold border border-red-500/40 text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </>
          )}
        </>
      )}
      {workspace && (
        <button
          onClick={() => router.push(`/project-management/projects?workspace=${workspace.id}`)}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          Create Project
        </button>
      )}
    </div>
  );

  const tasksCompleted = projects.filter((p) => p.status === "approved").length;
  const tasksPending = projects.filter((p) => p.status !== "approved").length;
  const totalTasks = projects.reduce((acc, p) => acc + 1 + (p.subtask_count || 0), 0);
  const recentActivity = [...projects].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at)).slice(0, 5);

  return (
    <ProjectShell headerAction={headerAction}>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !workspace ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          Workspace not found.
        </div>
      ) : (
        <div className="space-y-4">
          <section className="rounded-2xl border border-white/20 bg-gradient-to-r from-violet-600/90 via-fuchsia-600/90 to-indigo-700/90 p-5 text-white shadow-xl shadow-fuchsia-900/20">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex items-center gap-2 rounded-lg px-3 py-1 text-sm font-semibold border border-white/30 bg-white/10">
                <span
                  className="inline-flex h-2.5 w-2.5 rounded-full border border-white/20"
                  style={{ backgroundColor: workspace.color || "#6b7280" }}
                />
                <span>{workspace.icon || "📁"}</span>
              </span>
              <div>
                <h2 className="text-xl font-bold text-white">{workspace.name}</h2>
                {workspace.description && (
                  <p className="mt-1 text-sm text-fuchsia-100/90">{workspace.description}</p>
                )}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: "Total Projects", value: projects.length, icon: <Layers3 size={16} className="text-purple-200" />, gradient: "from-indigo-600 via-violet-600 to-purple-700" },
              { label: "Total Tasks", value: totalTasks, icon: <ListChecks size={16} className="text-purple-200" />, gradient: "from-purple-600 via-fuchsia-600 to-pink-700" },
              { label: "Completed", value: tasksCompleted, icon: <CheckCircle2 size={16} className="text-emerald-200" />, gradient: "from-emerald-600 via-teal-600 to-cyan-700" },
              { label: "Pending", value: tasksPending, icon: <Clock3 size={16} className="text-amber-200" />, gradient: "from-amber-500 via-orange-600 to-rose-700" },
              { label: "Recent Activity", value: recentActivity.length, icon: <Activity size={16} className="text-purple-200" />, gradient: "from-violet-600 via-purple-600 to-indigo-700" },
            ].map((card) => (
              <article
                key={card.label}
                className={`rounded-xl border border-white/20 bg-gradient-to-br ${card.gradient} p-4 text-white shadow-lg shadow-purple-900/20 dark:shadow-purple-900/30`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/85">{card.label}</p>
                  {card.icon}
                </div>
                <p className="mt-2 text-2xl font-bold">{card.value}</p>
              </article>
            ))}
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <DropdownMenu
                value={statusFilter}
                onValueChange={setStatusFilter}
                options={statusOptions}
                placeholder="All Status"
                triggerClassName="w-52"
              />

              <DropdownMenu
                value={ownerFilter ? String(ownerFilter) : ""}
                onValueChange={(value) => setOwnerFilter(value ? Number(value) : undefined)}
                options={ownerOptions}
                placeholder="All Owners"
                triggerClassName="w-52"
              />

              <DropdownMenu
                value={recentDays ? String(recentDays) : ""}
                onValueChange={(value) => setRecentDays(value ? Number(value) : undefined)}
                options={recentOptions}
                placeholder="Any Activity"
                triggerClassName="w-52"
              />
            </div>
          </section>

          {projects.length === 0 ? (
            <section className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
              <p className="text-sm text-muted-foreground">No projects in this workspace yet.</p>
              <button
                onClick={() => router.push(`/project-management/projects?workspace=${workspace.id}`)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus size={15} />
                Create Project
              </button>
            </section>
          ) : (
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="rounded-xl border border-purple-200/60 bg-gradient-to-br from-white/95 to-purple-50/65 dark:from-violet-900/20 dark:to-fuchsia-900/10 p-4 shadow-md shadow-purple-200/15 dark:shadow-[0_0_24px_rgba(168,85,247,0.2)] hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-foreground leading-snug">{project.title}</h3>
                      {project.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-muted-foreground">{project.description}</p>
                      )}
                    </div>
                    <span className="rounded-md bg-purple-100/80 dark:bg-muted px-2 py-1 text-[11px] uppercase tracking-wide text-purple-700 dark:text-muted-foreground">
                      {project.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-muted-foreground">
                    <p>Owner: <span className="text-foreground font-medium">{project.assignee_name || "Unassigned"}</span></p>
                    <p>Tasks: <span className="text-foreground font-medium">{project.subtask_count ?? 0}</span></p>
                    <p>Recent Activity: <span className="text-foreground font-medium">{new Date(project.updated_at).toLocaleDateString("en-IN")}</span></p>
                  </div>

                  <button
                    onClick={() => router.push(`/project-management/workspaces/${workspace.id}/projects/${project.id}`)}
                    className="mt-4 inline-flex items-center gap-2 rounded-md border border-purple-300/70 bg-white/90 px-3 py-1.5 text-xs font-semibold text-purple-800 shadow-sm shadow-purple-200/40 hover:border-purple-400 hover:bg-white hover:shadow-md hover:shadow-purple-300/35 dark:border-primary/35 dark:bg-transparent dark:text-primary dark:hover:bg-primary/10 transition-all"
                  >
                    <FolderOpen size={13} />
                    Open Project
                  </button>
                </article>
              ))}
            </section>
          )}
        </div>
      )}

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

      {showEditWsModal && workspace && (
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
                  {savingWorkspace ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProjectShell>
  );
}
