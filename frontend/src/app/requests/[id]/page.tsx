"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  FileText,
  Paperclip,
  ImageIcon,
  Loader2,
  MessageSquare,
  BadgeCheck,
  AlertTriangle,
  Hourglass,
  Download,
  CalendarOff,
  Mail,
  Timer,
} from "lucide-react";
import { getLeaveRequestById, reviewLeaveRequest, cancelLeaveRequest, LeaveRequest } from "@/lib/api";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const leaveTypeColors: Record<string, { bg: string; text: string; dot: string }> = {
  personal: { bg: "bg-blue-500/10", text: "text-blue-500", dot: "bg-blue-500" },
  sick:     { bg: "bg-red-500/10",  text: "text-red-500",  dot: "bg-red-500"  },
  vacation: { bg: "bg-emerald-500/10", text: "text-emerald-500", dot: "bg-emerald-500" },
  other:    { bg: "bg-secondary",   text: "text-muted-foreground", dot: "bg-muted-foreground" },
};

const statusConfig = {
  pending: {
    icon: Hourglass,
    label: "Pending Review",
    banner: "from-amber-500/15 to-amber-500/5 border-amber-500/20",
    badge: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    iconColor: "text-amber-500",
  },
  approved: {
    icon: CheckCircle2,
    label: "Approved",
    banner: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/20",
    badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    iconColor: "text-emerald-500",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    banner: "from-red-500/15 to-red-500/5 border-red-500/20",
    badge: "bg-red-500/10 text-red-500 border-red-500/20",
    iconColor: "text-red-500",
  },
};

