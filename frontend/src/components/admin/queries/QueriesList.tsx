"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle2, Clock, PlayCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { getToken } from "@/lib/api";

const API_BASE = "/api";

interface Query {
  id: number;
  workspace_id: number;
  workspace_name: string;
  raised_by_name: string;
  title: string;
  description?: string;
  status: "open" | "in_progress" | "resolved" | "on_hold" | "closed";
  priority: "low" | "medium" | "high";
  created_at: string;
  started_at?: string;
  resolved_at?: string;
  duration_hours?: number;
  time_to_start_hours?: number;
}

interface QueriesListProps {
  queries: Query[];
  onQueryUpdated: () => void;
  selectedWorkspace: number | null;
  onWorkspaceSelect: (workspace: number | null) => void;
  workspaces: Array<{ id: number; name: string }>;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  open: { bg: "bg-blue-100", text: "text-blue-800" },
  in_progress: { bg: "bg-yellow-100", text: "text-yellow-800" },
  resolved: { bg: "bg-green-100", text: "text-green-800" },
  on_hold: { bg: "bg-gray-100", text: "text-gray-800" },
  closed: { bg: "bg-slate-100", text: "text-slate-800" },
};

const priorityColors: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
};

export function QueriesList({
  queries,
  onQueryUpdated,
  selectedWorkspace,
  onWorkspaceSelect,
  workspaces,
}: QueriesListProps) {
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const { toast } = useToast();

  const handleStartQuery = async (queryId: number) => {
    setUpdatingId(queryId);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/admin/queries/${queryId}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to start query");

      toast({ title: "Success", description: "Ticket marked as in progress" });
      onQueryUpdated();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start ticket",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleResolveQuery = async (queryId: number) => {
    setUpdatingId(queryId);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/admin/queries/${queryId}/resolve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to resolve query");

      toast({ title: "Success", description: "Ticket marked as resolved" });
      onQueryUpdated();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to resolve ticket",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const formatTime = (hours?: number) => {
    if (!hours) return "—";
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    return `${Math.round(hours)}h`;
  };

  return (
    <div className="space-y-4">
      {/* Workspace Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Filter by Project:</label>
        <Select
          value={selectedWorkspace?.toString() || "all"}
          onValueChange={(v) => onWorkspaceSelect(v === "all" ? null : parseInt(v))}
        >
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {workspaces.map((ws) => (
              <SelectItem key={ws.id} value={ws.id.toString()}>
                {ws.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Queries Table */}
      {queries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No tickets found. Create one to get started!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket ID</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Time to Start</TableHead>
                <TableHead>Total Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queries.map((query) => (
                <TableRow key={query.id}>
                  <TableCell className="font-semibold">#Q{query.id}</TableCell>
                  <TableCell className="text-sm">{query.workspace_name}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="text-sm font-medium hover:underline text-blue-600 max-w-xs truncate">
                          {query.title}
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>{query.title}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase">
                              Description
                            </p>
                            <p className="text-sm mt-1">
                              {query.description || "No description provided"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase">
                              Raised By
                            </p>
                            <p className="text-sm mt-1">{query.raised_by_name}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase">
                              Created
                            </p>
                            <p className="text-sm mt-1">
                              {format(new Date(query.created_at), "PPP p")}
                            </p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${statusColors[query.status].bg} ${statusColors[query.status].text}`}>
                      {query.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={priorityColors[query.priority]}>
                      {query.priority.charAt(0).toUpperCase() + query.priority.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(query.created_at), "MMM dd")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3 w-3" />
                      {formatTime(query.time_to_start_hours)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      {query.resolved_at && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                      {formatTime(query.duration_hours)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {query.status === "open" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartQuery(query.id)}
                          disabled={updatingId === query.id}
                        >
                          {updatingId === query.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <PlayCircle className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                      {(query.status === "in_progress" || query.status === "open") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolveQuery(query.id)}
                          disabled={updatingId === query.id}
                        >
                          {updatingId === query.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
