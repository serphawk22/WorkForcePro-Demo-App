"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { DropdownMenu, type DropdownOption } from "@/components/ui/themed-dropdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  createNode,
  updateNode,
  getApiBaseUrl,
  type NodeStatus,
  type ProjectNode,
  type User,
} from "@/lib/api";
import { toast } from "sonner";

type Priority = "low" | "medium" | "high";

interface NodeFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  /** Type of node being created/edited. Child create requires parentNodeId. */
  nodeType: "parent" | "child";
  workspaceId: number;
  /** Required when creating a child node. */
  parentNodeId?: number | null;
  /** The node being edited (mode === "edit"). */
  node?: ProjectNode | null;
  /** Assignable users for owner/member selection. */
  users: User[];
  /** Optional label for the parent node, shown as context when creating a child. */
  parentName?: string | null;
  onClose: () => void;
  onSaved: (node: ProjectNode) => void;
}

const PRIORITY_OPTIONS: DropdownOption[] = [
  { value: "low", label: "Low", icon: <span className="text-emerald-500">●</span> },
  { value: "medium", label: "Medium", icon: <span className="text-amber-500">●</span> },
  { value: "high", label: "High", icon: <span className="text-red-500">●</span> },
];

const STATUS_OPTIONS: DropdownOption[] = [
  { value: "todo", label: "To Do", icon: <span className="text-zinc-400">●</span> },
  { value: "in_progress", label: "In Progress", icon: <span className="text-blue-500">●</span> },
  { value: "blocked", label: "Blocked", icon: <span className="text-red-500">●</span> },
  { value: "done", label: "Done", icon: <span className="text-emerald-500">●</span> },
];

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function avatarUrl(profilePicture?: string | null) {
  if (!profilePicture) return undefined;
  if (profilePicture.startsWith("data:") || profilePicture.startsWith("http")) return profilePicture;
  return `${getApiBaseUrl()}${profilePicture}`;
}

export default function NodeFormModal({
  open,
  mode,
  nodeType,
  workspaceId,
  parentNodeId,
  node,
  users,
  parentName,
  onClose,
  onSaved,
}: NodeFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState<string>("");
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [priority, setPriority] = useState<Priority>("medium");
  const [statusVal, setStatusVal] = useState<NodeStatus>("todo");
  const [dueDate, setDueDate] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  // Hydrate the form whenever the modal opens (or the target node changes).
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && node) {
      setName(node.name || "");
      setDescription(node.description || "");
      setOwnerId(node.owner_id ? String(node.owner_id) : "");
      setMemberIds((node.members || []).map((m) => m.user_id));
      setPriority((node.priority as Priority) || "medium");
      setStatusVal(node.status === "archived" ? "todo" : node.status);
      setDueDate(node.due_date ? node.due_date.slice(0, 10) : "");
    } else {
      setName("");
      setDescription("");
      setOwnerId("");
      setMemberIds([]);
      setPriority("medium");
      setStatusVal("todo");
      setDueDate("");
    }
    setMemberSearch("");
  }, [open, mode, node]);

  const ownerOptions: DropdownOption[] = useMemo(
    () => [
      { value: "", label: "Unassigned" },
      ...users.map((u) => ({
        value: String(u.id),
        label: u.name,
        avatarSrc: avatarUrl(u.profile_picture),
        avatarFallback: initials(u.name),
      })),
    ],
    [users]
  );

  const filteredUsers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, memberSearch]);

  const selectedMembers = useMemo(
    () => users.filter((u) => memberIds.includes(u.id)),
    [users, memberIds]
  );

  if (!open) return null;

  const toggleMember = (id: number) => {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const title =
    mode === "create"
      ? nodeType === "parent"
        ? "Create parent node"
        : "Create child node"
      : `Edit ${nodeType} node`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Node name is required");
      return;
    }
    if (mode === "create" && nodeType === "child" && !parentNodeId) {
      toast.error("Missing parent node");
      return;
    }

    setSaving(true);
    const ownerVal = ownerId ? Number(ownerId) : null;
    const res =
      mode === "create"
        ? await createNode({
            workspace_id: workspaceId,
            parent_node_id: nodeType === "child" ? parentNodeId ?? undefined : undefined,
            name: trimmed,
            description: description.trim() || undefined,
            owner_id: ownerVal,
            priority,
            status: statusVal,
            due_date: dueDate || undefined,
            member_ids: memberIds,
          })
        : await updateNode(node!.id, {
            name: trimmed,
            description: description.trim(),
            owner_id: ownerVal,
            priority,
            status: statusVal,
            due_date: dueDate || undefined,
            member_ids: memberIds,
          });
    setSaving(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (res.data) {
      toast.success(mode === "create" ? "Node created" : "Node updated");
      onSaved(res.data);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-foreground">{title}</h3>
            {nodeType === "child" && parentName && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Under <span className="font-medium text-foreground">{parentName}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={nodeType === "parent" ? "e.g. Payments Revamp" : "e.g. Checkout flow"}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              maxLength={200}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this node about?"
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Owner</label>
              <DropdownMenu
                value={ownerId}
                onValueChange={setOwnerId}
                options={ownerOptions}
                placeholder="Unassigned"
                triggerClassName="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Priority</label>
              <DropdownMenu
                value={priority}
                onValueChange={(v) => setPriority(v as Priority)}
                options={PRIORITY_OPTIONS}
                triggerClassName="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</label>
              <DropdownMenu
                value={statusVal}
                onValueChange={(v) => setStatusVal(v as NodeStatus)}
                options={STATUS_OPTIONS}
                triggerClassName="w-full"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          {/* Members — these are the workers the node is "assigned" to. */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Members <span className="text-muted-foreground/70">({memberIds.length})</span>
            </label>
            {selectedMembers.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {selectedMembers.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary py-0.5 pl-1 pr-2 text-xs text-foreground"
                  >
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={avatarUrl(u.profile_picture)} alt={u.name} />
                      <AvatarFallback className="text-[8px]">{initials(u.name)}</AvatarFallback>
                    </Avatar>
                    {u.name}
                    <button
                      type="button"
                      onClick={() => toggleMember(u.id)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Remove ${u.name}`}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="rounded-lg border border-border bg-background">
              <div className="flex items-center gap-2 border-b border-border px-2.5 py-1.5">
                <Search size={13} className="text-muted-foreground" />
                <input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search people…"
                  className="w-full bg-transparent text-xs text-foreground outline-none"
                />
              </div>
              <ul className="max-h-40 overflow-y-auto py-1">
                {filteredUsers.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-muted-foreground">No people found.</li>
                ) : (
                  filteredUsers.map((u) => {
                    const checked = memberIds.includes(u.id);
                    return (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => toggleMember(u.id)}
                          className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-secondary/60"
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              checked ? "border-primary bg-primary text-primary-foreground" : "border-border"
                            }`}
                          >
                            {checked && <Check size={11} />}
                          </span>
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={avatarUrl(u.profile_picture)} alt={u.name} />
                            <AvatarFallback className="text-[9px]">{initials(u.name)}</AvatarFallback>
                          </Avatar>
                          <span className="flex-1 truncate text-foreground">{u.name}</span>
                          <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">{u.role}</span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {mode === "create" ? "Create" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
