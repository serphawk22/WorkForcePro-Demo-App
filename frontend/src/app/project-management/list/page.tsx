"use client";

import { useEffect, useState, useMemo } from "react";
import ProjectShell from "@/components/project-management/ProjectShell";
import { getAllTasks, Task } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, CheckCircle2, Circle, Clock, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const AVATAR_COLORS = [
  "#522B5B", "#854F6C", "#2B124C", "#7C3D6B", "#9C4E7A",
  "#6B3A5F", "#3D1A4A", "#A05070", "#5A2E54", "#8B4565",
];

const getInitials = (name?: string | null) =>
  name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

const colorFor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

export default function ProjectListView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const res = await getAllTasks();
        if (res.data) setTasks(res.data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load tasks");
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 size={14} className="text-green-500" />;
      case "in_progress":
      case "reviewing":
        return <Clock size={14} className="text-amber-500" />;
      default:
        return <Circle size={14} className="text-slate-400" />;
    }
  };

  const formatDisplayDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "dd/MMM/yy");
    } catch {
      return "-";
    }
  };

  return (
    <ProjectShell>
      <div className="p-4 sm:p-6 pb-24 h-full flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">List View</h2>
            <p className="text-sm text-muted-foreground mt-1">Track all tasks across workspaces in a detailed list.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <div className="flex-1 overflow-auto rounded-lg border bg-card text-card-foreground shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground sticky top-0 z-10 border-b">
                <tr>
                  <th className="font-medium px-4 py-3 min-w-[200px]">Work</th>
                  <th className="font-medium px-4 py-3 min-w-[150px]">Assignee</th>
                  <th className="font-medium px-4 py-3 min-w-[150px]">Reporter</th>
                  <th className="font-medium px-4 py-3">Priority</th>
                  <th className="font-medium px-4 py-3">Status</th>
                  <th className="font-medium px-4 py-3">Resolution</th>
                  <th className="font-medium px-4 py-3">Created</th>
                  <th className="font-medium px-4 py-3">Updated</th>
                  <th className="font-medium px-4 py-3">Due date</th>
                  <th className="font-medium px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground uppercase">{task.public_id}</span>
                        {task.title}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {task.assignee_name ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                            style={{ backgroundColor: colorFor(task.assigned_to || 1) }}
                          >
                            {getInitials(task.assignee_name)}
                          </div>
                          <span className="truncate max-w-[120px]">{task.assignee_name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {task.assigned_by_name ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                            style={{ backgroundColor: colorFor(task.assigned_by) }}
                          >
                            {getInitials(task.assigned_by_name)}
                          </div>
                          <span className="truncate max-w-[120px]">{task.assigned_by_name}</span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-2.5 capitalize">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        task.priority === "high" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                        task.priority === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        {getStatusIcon(task.status)}
                        <span className="capitalize">{task.status.replace("_", " ")}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {task.status === "approved" ? (
                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                          <CheckCircle2 size={14} /> Done
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Unresolved</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                      {formatDisplayDate(task.created_at)}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                      {formatDisplayDate(task.updated_at)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {formatDisplayDate(task.due_date)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted focus:opacity-100 outline-none">
                          <MoreHorizontal size={16} className="text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => toast.info("Not implemented yet")}>View work item</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info("Not implemented yet")}>Comment</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info("Not implemented yet")}>Log work</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toast.info("Not implemented yet")}>Connect Slack channel</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info("Not implemented yet")}>Attach files</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toast.info("Not implemented yet")}>Voters</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info("Not implemented yet")}>Stop watching</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info("Not implemented yet")}>Watchers</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                      No tasks found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProjectShell>
  );
}
