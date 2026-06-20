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
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import {
  getWorkspaces,
  getWorkspaceTree,
  getNode,
  getNodeTasks,
  createNode,
  Workspace,
  NodeTreeNode,
  ProjectNode,
  Task,
} from "@/lib/api";

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

function InlineCreate({ placeholder, onCreate }: { placeholder: string; onCreate: (name: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <Plus size={13} /> {placeholder}
      </button>
    );
  }

  const submit = async () => {
    const name = value.trim();
    if (!name) return;
    setSaving(true);
    await onCreate(name);
    setSaving(false);
    setValue("");
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        className="h-7 w-44 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
      />
      <button
        type="button"
        onClick={submit}
        disabled={saving}
        className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
      >
        {saving ? "…" : "Add"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="px-1 text-xs text-muted-foreground hover:text-foreground">
        Cancel
      </button>
    </div>
  );
}

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

  useEffect(() => {
    getWorkspaces().then((res) => {
      if (res.data) {
        setWorkspaces(res.data);
        const qsWs = Number(searchParams?.get("workspace"));
        if (qsWs && res.data.some((w) => w.id === qsWs)) setWorkspaceId(qsWs);
        else if (res.data.length > 0) setWorkspaceId(res.data[0].id);
      }
    });
  }, [searchParams]);

  const loadTree = useCallback(async (wsId: number) => {
    setLoadingTree(true);
    const res = await getWorkspaceTree(wsId);
    setTree(res.data || []);
    setLoadingTree(false);
  }, []);

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

  const handleCreateParent = async (name: string) => {
    if (workspaceId == null) return;
    await createNode({ workspace_id: workspaceId, name });
    await loadTree(workspaceId);
  };

  const handleCreateChild = async (parentNodeId: number, name: string) => {
    if (workspaceId == null) return;
    await createNode({ workspace_id: workspaceId, parent_node_id: parentNodeId, name });
    await loadTree(workspaceId);
    setExpanded((prev) => ({ ...prev, [parentNodeId]: true }));
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
                Workspace → Parent Node → Child Node → Tasks
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

          <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
            {/* Left: node tree */}
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {activeWorkspace?.name || "Workspace"}
                </span>
                {isAdmin && workspaceId != null && (
                  <InlineCreate placeholder="Parent node" onCreate={handleCreateParent} />
                )}
              </div>

              {loadingTree ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : tree.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  No parent nodes yet.{isAdmin ? " Create one above." : ""}
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {tree.map((parent) => {
                    const isOpen = expanded[parent.id] ?? true;
                    return (
                      <li key={parent.id}>
                        <div className="flex items-center gap-1 rounded-md px-1.5 py-1.5 hover:bg-secondary/60">
                          <button
                            type="button"
                            onClick={() => setExpanded((p) => ({ ...p, [parent.id]: !isOpen }))}
                            className="text-muted-foreground"
                          >
                            {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </button>
                          <FolderKanban size={14} className="shrink-0 text-primary" />
                          <span className="flex-1 truncate text-sm font-medium text-foreground">{parent.name}</span>
                          <span className="rounded bg-secondary px-1.5 text-[10px] text-muted-foreground">
                            {parent.task_count}
                          </span>
                        </div>

                        {isOpen && (
                          <ul className="ml-5 border-l border-border pl-2">
                            {parent.children.map((child) => (
                              <li key={child.id}>
                                <button
                                  type="button"
                                  onClick={() => loadNode(child.id)}
                                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                                    selectedNodeId === child.id
                                      ? "bg-primary/10 text-foreground"
                                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                                  }`}
                                >
                                  <Layers size={13} className="shrink-0" />
                                  <span className="flex-1 truncate">{child.name}</span>
                                  <span className="text-[10px]">{child.task_count}</span>
                                </button>
                              </li>
                            ))}
                            {isAdmin && (
                              <li className="px-2 py-1">
                                <InlineCreate
                                  placeholder="Child node"
                                  onCreate={(name) => handleCreateChild(parent.id, name)}
                                />
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
                  <p className="text-sm">Select a child node to view its tasks.</p>
                </div>
              ) : loadingDetail ? (
                <div className="flex min-h-[300px] items-center justify-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : nodeDetail ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {nodeDetail.public_id && (
                          <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-muted-foreground">
                            {nodeDetail.public_id}
                          </span>
                        )}
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
                      {isAdmin && (
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
                        No tasks in this node yet.
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
        </div>
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
