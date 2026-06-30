"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  FolderKanban,
  Layers,
  Loader2,
  CircleDot,
  Pencil,
  Archive,
  Trash2,
  Crown,
  Users as UsersIcon,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import NodeFormModal from "@/components/project-management/NodeFormModal";
import {
  getWorkspaces,
  getWorkspaceTree,
  getMyNodes,
  getNode,
  getNodeTasks,
  getAssignableUsers,
  archiveNode,
  deleteNode,
  getApiBaseUrl,
  Workspace,
  NodeTreeNode,
  ProjectNode,
  Task,
  User,
} from "@/lib/api";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
  archived: "Archived",
  submitted: "Submitted",
  reviewing: "Reviewing",
  approved: "Approved",
  rejected: "Rejected",
};

const PRIORITY_CLASS: Record<string, string> = {
  high: "bg-red-500/10 text-red-600",
  medium: "bg-amber-500/10 text-amber-600",
  low: "bg-emerald-500/10 text-emerald-600",
};

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function avatarUrl(profilePicture?: string | null) {
  if (!profilePicture) return undefined;
  if (profilePicture.startsWith("data:") || profilePicture.startsWith("http")) return profilePicture;
  return `${getApiBaseUrl()}${profilePicture}`;
}

type ModalState = {
  open: boolean;
  mode: "create" | "edit";
  nodeType: "parent" | "child";
  parentNodeId?: number | null;
  parentName?: string | null;
  node?: ProjectNode | null;
};

