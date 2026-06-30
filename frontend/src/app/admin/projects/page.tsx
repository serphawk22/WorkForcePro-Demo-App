"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Archive,
  FolderKanban,
  Layers3,
  Users as UsersIcon,
  ExternalLink,
  Loader2,
  Crown,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import NodeFormModal from "@/components/project-management/NodeFormModal";
import WorkspaceFormModal from "@/components/project-management/WorkspaceFormModal";
import {
  getWorkspaces,
  getNodes,
  getAssignableUsers,
  deleteWorkspace,
  archiveNode,
  deleteNode,
  getApiBaseUrl,
  type Workspace,
  type ProjectNode,
  type User,
} from "@/lib/api";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
  archived: "Archived",
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

type NodeModalState = {
  open: boolean;
  mode: "create" | "edit";
  nodeType: "parent" | "child";
  workspaceId: number | null;
  parentNodeId?: number | null;
  parentName?: string | null;
  node?: ProjectNode | null;
};

export default function AdminProjectsPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [nodes, setNodes] = useState<ProjectNode[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [wsModal, setWsModal] = useState<{ open: boolean; workspace: Workspace | null }>({ open: false, workspace: null });
  const [nodeModal, setNodeModal] = useState<NodeModalState>({ open: false, mode: "create", nodeType: "parent", workspaceId: null });

  const load = useCallback(async () => {
    setLoading(true);
    const [wsRes, usersRes] = await Promise.all([getWorkspaces(), getAssignableUsers()]);
    const wsList = wsRes.data || [];
    setWorkspaces(wsList);
    if (usersRes.data) setUsers(usersRes.data);

    const nodeLists = await Promise.all(wsList.map((ws) => getNodes(ws.id, undefined, false, true)));
    const all: ProjectNode[] = [];
    nodeLists.forEach((r) => (r.data || []).forEach((n) => all.push(n)));
    setNodes(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const workspaceMap = useMemo(() => new Map(workspaces.map((w) => [w.id, w])), [workspaces]);

  const stats = useMemo(() => {
    const parents = nodes.filter((n) => n.node_type === "parent").length;
    const children = nodes.filter((n) => n.node_type === "child").length;
    const people = new Set<number>();
    nodes.forEach((n) => {
      if (n.owner_id) people.add(n.owner_id);
      (n.members || []).forEach((m) => people.add(m.user_id));
    });
    return { workspaces: workspaces.length, parents, children, people: people.size };
  }, [nodes, workspaces]);

  const nodeCountFor = useCallback(
    (wsId: number) => {
      const list = nodes.filter((n) => n.workspace_id === wsId);
      return {
        parents: list.filter((n) => n.node_type === "parent").length,
        children: list.filter((n) => n.node_type === "child").length,
      };
    },
    [nodes]
  );

  const onDeleteWorkspace = async (ws: Workspace) => {
    if (!confirm(`Delete workspace "${ws.name}"? It must have no projects.`)) return;
    const res = await deleteWorkspace(ws.id);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Workspace deleted");
    window.dispatchEvent(new Event("workspaces-updated"));
    load();
  };

  const onArchiveNode = async (n: ProjectNode) => {
    if (!confirm(`Archive "${n.name}"?`)) return;
    const res = await archiveNode(n.id);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Node archived");
    load();
  };

  const onDeleteNode = async (n: ProjectNode) => {
    if (!confirm(`Delete "${n.name}"? This cannot be undone.`)) return;
    const res = await deleteNode(n.id);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Node deleted");
    load();
  };

  const openCreateNode = (wsId: number) =>
    setNodeModal({ open: true, mode: "create", nodeType: "parent", workspaceId: wsId });

  const openCreateChild = (n: ProjectNode) =>
    setNodeModal({ open: true, mode: "create", nodeType: "child", workspaceId: n.workspace_id, parentNodeId: n.id, parentName: n.name });

  const openEditNode = (n: ProjectNode) =>
    setNodeModal({ open: true, mode: "edit", nodeType: n.node_type, workspaceId: n.workspace_id, parentNodeId: n.parent_node_id, node: n });

  const statCards = [
    { label: "Workspaces", value: stats.workspaces, icon: <Layers3 size={18} className="text-primary" /> },
    { label: "Parent Nodes", value: stats.parents, icon: <FolderKanban size={18} className="text-primary" /> },
    { label: "Child Nodes", value: stats.children, icon: <Layers3 size={18} className="text-primary" /> },
    { label: "People Assigned", value: stats.people, icon: <UsersIcon size={18} className="text-primary" /> },
  ];

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout role="admin">
        <div className="space-y-5 pb-8">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Workspaces & Nodes</h1>
              <p className="text-sm text-muted-foreground">
                Create workspaces, build the parent → child node hierarchy, and assign nodes to your team.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setWsModal({ open: true, workspace: null })}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus size={16} /> Create Workspace
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Stats */}
              <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {statCards.map((c) => (
                  <div key={c.label} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</p>
                      {c.icon}
                    </div>
                    <p className="mt-2 text-2xl font-bold text-foreground">{c.value}</p>
                  </div>
                ))}
              </section>

              {/* Workspaces */}
              <section>
                <h2 className="mb-3 text-sm font-semibold text-foreground">Workspaces</h2>
                {workspaces.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
                    <p className="text-sm text-muted-foreground">No workspaces yet. Create one to get started.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {workspaces.map((ws) => {
                      const counts = nodeCountFor(ws.id);
                      return (
                        <div key={ws.id} className="rounded-xl border border-border bg-card p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold text-white"
                                style={{ backgroundColor: ws.color || "#6b7280" }}
                              >
                                {ws.icon || ws.name?.[0]?.toUpperCase() || "W"}
                              </span>
                              <div className="min-w-0">
                                <h3 className="truncate text-sm font-semibold text-foreground">{ws.name}</h3>
                                {ws.description && (
                                  <p className="truncate text-xs text-muted-foreground">{ws.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setWsModal({ open: true, workspace: ws })}
                                title="Edit workspace"
                                className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteWorkspace(ws)}
                                title="Delete workspace"
                                className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                            <span>Parent: <span className="font-semibold text-foreground">{counts.parents}</span></span>
                            <span>Child: <span className="font-semibold text-foreground">{counts.children}</span></span>
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openCreateNode(ws.id)}
                              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-2 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                            >
                              <Plus size={13} /> Parent node
                            </button>
                            <button
                              type="button"
                              onClick={() => router.push(`/project-management/nodes?workspace=${ws.id}`)}
                              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
                            >
                              <ExternalLink size={13} /> Open
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* All nodes */}
              <section className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-3 text-sm font-semibold text-foreground">All Nodes</h2>
                {nodes.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No nodes yet. Create a parent node from a workspace above.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="py-2 pr-3 text-left">Node</th>
                          <th className="py-2 pr-3 text-left">Workspace</th>
                          <th className="py-2 pr-3 text-left">Owner</th>
                          <th className="py-2 pr-3 text-left">Members</th>
                          <th className="py-2 pr-3 text-left">Status</th>
                          <th className="py-2 pr-3 text-left">Priority</th>
                          <th className="py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nodes
                          .slice()
                          .sort((a, b) => a.workspace_id - b.workspace_id || (a.parent_node_id || 0) - (b.parent_node_id || 0))
                          .map((n) => {
                            const ws = workspaceMap.get(n.workspace_id);
                            return (
                              <tr key={n.id} className="border-b border-border/60 hover:bg-muted/40">
                                <td className="py-2.5 pr-3">
                                  <div className="flex items-center gap-2">
                                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                      {n.node_type}
                                    </span>
                                    <span className="font-medium text-foreground">{n.name}</span>
                                    {n.public_id && (
                                      <span className="font-mono text-[10px] text-muted-foreground">{n.public_id}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 pr-3 text-muted-foreground">
                                  <span className="inline-flex items-center gap-1.5">
                                    <span
                                      className="inline-flex h-2.5 w-2.5 rounded-full"
                                      style={{ backgroundColor: ws?.color || "#6b7280" }}
                                    />
                                    {ws?.name || "-"}
                                  </span>
                                </td>
                                <td className="py-2.5 pr-3">
                                  {n.owner_name ? (
                                    <span className="inline-flex items-center gap-1 text-foreground">
                                      <Crown size={12} className="text-amber-500" />
                                      {n.owner_name}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">Unassigned</span>
                                  )}
                                </td>
                                <td className="py-2.5 pr-3">
                                  {n.members && n.members.length > 0 ? (
                                    <div className="flex items-center gap-1.5">
                                      <div className="flex -space-x-2">
                                        {n.members.slice(0, 4).map((m) => (
                                          <Avatar key={m.id} className="h-6 w-6 border border-card" title={m.user_name || undefined}>
                                            <AvatarImage src={avatarUrl(m.user_profile_picture)} alt={m.user_name || ""} />
                                            <AvatarFallback className="text-[9px]">
                                              {m.user_name ? initials(m.user_name) : "?"}
                                            </AvatarFallback>
                                          </Avatar>
                                        ))}
                                      </div>
                                      {n.members.length > 4 && (
                                        <span className="text-xs text-muted-foreground">+{n.members.length - 4}</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">None</span>
                                  )}
                                </td>
                                <td className="py-2.5 pr-3">
                                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                                    {STATUS_LABEL[n.status] || n.status}
                                  </span>
                                </td>
                                <td className="py-2.5 pr-3">
                                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${PRIORITY_CLASS[n.priority] || ""}`}>
                                    {n.priority}
                                  </span>
                                </td>
                                <td className="py-2.5">
                                  <div className="flex items-center justify-end gap-1">
                                    {n.node_type === "parent" && (
                                      <button
                                        type="button"
                                        onClick={() => openCreateChild(n)}
                                        title="Add child node"
                                        className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                                      >
                                        <Plus size={14} />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => openEditNode(n)}
                                      title="Edit & assign"
                                      className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onArchiveNode(n)}
                                      title="Archive"
                                      className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                                    >
                                      <Archive size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteNode(n)}
                                      title="Delete"
                                      className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        <WorkspaceFormModal
          open={wsModal.open}
          workspace={wsModal.workspace}
          onClose={() => setWsModal({ open: false, workspace: null })}
          onSaved={() => load()}
        />

        {nodeModal.workspaceId != null && (
          <NodeFormModal
            open={nodeModal.open}
            mode={nodeModal.mode}
            nodeType={nodeModal.nodeType}
            workspaceId={nodeModal.workspaceId}
            parentNodeId={nodeModal.parentNodeId}
            parentName={nodeModal.parentName}
            node={nodeModal.node}
            users={users}
            onClose={() => setNodeModal((m) => ({ ...m, open: false }))}
            onSaved={() => load()}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
