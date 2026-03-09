"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, XCircle, Clock, RefreshCw, UserCheck, Users, ArrowUpRight } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  getAllUsers,
  approveUser,
  rejectUser,
  type UserProfile,
} from "@/lib/api";

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

const statusBadge: Record<string, { label: string; classes: string }> = {
  PENDING:  { label: "Pending",  classes: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300/60" },
  APPROVED: { label: "Approved", classes: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border border-green-300/60" },
  REJECTED: { label: "Rejected", classes: "bg-red-100  text-red-700  dark:bg-red-900/40  dark:text-red-300  border border-red-300/60"  },
};

export default function UserApprovalsPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("PENDING");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [ripple, setRipple] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const result = await getAllUsers();
    if (result.data) {
      setUsers(result.data);
    } else if (result.error) {
      setLoadError("Unable to load users. Please ensure the backend is running.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleApprove = async (userId: number, userName: string) => {
    setActionLoading(userId);
    const result = await approveUser(userId);
    if (result.data) {
      showToast(`✅ ${userName} has been approved.`);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: "APPROVED" as const } : u))
      );
    } else {
      showToast("Failed to approve user. Please try again.", "error");
    }
    setActionLoading(null);
  };

  const handleReject = async (userId: number, userName: string) => {
    setActionLoading(userId);
    const result = await rejectUser(userId);
    if (result.data) {
      showToast(`❌ ${userName} has been rejected.`, "error");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: "REJECTED" as const } : u))
      );
    } else {
      showToast("Failed to reject user. Please try again.", "error");
    }
    setActionLoading(null);
  };

  const filteredUsers = users.filter((u) => {
    if (filter === "ALL") return true;
    return (u.status ?? "PENDING") === filter;
  });

  const counts = {
    ALL:      users.length,
    PENDING:  users.filter((u) => (u.status ?? "PENDING") === "PENDING").length,
    APPROVED: users.filter((u) => u.status === "APPROVED").length,
    REJECTED: users.filter((u) => u.status === "REJECTED").length,
  };

  return (
    <DashboardLayout role="admin">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-primary">
              <UserCheck size={20} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">User Approvals</h1>
              <p className="text-sm text-muted-foreground">
                Manage registration requests and control access
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (loading) return;
              setRipple(true);
              setTimeout(() => setRipple(false), 600);
              loadUsers();
            }}
            className={`group relative flex items-center justify-center gap-2 rounded-xl px-4 py-2 min-w-[110px] text-sm font-medium overflow-hidden
              transition-all duration-200
              hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/30
              ${ripple ? "scale-90 duration-75" : ""}
              ${loading
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 cursor-default"
                : "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-primary hover:text-primary-foreground cursor-pointer"
              }`}
          >
            {/* Click ripple burst */}
            {ripple && (
              <span className="absolute inset-0 rounded-xl animate-[ping_0.4s_ease-out_forwards] bg-primary/40 pointer-events-none" />
            )}
            {/* Sweep shimmer while loading */}
            {loading && (
              <span className="absolute inset-0 animate-[sweep_1s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            )}
            <RefreshCw
              size={15}
              className={`relative transition-transform duration-500 ${loading ? "animate-spin" : ripple ? "rotate-180" : "group-hover:rotate-180"}`}
            />
            <span className="relative whitespace-nowrap">
              {loading ? "Refreshing…" : "Refresh"}
            </span>
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-xl p-4 text-left border group
                transition-all duration-200 ease-out
                active:scale-95 active:duration-75
                hover:-translate-y-1 hover:shadow-lg
                ${filter === s
                  ? "glass-card glow-sm border-primary/40 scale-[1.03] shadow-md"
                  : "glass-card border-transparent hover:border-border"
                }`}
            >
              <div className="flex items-start justify-between mb-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{s}</p>
                <ArrowUpRight
                  size={14}
                  className={`transition-all duration-200 ${
                    filter === s
                      ? "text-primary translate-x-0.5 -translate-y-0.5"
                      : "text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  }`}
                />
              </div>
              <p className={`text-2xl font-bold transition-all duration-200 ${filter === s ? "text-primary scale-105 origin-left" : "text-card-foreground"}`}>
                {counts[s]}
              </p>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-4 text-left font-semibold text-muted-foreground">Name</th>
                  <th className="px-5 py-4 text-left font-semibold text-muted-foreground">Email</th>
                  <th className="px-5 py-4 text-left font-semibold text-muted-foreground">Role</th>
                  <th className="px-5 py-4 text-left font-semibold text-muted-foreground">Registered</th>
                  <th className="px-5 py-4 text-left font-semibold text-muted-foreground">Status</th>
                  <th className="px-5 py-4 text-left font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                      <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                      Loading users...
                    </td>
                  </tr>
                ) : loadError ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <div className="inline-flex flex-col items-center gap-3">
                        <XCircle size={32} className="text-destructive/60" />
                        <p className="text-sm text-muted-foreground">{loadError}</p>
                        <button
                          onClick={loadUsers}
                          className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          <RefreshCw size={13} /> Retry
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                      <Users size={32} className="mx-auto mb-2 opacity-30" />
                      {filter === "PENDING" ? "No pending approvals — you're all caught up!" : `No ${filter.toLowerCase()} users.`}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const userStatus = (user.status ?? "PENDING") as "PENDING" | "APPROVED" | "REJECTED";
                    const badge = statusBadge[userStatus];
                    const isActing = actionLoading === user.id;

                    return (
                      <tr key={user.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-semibold text-sidebar-accent-foreground shrink-0">
                              {user.name[0].toUpperCase()}
                            </div>
                            <span className="font-medium text-card-foreground">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">{user.email}</td>
                        <td className="px-5 py-4">
                          <span className="capitalize text-card-foreground">{user.role}</span>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.classes}`}>
                            {userStatus === "PENDING"  && <Clock size={11} />}
                            {userStatus === "APPROVED" && <CheckCircle2 size={11} />}
                            {userStatus === "REJECTED" && <XCircle size={11} />}
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {userStatus === "PENDING" && (
                              <>
                                <button
                                  onClick={() => handleApprove(user.id, user.name)}
                                  disabled={isActing}
                                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60 transition-colors disabled:opacity-50"
                                >
                                  <CheckCircle2 size={13} />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(user.id, user.name)}
                                  disabled={isActing}
                                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60 transition-colors disabled:opacity-50"
                                >
                                  <XCircle size={13} />
                                  Reject
                                </button>
                              </>
                            )}
                            {userStatus === "APPROVED" && (
                              <button
                                onClick={() => handleReject(user.id, user.name)}
                                disabled={isActing}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60 transition-colors disabled:opacity-50"
                              >
                                <XCircle size={13} />
                                Revoke
                              </button>
                            )}
                            {userStatus === "REJECTED" && (
                              <button
                                onClick={() => handleApprove(user.id, user.name)}
                                disabled={isActing}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60 transition-colors disabled:opacity-50"
                              >
                                <CheckCircle2 size={13} />
                                Approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-sm w-auto rounded-xl px-5 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-green-100 text-green-900 dark:bg-green-900/80 dark:text-green-200 border border-green-300"
              : "bg-red-100 text-red-900 dark:bg-red-900/80 dark:text-red-200 border border-red-300"
          }`}
        >
          {toast.message}
        </div>
      )}
    </DashboardLayout>
  );
}