function NodesPageInner() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = user?.role === "admin";

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [tree, setTree] = useState<NodeTreeNode[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [nodeDetail, setNodeDetail] = useState<ProjectNode | null>(null);
  const [nodeTasks, setNodeTasks] = useState<Task[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [modal, setModal] = useState<ModalState>({ open: false, mode: "create", nodeType: "parent" });

  // Load workspaces (admins: all; workers: only those containing assigned nodes) + assignable users.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoadingWorkspaces(true);
      const wsRes = await getWorkspaces();
      let list = wsRes.data || [];
      if (user.role !== "admin") {
        const mineRes = await getMyNodes();
        const wsIds = new Set((mineRes.data || []).map((n) => n.workspace_id));
        list = list.filter((w) => wsIds.has(w.id));
      } else {
        const usersRes = await getAssignableUsers();
        if (!cancelled && usersRes.data) setUsers(usersRes.data);
      }
      if (cancelled) return;
      setWorkspaces(list);
      const qsWs = Number(searchParams?.get("workspace"));
      if (qsWs && list.some((w) => w.id === qsWs)) setWorkspaceId(qsWs);
      else if (list.length > 0) setWorkspaceId(list[0].id);
      else setWorkspaceId(null);
      setLoadingWorkspaces(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, user]);

  const loadTree = useCallback(
    async (wsId: number) => {
      setLoadingTree(true);
      const res = await getWorkspaceTree(wsId, user?.role !== "admin");
      setTree(res.data || []);
      setLoadingTree(false);
    },
    [user]
  );

  useEffect(() => {
    if (workspaceId != null) {
      loadTree(workspaceId);
      setSelectedNodeId(null);
      setNodeDetail(null);
      setNodeTasks([]);
    }
  }, [workspaceId, loadTree]);

  const loadNode = useCallback(async (nodeId: number) => {
    setSelectedNodeId(nodeId);
    setLoadingDetail(true);
    const [detail, tasks] = await Promise.all([getNode(nodeId), getNodeTasks(nodeId)]);
    setNodeDetail(detail.data || null);
    setNodeTasks(tasks.data || []);
    setLoadingDetail(false);
  }, []);

  const openCreateParent = () => setModal({ open: true, mode: "create", nodeType: "parent" });
  const openCreateChild = (parent: NodeTreeNode) =>
    setModal({ open: true, mode: "create", nodeType: "child", parentNodeId: parent.id, parentName: parent.name });

  const openEditNode = async (nodeId: number) => {
    const res = await getNode(nodeId);
    if (res.error || !res.data) {
      toast.error(res.error || "Failed to load node");
      return;
    }
    setModal({
      open: true,
      mode: "edit",
      nodeType: res.data.node_type,
      parentNodeId: res.data.parent_node_id,
      node: res.data,
    });
  };

  const handleSaved = async (saved: ProjectNode) => {
    if (workspaceId != null) await loadTree(workspaceId);
    if (modal.mode === "create" && modal.nodeType === "child" && modal.parentNodeId != null) {
      setExpanded((prev) => ({ ...prev, [modal.parentNodeId!]: true }));
    }
    if (selectedNodeId === saved.id || modal.mode === "create") {
      await loadNode(saved.id);
    }
  };

  const handleArchive = async (node: ProjectNode) => {
    if (!confirm(`Archive "${node.name}"? It will be hidden from the active tree.`)) return;
    const res = await archiveNode(node.id);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Node archived");
    if (workspaceId != null) await loadTree(workspaceId);
    if (selectedNodeId === node.id) {
      setSelectedNodeId(null);
      setNodeDetail(null);
      setNodeTasks([]);
    }
  };

  const handleDelete = async (node: ProjectNode) => {
    if (!confirm(`Delete "${node.name}"? This cannot be undone.`)) return;
    const res = await deleteNode(node.id);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Node deleted");
    if (workspaceId != null) await loadTree(workspaceId);
    if (selectedNodeId === node.id) {
      setSelectedNodeId(null);
      setNodeDetail(null);
      setNodeTasks([]);
    }
  };

  const activeWorkspace = workspaces.find((w) => w.id === workspaceId) || null;

  return (
    <ProtectedRoute>
      <DashboardLayout
        role={(user?.role as "admin" | "employee") || "employee"}
        userName={user?.name || "User"}
        userHandle={`@${user?.email?.split("@")[0] || "user"}`}
      >
        <div className="space-y-5 pb-8">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Project Management</h1>
              <p className="text-sm text-muted-foreground">
                {isAdmin
                  ? "Workspace → Parent Node → Child Node → Tasks"
                  : "Projects assigned to you"}
              </p>
            </div>
            <select
              value={workspaceId ?? ""}
              onChange={(e) => setWorkspaceId(Number(e.target.value))}
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary"
            >
              {workspaces.length === 0 && <option value="">No workspaces</option>}
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>

          {!loadingWorkspaces && workspaces.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
              <Layers className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {isAdmin
                  ? "No workspaces yet. Create one from the Project Management overview to get started."
                  : "No projects have been assigned to you yet."}
              </p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
              {/* Left: node tree */}
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {activeWorkspace?.name || "Workspace"}
                  </span>
                  {isAdmin && workspaceId != null && (
                    <button
                      type="button"
                      onClick={openCreateParent}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <Plus size={13} /> Parent node
                    </button>
                  )}
                </div>

                {loadingTree ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : tree.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                    {isAdmin
                      ? "No parent nodes yet. Create one above."
                      : "No nodes assigned to you in this workspace."}
                  </p>
                ) : (
                  <ul className="space-y-0.5">
                    {tree.map((parent) => {
                      const isOpen = expanded[parent.id] ?? true;
                      return (
                        <li key={parent.id}>
                          <div
                            className={`group flex items-center gap-1 rounded-md px-1.5 py-1.5 hover:bg-secondary/60 ${
                              selectedNodeId === parent.id ? "bg-primary/10" : ""
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setExpanded((p) => ({ ...p, [parent.id]: !isOpen }))}
                              className="text-muted-foreground"
                              aria-label={isOpen ? "Collapse" : "Expand"}
                            >
                              {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => loadNode(parent.id)}
                              className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                            >
                              <FolderKanban size={14} className="shrink-0 text-primary" />
                              <span className="flex-1 truncate text-sm font-medium text-foreground">{parent.name}</span>
                            </button>
                            <span className="rounded bg-secondary px-1.5 text-[10px] text-muted-foreground">
                              {parent.task_count}
                            </span>
                            {isAdmin && (
                              <div className="hidden items-center gap-0.5 group-hover:flex">
                                <button
                                  type="button"
                                  onClick={() => openCreateChild(parent)}
                                  title="Add child node"
                                  className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                                >
                                  <Plus size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditNode(parent.id)}
                                  title="Edit node"
                                  className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                                >
                                  <Pencil size={12} />
                                </button>
                              </div>
                            )}
                          </div>

                          {isOpen && (
                            <ul className="ml-5 border-l border-border pl-2">
                              {parent.children.map((child) => (
                                <li key={child.id}>
                                  <button
                                    type="button"
                                    onClick={() => loadNode(child.id)}
                                    className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                                      selectedNodeId === child.id
                                        ? "bg-primary/10 text-foreground"
                                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                                    }`}
                                  >
                                    <Layers size={13} className="shrink-0" />
                                    <span className="flex-1 truncate">{child.name}</span>
                                    {isAdmin && (
                                      <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openEditNode(child.id);
                                        }}
                                        title="Edit node"
                                        className="hidden rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground group-hover:inline-flex"
                                      >
                                        <Pencil size={11} />
                                      </span>
                                    )}
                                    <span className="text-[10px]">{child.task_count}</span>
                                  </button>
                                </li>
                              ))}
                              {isAdmin && (
                                <li className="px-2 py-1">
                                  <button
                                    type="button"
                                    onClick={() => openCreateChild(parent)}
                                    className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                                  >
                                    <Plus size={12} /> Child node
                                  </button>
                                </li>
                              )}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Right: node detail + tasks */}
              <div className="rounded-xl border border-border bg-card p-5">
                {!selectedNodeId ? (
                  <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center text-muted-foreground">
                    <Layers className="mb-3 h-10 w-10 opacity-30" />
                    <p className="text-sm">Select a node to view its details and tasks.</p>
                  </div>
                ) : loadingDetail ? (
                  <div className="flex min-h-[300px] items-center justify-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : nodeDetail ? (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {nodeDetail.public_id && (
                            <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-muted-foreground">
                              {nodeDetail.public_id}
                            </span>
                          )}
                          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                            {nodeDetail.node_type}
                          </span>
                          <h2 className="text-lg font-semibold text-foreground">{nodeDetail.name}</h2>
                        </div>
                        {nodeDetail.description && (
                          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{nodeDetail.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                          {STATUS_LABEL[nodeDetail.status] || nodeDetail.status}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 ${PRIORITY_CLASS[nodeDetail.priority] || ""}`}>
                          {nodeDetail.priority}
                        </span>
                      </div>
                    </div>

                    {/* Admin actions */}
                    {isAdmin && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditNode(nodeDetail.id)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
                        >
                          <Pencil size={12} /> Edit & assign
                        </button>
                        {nodeDetail.node_type === "parent" && (
                          <button
                            type="button"
                            onClick={() =>
                              setModal({
                                open: true,
                                mode: "create",
                                nodeType: "child",
                                parentNodeId: nodeDetail.id,
                                parentName: nodeDetail.name,
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
                          >
                            <Plus size={12} /> Add child
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleArchive(nodeDetail)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
                        >
                          <Archive size={12} /> Archive
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(nodeDetail)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-red-500/40 px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}

                    {/* Owner + members */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Crown size={14} className="text-amber-500" />
                        <span className="text-xs text-muted-foreground">Owner:</span>
                        {nodeDetail.owner_name ? (
                          <span className="text-xs font-medium text-foreground">{nodeDetail.owner_name}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <UsersIcon size={14} className="text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Members:</span>
                        {nodeDetail.members && nodeDetail.members.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <div className="flex -space-x-2">
                              {nodeDetail.members.slice(0, 6).map((m) => (
                                <Avatar key={m.id} className="h-6 w-6 border border-card" title={m.user_name || undefined}>
                                  <AvatarImage src={avatarUrl(m.user_profile_picture)} alt={m.user_name || ""} />
                                  <AvatarFallback className="text-[9px]">
                                    {m.user_name ? initials(m.user_name) : "?"}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                            {nodeDetail.members.length > 6 && (
                              <span className="text-xs text-muted-foreground">+{nodeDetail.members.length - 6}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </div>
                    </div>

                    {/* progress */}
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{nodeDetail.progress ?? 0}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${nodeDetail.progress ?? 0}%` }} />
                      </div>
                    </div>

                    {/* tasks */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">
                          Tasks <span className="text-muted-foreground">({nodeTasks.length})</span>
                        </h3>
                        {isAdmin && nodeDetail.node_type === "child" && (
                          <button
                            type="button"
                            onClick={() => router.push(`/tasks?node=${nodeDetail.id}&workspace=${nodeDetail.workspace_id}&create=1`)}
                            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                          >
                            <Plus size={13} /> New task
                          </button>
                        )}
                      </div>
                      {nodeTasks.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                          {nodeDetail.node_type === "parent"
                            ? "Tasks live on child nodes. Open a child node to see its tasks."
                            : "No tasks in this node yet."}
                        </p>
                      ) : (
                        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                          {nodeTasks.map((t) => (
                            <li
                              key={t.id}
                              onClick={() => router.push(`/project-management/${t.id}`)}
                              className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-secondary/50"
                            >
                              <CircleDot size={14} className="shrink-0 text-muted-foreground" />
                              <span className="flex-1 truncate text-sm text-foreground">{t.title}</span>
                              {t.assignee_name && (
                                <span className="hidden truncate text-xs text-muted-foreground sm:block">{t.assignee_name}</span>
                              )}
                              <span className={`rounded-full px-2 py-0.5 text-[10px] ${PRIORITY_CLASS[t.priority] || ""}`}>
                                {t.priority}
                              </span>
                              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                                {STATUS_LABEL[t.status] || t.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Node not found.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {isAdmin && workspaceId != null && (
          <NodeFormModal
            open={modal.open}
            mode={modal.mode}
            nodeType={modal.nodeType}
            workspaceId={workspaceId}
            parentNodeId={modal.parentNodeId}
            parentName={modal.parentName}
            node={modal.node}
            users={users}
            onClose={() => setModal((m) => ({ ...m, open: false }))}
            onSaved={handleSaved}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function NodesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <NodesPageInner />
    </Suspense>
  );
}
