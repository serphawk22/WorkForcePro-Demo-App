"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { createWorkspace, updateWorkspace, type Workspace } from "@/lib/api";
import { toast } from "sonner";

const COLOR_OPTIONS = [
  { value: "#7C3AED", label: "Purple" },
  { value: "#2563EB", label: "Blue" },
  { value: "#EA580C", label: "Orange" },
  { value: "#16A34A", label: "Green" },
  { value: "#DB2777", label: "Pink" },
  { value: "#0891B2", label: "Cyan" },
];

const pickerValue = (color: string) => (/^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#7C3AED");

interface WorkspaceFormModalProps {
  open: boolean;
  /** The workspace being edited (omit / null for create). */
  workspace?: Workspace | null;
  onClose: () => void;
  onSaved: (ws: Workspace) => void;
}

export default function WorkspaceFormModal({ open, workspace, onClose, onSaved }: WorkspaceFormModalProps) {
  const mode = workspace ? "edit" : "create";
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("#7C3AED");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(workspace?.name || "");
    setDescription(workspace?.description || "");
    setIcon(workspace?.icon || "");
    setColor(workspace?.color || "#7C3AED");
  }, [open, workspace]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Workspace name is required");
      return;
    }
    setSaving(true);
    const res =
      mode === "create"
        ? await createWorkspace({ name: trimmed, description: description || undefined, icon: icon || undefined, color: color || undefined })
        : await updateWorkspace(workspace!.id, { name: trimmed, description: description || "", icon: icon || undefined, color: color || undefined });
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (res.data) {
      toast.success(mode === "create" ? "Workspace created" : "Workspace updated");
      window.dispatchEvent(new Event("workspaces-updated"));
      onSaved(res.data);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">{mode === "create" ? "Create Workspace" : "Edit Workspace"}</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workspace Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this workspace"
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Short Label</label>
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="Optional"
                maxLength={3}
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={pickerValue(color)}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-8 w-10 rounded border border-border bg-background p-0.5"
                />
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      title={c.label}
                      className={`h-6 w-6 rounded-md border ${color === c.value ? "ring-2 ring-primary/50" : "border-border"}`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>
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