function Avatar({ name, picture }: { name?: string; picture?: string | null }) {
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const getUrl = () => {
    if (!picture) return null;
    if (picture.startsWith("data:") || picture.startsWith("http")) return picture;
    return `${API_BASE}${picture}`;
  };

  const url = getUrl();

  return url ? (
    <img src={url} alt={name} className="h-16 w-16 rounded-2xl object-cover ring-2 ring-border" />
  ) : (
    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-2 ring-border">
      <span className="text-xl font-bold text-primary">{initials}</span>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
        <Icon size={14} />
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}

function TimelineStep({
  icon: Icon,
  label,
  time,
  active,
  color,
}: {
  icon: React.ElementType;
  label: string;
  time?: string | null;
  active: boolean;
  color: string;
}) {
  return (
    <div className={`flex items-start gap-3 ${active ? "opacity-100" : "opacity-40"}`}>
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${active ? `${color} border-current/20` : "text-muted-foreground border-border"}`}>
        <Icon size={15} />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {time && <p className="text-xs text-muted-foreground mt-0.5">{time}</p>}
      </div>
    </div>
  );
}

export default function LeaveDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const isAdmin = user?.role === "admin";

  const [leave, setLeave] = useState<LeaveRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Review state
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setIsLoading(true);
      const result = await getLeaveRequestById(Number(id));
      if (result.error || !result.data) {
        setNotFound(true);
      } else {
        setLeave(result.data);
      }
      setIsLoading(false);
    })();
  }, [id]);

  const handleReview = async (status: "approved" | "rejected") => {
    if (!leave) return;
    setIsSubmitting(true);
    const result = await reviewLeaveRequest(leave.id, status, reviewComment);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Leave request ${status}!`);
      setLeave({ ...leave, status, admin_comment: reviewComment || leave.admin_comment });
    }
    setIsSubmitting(false);
  };

  const handleCancel = async () => {
    if (!leave || !confirm("Cancel this leave request?")) return;
    const result = await cancelLeaveRequest(leave.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Leave request cancelled");
      router.push("/requests");
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const getDays = () => {
    if (!leave) return 0;
    const s = new Date(leave.start_date);
    const e = new Date(leave.end_date);
    return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const isOwner = leave && user && leave.user_id === user.id;
  const canCancel = !isAdmin && isOwner && leave?.status === "pending";
  const canReview = isAdmin && leave?.status === "pending";

  return (
    <ProtectedRoute>
      <DashboardLayout
        role={isAdmin ? "admin" : "employee"}
        userName={user?.name || "User"}
        userHandle={`@${user?.email?.split("@")[0] || "user"}`}
      >
        {/* Back nav */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/requests")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Leave Requests
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : notFound || !leave ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <CalendarOff className="h-14 w-14 text-muted-foreground/40 mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-1">Request Not Found</h2>
            <p className="text-muted-foreground text-sm">This leave request doesn't exist or you don't have permission to view it.</p>
          </div>
        ) : (() => {
          const sc = statusConfig[leave.status];
          const StatusIcon = sc.icon;
          const lt = leaveTypeColors[leave.leave_type] || leaveTypeColors.other;
          const days = getDays();

          return (
            <div className="space-y-5 max-w-4xl mx-auto">

              {/* ── Status banner ── */}
              <div className={`rounded-2xl border bg-gradient-to-r ${sc.banner} p-5`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-card/60 ${sc.iconColor}`}>
                      <StatusIcon size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Leave Request #{leave.id}</p>
                      <h1 className="text-xl font-bold text-foreground mt-0.5">{leave.reason}</h1>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${sc.badge}`}>
                      <StatusIcon size={14} />
                      {sc.label}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${lt.bg} ${lt.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${lt.dot}`} />
                      {leave.leave_type}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* ── LEFT: main details (2/3 width) ── */}
                <div className="lg:col-span-2 space-y-5">

                  {/* Employee info */}
                  <div className="glass-card rounded-2xl p-5">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                      <User size={13} /> Employee
                    </h2>
                    <div className="flex items-center gap-4">
                      <Avatar name={leave.user_name} picture={leave.user_profile_picture} />
                      <div>
                        <p className="text-base font-bold text-foreground">{leave.user_name || "Unknown Employee"}</p>
                        {leave.user_email && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Mail size={13} /> {leave.user_email}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Submitted {formatDateTime(leave.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="glass-card rounded-2xl p-5">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <MessageSquare size={13} /> Reason
                    </h2>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{leave.reason}</p>
                  </div>

                  {/* Duration */}
                  <div className="glass-card rounded-2xl p-5">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                      <CalendarDays size={13} /> Duration
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="rounded-xl bg-primary/5 border border-border/50 p-3 text-center">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Start Date</p>
                        <p className="text-sm font-bold text-foreground mt-1">{formatDate(leave.start_date)}</p>
                      </div>
                      <div className="rounded-xl bg-primary/5 border border-border/50 p-3 text-center">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">End Date</p>
                        <p className="text-sm font-bold text-foreground mt-1">{formatDate(leave.end_date)}</p>
                      </div>
                      <div className="rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 p-3 text-center">
                        <p className="text-[11px] text-primary uppercase tracking-wide font-semibold">Total Days</p>
                        <p className="text-2xl font-bold text-primary mt-1">{days}</p>
                        <p className="text-[11px] text-primary/70">day{days > 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  </div>

                  {/* Document */}
                  {leave.document_filename && (
                    <div className="glass-card rounded-2xl p-5">
                      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                        <Paperclip size={13} /> Supporting Document
                      </h2>
                      {leave.document_data?.startsWith("data:image/") ? (
                        <div className="space-y-3">
                          <img
                            src={leave.document_data}
                            alt={leave.document_filename}
                            className="max-h-64 rounded-xl border border-border object-contain w-full"
                          />
                          <a
                            href={leave.document_data}
                            download={leave.document_filename}
                            className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
                          >
                            <Download size={14} /> Download {leave.document_filename}
                          </a>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 rounded-xl border border-border bg-secondary/30 p-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <FileText size={22} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{leave.document_filename}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Attached document</p>
                          </div>
                          {leave.document_data && (
                            <a
                              href={leave.document_data}
                              download={leave.document_filename}
                              className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors shrink-0"
                            >
                              <Download size={14} /> Download
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Admin review form – only shown if pending + admin, inline on detail page */}
                  {canReview && (
                    <div className="glass-card rounded-2xl p-5 border-amber-500/20">
                      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                        <BadgeCheck size={13} /> Review This Request
                      </h2>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">
                            Admin Comment <span className="text-muted-foreground font-normal">(optional)</span>
                          </label>
                          <textarea
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            rows={3}
                            placeholder="Leave a note for the employee…"
                            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleReview("rejected")}
                            disabled={isSubmitting}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-semibold py-2.5 text-sm hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          >
                            {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                            Reject
                          </button>
                          <button
                            onClick={() => handleReview("approved")}
                            disabled={isSubmitting}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-semibold py-2.5 text-sm hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                          >
                            {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                            Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── RIGHT: sidebar (1/3 width) ── */}
                <div className="space-y-5">

                  {/* Status timeline */}
                  <div className="glass-card rounded-2xl p-5">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                      <Timer size={13} /> Timeline
                    </h2>
                    <div className="space-y-4 relative">
                      {/* connector line */}
                      <div className="absolute left-4 top-8 w-0.5 h-[calc(100%-2rem)] bg-border/60" />
                      <TimelineStep
                        icon={Clock}
                        label="Submitted"
                        time={formatDateTime(leave.created_at)}
                        active
                        color="text-primary"
                      />
                      <TimelineStep
                        icon={leave.status === "approved" ? CheckCircle2 : leave.status === "rejected" ? XCircle : Hourglass}
                        label={leave.status === "pending" ? "Awaiting Review" : leave.status === "approved" ? "Approved" : "Rejected"}
                        time={leave.reviewed_at ? formatDateTime(leave.reviewed_at) : undefined}
                        active={leave.status !== "pending"}
                        color={leave.status === "approved" ? "text-emerald-500" : leave.status === "rejected" ? "text-red-500" : "text-amber-500"}
                      />
                    </div>
                  </div>

                  {/* Admin comment (read-only, shown after review) */}
                  {leave.admin_comment && (
                    <div className="glass-card rounded-2xl p-5">
                      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                        <MessageSquare size={13} /> Admin Comment
                      </h2>
                      <p className="text-sm text-foreground leading-relaxed italic">"{leave.admin_comment}"</p>
                    </div>
                  )}

                  {/* Quick info rows */}
                  <div className="glass-card rounded-2xl p-5 space-y-4">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <AlertTriangle size={13} /> Details
                    </h2>
                    <InfoRow icon={CalendarDays} label="Leave Type" value={
                      <span className={`inline-flex items-center gap-1.5 text-sm font-semibold capitalize ${lt.text}`}>
                        <span className={`h-2 w-2 rounded-full ${lt.dot}`} />
                        {leave.leave_type}
                      </span>
                    } />
                    <InfoRow icon={Timer} label="Duration" value={`${days} day${days > 1 ? "s" : ""}`} />
                    <InfoRow icon={Paperclip} label="Document" value={leave.document_filename ? leave.document_filename : <span className="text-muted-foreground font-normal">None attached</span>} />
                    {leave.user_email && <InfoRow icon={Mail} label="Employee Email" value={leave.user_email} />}
                  </div>

                  {/* Cancel button for employee */}
                  {canCancel && (
                    <button
                      onClick={handleCancel}
                      className="w-full rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 font-semibold py-2.5 text-sm hover:bg-red-500/15 transition-colors"
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
