"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, MessageCircle, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  getAdminQueries,
  getComments,
  createComment,
  deleteComment,
  logTime,
  getTimeLogs,
  getToken,
  type AdminQuery,
  type TicketComment,
  type TimeLog,
} from "@/lib/api";

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = parseInt((params?.id as string) || "0");
  const { toast } = useToast();

  const [ticket, setTicket] = useState<AdminQuery | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [timeHours, setTimeHours] = useState<number | "">("");
  const [timeNote, setTimeNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTicketData();
  }, [ticketId]);

  const loadTicketData = async () => {
    try {
      setLoading(true);
      const [ticketsRes, commentsRes, timeLogsRes] = await Promise.all([
        getAdminQueries(),
        getComments(ticketId),
        getTimeLogs(ticketId),
      ]);

      if (ticketsRes.data) {
        const found = ticketsRes.data.find((t) => t.id === ticketId);
        if (found) {
          setTicket(found);
        } else {
          toast({ title: "Error", description: "Ticket not found", variant: "destructive" });
          router.push("/admin/queries");
        }
      }

      if (commentsRes.data) {
        setComments(commentsRes.data);
      }

      if (timeLogsRes.data) {
        setTimeLogs(timeLogsRes.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load ticket details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !ticket) return;

    setSubmitting(true);
    try {
      const result = await createComment(ticketId, { content: commentText });
      if (result.data) {
        setComments([...comments, result.data]);
        setCommentText("");
        toast({ title: "Success", description: "Comment added" });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await deleteComment(ticketId, commentId);
      setComments(comments.filter((c) => c.id !== commentId));
      toast({ title: "Success", description: "Comment deleted" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    }
  };

  const handleLogTime = async () => {
    if (!timeHours || !ticket) return;

    setSubmitting(true);
    try {
      const result = await logTime(ticketId, {
        hours_spent: typeof timeHours === "number" ? timeHours : parseFloat(timeHours),
        note: timeNote || undefined,
      });
      if (result.data) {
        setTicket(result.data);
        setTimeHours("");
        setTimeNote("");
        await loadTicketData();
        toast({ title: "Success", description: "Time logged successfully" });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to log time",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Ticket not found</h1>
          <Button onClick={() => router.push("/admin/queries")}>Back to Tickets</Button>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, { bg: string; text: string }> = {
    backlog: { bg: "bg-gray-100", text: "text-gray-800" },
    ready: { bg: "bg-blue-100", text: "text-blue-800" },
    in_progress: { bg: "bg-yellow-100", text: "text-yellow-800" },
    blocked: { bg: "bg-red-100", text: "text-red-800" },
    resolved: { bg: "bg-green-100", text: "text-green-800" },
    closed: { bg: "bg-slate-100", text: "text-slate-800" },
    open: { bg: "bg-blue-100", text: "text-blue-800" },
    on_hold: { bg: "bg-gray-100", text: "text-gray-800" },
  };

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.push("/admin/queries")} className="gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Tickets
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-3xl mb-2">#{ticket.id} {ticket.title}</CardTitle>
                  <CardDescription>{ticket.workspace_name}</CardDescription>
                </div>
                <Badge className={`${statusColors[ticket.status]?.bg || statusColors.open.bg} ${statusColors[ticket.status]?.text || statusColors.open.text}`}>
                  {ticket.status.replace("_", " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                <p className="text-base">{ticket.description || "No description provided"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Raised By</p>
                  <p className="text-base">{ticket.raised_by_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Assigned To</p>
                  <p className="text-base">{ticket.assigned_to_name || "Unassigned"}</p>
                </div>
              </div>

              {ticket.labels && ticket.labels.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Labels</p>
                  <div className="flex flex-wrap gap-2">
                    {ticket.labels.map((label) => (
                      <Badge
                        key={label.id}
                        style={{
                          backgroundColor: label.color + "20",
                          color: label.color,
                          border: `1px solid ${label.color}`,
                        }}
                      >
                        {label.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Time Tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.estimated_hours && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estimated</p>
                    <p className="text-2xl font-bold">{(ticket.estimated_hours ?? 0).toFixed(1)}h</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Logged</p>
                    <p className="text-2xl font-bold text-blue-600">{(ticket.actual_hours_logged ?? 0).toFixed(1)}h</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Remaining</p>
                    <p
                      className={`text-2xl font-bold ${
                        ticket.remaining_hours && ticket.remaining_hours > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {ticket.remaining_hours?.toFixed(1)}h
                    </p>
                  </div>
                </div>
              )}

              {/* Log Time Form */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Log Time</p>
                <div className="flex gap-2 mb-3">
                  <Input
                    type="number"
                    placeholder="Hours (e.g., 1.5)"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={timeHours}
                    onChange={(e) => setTimeHours(e.target.value ? parseFloat(e.target.value) : "")}
                    className="w-24"
                  />
                  <Input
                    placeholder="What did you work on?"
                    value={timeNote}
                    onChange={(e) => setTimeNote(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleLogTime} disabled={submitting || !timeHours}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log"}
                  </Button>
                </div>
              </div>

              {/* Time Logs List */}
              {timeLogs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Recent Logs</p>
                  {timeLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="p-2 bg-muted rounded text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{log.user_name}</p>
                          <p className="text-muted-foreground text-xs">{log.hours_spent}h</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{format(new Date(log.logged_at), "MMM dd, HH:mm")}</p>
                      </div>
                      {log.note && <p className="text-xs mt-1">{log.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Comment Form */}
              <div className="border-b pb-4">
                <Textarea
                  placeholder="Add a comment... (Tip: mention @users)"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  className="mb-2"
                />
                <Button onClick={handleAddComment} disabled={submitting || !commentText.trim()}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Post Comment"}
                </Button>
              </div>

              {/* Comments List */}
              <div className="space-y-3">
                {comments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No comments yet</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="border rounded p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{comment.user_name}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(comment.created_at), "MMM dd, HH:mm")}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="h-6 w-6 p-0"
                        >
                          ✕
                        </Button>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Priority</p>
                <Badge className={ticket.priority === "high" ? "bg-red-100 text-red-800" : ticket.priority === "medium" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}>
                  {ticket.priority}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p>{format(new Date(ticket.created_at), "PPP")}</p>
              </div>
              {ticket.started_at && (
                <div>
                  <p className="text-muted-foreground">Started</p>
                  <p>{format(new Date(ticket.started_at), "PPP")}</p>
                </div>
              )}
              {ticket.resolved_at && (
                <div>
                  <p className="text-muted-foreground">Resolved</p>
                  <p>{format(new Date(ticket.resolved_at), "PPP")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
