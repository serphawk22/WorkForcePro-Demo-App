"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import NextImage from "next/image";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { Plus, CalendarOff, Clock, CheckCircle, XCircle, Loader2, X, Trash2, Paperclip, FileText, Image as ImageIcon, ChevronRight, User } from "lucide-react";
import {
  getMyLeaveRequests,
  getAllLeaveRequests,
  createLeaveRequest,
  cancelLeaveRequest,
  reviewLeaveRequest,
  LeaveRequest,
  LeaveRequestCreate
} from "@/lib/api";
import { toast } from "sonner";

const statusConfig: Record<string, { icon: typeof Clock; className: string; label: string }> = {
  pending: { icon: Clock, className: "text-yellow-500", label: "Pending" },
  approved: { icon: CheckCircle, className: "text-green-500", label: "Approved" },
  rejected: { icon: XCircle, className: "text-red-500", label: "Rejected" },
};

const leaveTypeColors: Record<string, string> = {
  personal: "bg-blue-500/10 text-blue-500",
  sick: "bg-red-500/10 text-red-500",
  vacation: "bg-green-500/10 text-green-500",
  other: "bg-secondary text-muted-foreground",
};

export default function RequestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin";
  
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New request form state
  const [newRequest, setNewRequest] = useState<LeaveRequestCreate>({
    reason: "",
    start_date: "",
    end_date: "",
    leave_type: "personal",
  });
  const [document, setDocument] = useState<File | null>(null);
  
  // Review form state
  const [reviewComment, setReviewComment] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const result = isAdmin 
      ? await getAllLeaveRequests()
      : await getMyLeaveRequests();
    
    if (result.data) {
      setRequests(result.data);
    }
    setIsLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.reason.trim() || !newRequest.start_date || !newRequest.end_date) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (new Date(newRequest.end_date) < new Date(newRequest.start_date)) {
      toast.error("End date must be after start date");
      return;
    }
    
    setIsSubmitting(true);
    const result = await createLeaveRequest(newRequest, document);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Leave request submitted successfully!");
      setShowCreateModal(false);
      setNewRequest({ reason: "", start_date: "", end_date: "", leave_type: "personal" });
      setDocument(null);
      loadData();
    }
    setIsSubmitting(false);
  };

  const handleCancelRequest = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this leave request?")) return;
    
    const result = await cancelLeaveRequest(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Leave request cancelled");
      loadData();
    }
  };

  const handleReviewRequest = async (status: "approved" | "rejected") => {
    if (!selectedRequest) return;
    
    setIsSubmitting(true);
    const result = await reviewLeaveRequest(selectedRequest.id, status, reviewComment);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Leave request ${status}!`);
      setShowReviewModal(false);
      setSelectedRequest(null);
      setReviewComment("");
      loadData();
    }
    setIsSubmitting(false);
  };

  const openReviewModal = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowReviewModal(true);
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()} (${days} day${days > 1 ? "s" : ""})`;
  };

  return (
    <ProtectedRoute>
      <DashboardLayout 
        role={isAdmin ? "admin" : "employee"} 
        userName={user?.name || "User"} 
        userHandle={`@${user?.email?.split("@")[0] || "user"}`}
      >
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Leave Requests</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isAdmin ? "Review and manage leave requests" : "Submit and track your leave requests"}
              </p>
            </div>
            {!isAdmin && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Plus size={16} /> New Request
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-3">
              {requests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No leave requests yet</p>
                </div>
              ) : (
                requests.map((req) => {
                  const StatusIcon = statusConfig[req.status].icon;
                  return (
                    <div
                      key={req.id}
                      onClick={() => router.push(`/requests/${req.id}`)}
                      className="group flex items-start gap-4 rounded-xl border border-border bg-card p-4 card-shadow hover:card-shadow-hover transition-all duration-200 cursor-pointer hover:border-primary/40 hover:-translate-y-0.5 hover:bg-primary/[0.03]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-accent">
                        {(req as any).user_profile_picture ? (
                          <NextImage
                            src={(req as any).user_profile_picture}
                            alt={req.user_name ? `${req.user_name}'s profile picture` : "User profile picture"}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-lg object-cover"
                            unoptimized
                          />
                        ) : (
                          <CalendarOff size={18} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-card-foreground">{req.reason}</p>
                          <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize ${leaveTypeColors[req.leave_type] || leaveTypeColors.other}`}>
                            {req.leave_type}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateRange(req.start_date, req.end_date)}
                        </p>
                        {isAdmin && req.user_name && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <User size={11} />
                            <span className="font-medium">{req.user_name}</span>
                            {req.user_email && <span className="opacity-60">· {req.user_email}</span>}
                          </p>
                        )}
                        {req.admin_comment && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            Admin comment: {req.admin_comment}
                          </p>
                        )}
                        {req.document_filename && (
                          <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-primary">
                            <Paperclip size={12} /> {req.document_filename}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${statusConfig[req.status].className}`}>
                          <StatusIcon size={14} /> {statusConfig[req.status].label}
                        </div>

                        {/* Admin review button */}
                        {isAdmin && req.status === "pending" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openReviewModal(req); }}
                            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
                          >
                            Review
                          </button>
                        )}

                        {/* Employee cancel button */}
                        {!isAdmin && req.status === "pending" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCancelRequest(req.id); }}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Cancel request"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}

                        <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap">
                          View details <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-150" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Create Request Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md mx-4 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-card-foreground">Request Leave</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Leave Type</label>
                  <select
                    value={newRequest.leave_type}
                    onChange={(e) => setNewRequest({ ...newRequest, leave_type: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="personal">Personal</option>
                    <option value="sick">Sick Leave</option>
                    <option value="vacation">Vacation</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-1">Start Date *</label>
                    <input
                      type="date"
                      value={newRequest.start_date}
                      onChange={(e) => setNewRequest({ ...newRequest, start_date: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-1">End Date *</label>
                    <input
                      type="date"
                      value={newRequest.end_date}
                      onChange={(e) => setNewRequest({ ...newRequest, end_date: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Reason *</label>
                  <textarea
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Please provide a reason for your leave request"
                    rows={3}
                    required
                    minLength={5}
                  />
                </div>

                {/* Optional document upload */}
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">
                    Supporting Document <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  {document ? (
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        {document.type.startsWith("image/") ? <ImageIcon size={16} /> : <FileText size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-card-foreground truncate">{document.name}</p>
                        <p className="text-xs text-muted-foreground">{(document.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDocument(null)}
                        className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-3 hover:border-primary/50 hover:bg-primary/5 transition-colors">
                      <Paperclip size={16} className="text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Attach PDF, image or Word document (max 10 MB)</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
                        onChange={(e) => setDocument(e.target.files?.[0] || null)}
                      />
                    </label>
                  )}
                </div>
                
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowCreateModal(false); setDocument(null); }}
                    className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Review Modal (Admin only) */}
        {showReviewModal && selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md mx-4 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-card-foreground">Review Leave Request</h2>
                <button onClick={() => setShowReviewModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-secondary/50">
                  <p className="font-medium text-card-foreground">{selectedRequest.user_name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{selectedRequest.reason}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDateRange(selectedRequest.start_date, selectedRequest.end_date)}
                  </p>
                  {selectedRequest.document_filename && (
                    <a
                      href={selectedRequest.document_data || "#"}
                      download={selectedRequest.document_filename}
                      className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-primary hover:underline"
                    >
                      <Paperclip size={12} /> {selectedRequest.document_filename}
                    </a>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Comment (optional)</label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Add a comment for the employee"
                    rows={2}
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => handleReviewRequest("rejected")}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
                  </button>
                  <button
                    onClick={() => handleReviewRequest("approved")}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
