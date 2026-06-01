/**
 * Task Owner Management Component
 * Allows users to add, remove, and transfer project/task ownership
 */

"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, Crown, Users, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface TaskOwner {
  id: number;
  task_id: number;
  user_id: number;
  is_primary: boolean;
  created_at: string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface TaskOwnerManagementProps {
  taskId: number;
  isOpen: boolean;
  onClose: () => void;
  onOwnershipChanged?: () => void;
  currentUserRole?: string;
  isCurrentOwner?: boolean;
}

export function TaskOwnerManagement({
  taskId,
  isOpen,
  onClose,
  onOwnershipChanged,
  currentUserRole,
  isCurrentOwner = false,
}: TaskOwnerManagementProps) {
  const [owners, setOwners] = useState<TaskOwner[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isAddingOwner, setIsAddingOwner] = useState(false);
  const [isDeletingOwnerId, setIsDeletingOwnerId] = useState<number | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferToUserId, setTransferToUserId] = useState<string>("");
  const [removeOldOwners, setRemoveOldOwners] = useState(false);

  const canManage = currentUserRole === "admin" || isCurrentOwner;

  // Fetch current owners
  useEffect(() => {
    if (isOpen) {
      fetchOwners();
    }
  }, [isOpen, taskId]);

  // Fetch available users for selection
  useEffect(() => {
    if (isOpen && (selectedUserId || transferToUserId)) {
      fetchAvailableUsers();
    }
  }, [isOpen, selectedUserId, transferToUserId]);

  const fetchOwners = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/tasks/${taskId}/owners`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch owners");
      }

      const data = await response.json();
      setOwners(data);
    } catch (error) {
      console.error("Error fetching owners:", error);
      toast.error("Failed to load task owners");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await fetch(`/api/users`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      // Filter out existing owners
      const existingOwnerIds = owners.map(o => o.user_id);
      setAvailableUsers(data.filter((u: User) => !existingOwnerIds.includes(u.id)));
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load available users");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleAddOwner = async () => {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    try {
      setIsAddingOwner(true);
      const response = await fetch(`/api/tasks/${taskId}/owners`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          user_id: parseInt(selectedUserId),
          is_primary: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to add owner");
      }

      toast.success("Owner added successfully");
      setSelectedUserId("");
      fetchOwners();
      onOwnershipChanged?.();
    } catch (error) {
      console.error("Error adding owner:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add owner");
    } finally {
      setIsAddingOwner(false);
    }
  };

  const handleRemoveOwner = async (ownerId: number) => {
    if (owners.length <= 1) {
      toast.error("Cannot remove the last owner");
      return;
    }

    try {
      setIsDeletingOwnerId(ownerId);
      const response = await fetch(`/api/tasks/${taskId}/owners/${ownerId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to remove owner");
      }

      toast.success("Owner removed successfully");
      fetchOwners();
      onOwnershipChanged?.();
    } catch (error) {
      console.error("Error removing owner:", error);
      toast.error("Failed to remove owner");
    } finally {
      setIsDeletingOwnerId(null);
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferToUserId) {
      toast.error("Please select a user to transfer ownership to");
      return;
    }

    try {
      setIsTransferring(true);
      const response = await fetch(
        `/api/tasks/${taskId}/owners/transfer/${transferToUserId}?remove_old_owners=${removeOldOwners}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to transfer ownership");
      }

      toast.success("Ownership transferred successfully");
      setTransferToUserId("");
      setRemoveOldOwners(false);
      fetchOwners();
      onOwnershipChanged?.();
    } catch (error) {
      console.error("Error transferring ownership:", error);
      toast.error(error instanceof Error ? error.message : "Failed to transfer ownership");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleSetPrimary = async (ownerId: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/owners/${ownerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ is_primary: true }),
      });

      if (!response.ok) {
        throw new Error("Failed to set primary owner");
      }

      toast.success("Primary owner updated");
      fetchOwners();
      onOwnershipChanged?.();
    } catch (error) {
      console.error("Error setting primary owner:", error);
      toast.error("Failed to set primary owner");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={20} />
            Manage Task Owners
          </DialogTitle>
          <DialogDescription>
            Add, remove, or transfer project ownership. The primary owner can manage all aspects of the project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Owners Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Current Owners</h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              </div>
            ) : owners.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                No owners assigned yet
              </div>
            ) : (
              <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
                {owners.map((owner) => (
                  <div
                    key={owner.id}
                    className="flex items-center justify-between p-3 bg-background rounded border"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{owner.user_name}</p>
                        <p className="text-xs text-muted-foreground">{owner.user_email}</p>
                      </div>
                      {owner.is_primary && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                          <Crown size={14} className="text-amber-600" />
                          <span className="text-xs font-medium text-amber-600">Primary</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {canManage && !owner.is_primary && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSetPrimary(owner.id)}
                          title="Set as primary owner"
                        >
                          <Crown size={14} />
                        </Button>
                      )}
                      {canManage && owners.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveOwner(owner.id)}
                          disabled={isDeletingOwnerId === owner.id}
                          className="text-destructive hover:text-destructive"
                        >
                          {isDeletingOwnerId === owner.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Owner Section */}
          {canManage && (
            <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
              <h3 className="font-semibold text-sm">Add New Owner</h3>
              <div className="flex gap-2">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  disabled={isLoadingUsers || isAddingOwner}
                  className="flex-1 px-3 py-2 rounded border border-input bg-background text-sm"
                >
                  <option value="">Select a user to add as owner...</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleAddOwner}
                  disabled={!selectedUserId || isAddingOwner}
                  size="sm"
                >
                  {isAddingOwner ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Transfer Ownership Section */}
          {canManage && owners.length > 0 && (
            <div className="space-y-3 border rounded-lg p-4 bg-blue-50/30 dark:bg-blue-950/20 border-blue-200/30">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-blue-600" />
                <h3 className="font-semibold text-sm">Transfer Ownership</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Transfer primary ownership to another user. Optionally remove all previous owners.
              </p>
              <div className="space-y-2">
                <select
                  value={transferToUserId}
                  onChange={(e) => setTransferToUserId(e.target.value)}
                  disabled={isTransferring}
                  className="w-full px-3 py-2 rounded border border-input bg-background text-sm"
                >
                  <option value="">Select a user to transfer ownership to...</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={removeOldOwners}
                    onChange={(e) => setRemoveOldOwners(e.target.checked)}
                    disabled={isTransferring}
                    className="rounded border-input"
                  />
                  <span className="text-xs">Remove all previous owners</span>
                </label>
                <Button
                  onClick={handleTransferOwnership}
                  disabled={!transferToUserId || isTransferring}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  {isTransferring ? (
                    <Loader2 size={14} className="animate-spin mr-2" />
                  ) : null}
                  Transfer Ownership
                </Button>
              </div>
            </div>
          )}

          {!canManage && (
            <div className="p-3 rounded border border-yellow-200/30 bg-yellow-50/30 dark:bg-yellow-950/20">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                Only project owners and admins can manage ownership.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
