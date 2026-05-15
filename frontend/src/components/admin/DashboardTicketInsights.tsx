"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, MessageCircleMore, ExternalLink, FolderKanban, Clock3, UserCircle2 } from "lucide-react";
import { fetchAllUsers, getAdminQueries, type AdminQuery, type User } from "@/lib/api";

interface ProjectTicketSummary {
  workspaceId: number;
  workspaceName: string;
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
}

function startOfWeek(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function DashboardTicketInsights() {
  const [queries, setQueries] = useState<AdminQuery[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const [queriesResult, usersResult] = await Promise.all([getAdminQueries(), fetchAllUsers()]);
        if (!active) return;

        setQueries(queriesResult.data || []);
        setUsers((usersResult.data || []).filter((user) => user.role === "employee"));
      } catch (error) {
        console.error("Failed to load ticket insights:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const developerById = useMemo(() => {
    return new Map(users.map((user) => [user.id, user]));
  }, [users]);

  const activeTickets = useMemo(
    () => queries.filter((query) => query.status === "open" || query.status === "in_progress"),
    [queries]
  );

  const currentTicket = useMemo(() => {
    return (
      activeTickets.find((query) => query.status === "in_progress" && query.assigned_to) ||
      activeTickets.find((query) => query.status === "in_progress") ||
      activeTickets[0] ||
      null
    );
  }, [activeTickets]);

  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const weekQueries = useMemo(
    () => queries.filter((query) => new Date(query.created_at) >= weekStart),
    [queries, weekStart]
  );

  const projectSummary = useMemo<ProjectTicketSummary[]>(() => {
    const summary = new Map<number, ProjectTicketSummary>();

    for (const query of queries) {
      const current = summary.get(query.workspace_id) || {
        workspaceId: query.workspace_id,
        workspaceName: query.workspace_name || "Unknown project",
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
      };

      current.total += 1;
      if (query.status === "open") current.open += 1;
      if (query.status === "in_progress") current.inProgress += 1;
      if (query.status === "resolved" || query.status === "closed") current.resolved += 1;
      summary.set(query.workspace_id, current);
    }

    return Array.from(summary.values()).sort((a, b) => b.total - a.total);
  }, [queries]);

  const thisWeekCreated = weekQueries.length;
  const thisWeekResolved = weekQueries.filter((query) => query.status === "resolved" || query.status === "closed").length;
  const busiestProject = projectSummary[0] || null;

  const contactUser = currentTicket?.assigned_to ? developerById.get(currentTicket.assigned_to) : null;
  const message = currentTicket
    ? `Hi ${contactUser?.name || "there"}, I need an update on ticket #Q${currentTicket.id} (${currentTicket.title}) in ${currentTicket.workspace_name || "your project"}.`
    : "";
  const mailSubject = currentTicket ? `Ticket update: #Q${currentTicket.id} ${currentTicket.title}` : "";
  const mailBody = currentTicket
    ? `Hello ${contactUser?.name || "team"},%0D%0A%0D%0APlease share an update on ticket #Q${currentTicket.id}: ${currentTicket.title}.%0D%0AProject: ${currentTicket.workspace_name || "Unknown"}%0D%0AStatus: ${currentTicket.status.replace("_", " ")}%0D%0A%0D%0AThanks.`
    : "";
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  const mailtoUrl = contactUser?.email ? `mailto:${contactUser.email}?subject=${encodeURIComponent(mailSubject)}&body=${mailBody}` : "";

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Ticket Command Center</h2>
          <p className="text-sm text-muted-foreground">See what is active right now, who owns it, and what changed this week.</p>
        </div>
        <Badge variant="secondary" className="rounded-full px-3 py-1">
          {queries.length} total tickets
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-border/60 bg-card/80 py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-primary" />
                Current Working Ticket
              </CardTitle>
              <CardDescription>The ticket the team is actively handling right now.</CardDescription>
            </CardHeader>
            <CardContent>
              {currentTicket ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{currentTicket.status.replace("_", " ")}</Badge>
                      <Badge variant="outline">{currentTicket.priority}</Badge>
                      <Badge variant="secondary">#{currentTicket.id}</Badge>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold">{currentTicket.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{currentTicket.description || "No description provided."}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-background p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Project</p>
                        <p className="mt-1 font-medium">{currentTicket.workspace_name || "Unknown project"}</p>
                      </div>
                      <div className="rounded-xl bg-background p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Developer</p>
                        <p className="mt-1 font-medium">
                          {currentTicket.assigned_to_name || "Unassigned"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="default" disabled={!contactUser?.email}>
                      <a href={mailtoUrl || undefined} target="_blank" rel="noreferrer">
                        <Mail className="mr-2 h-4 w-4" />
                        Email Developer
                      </a>
                    </Button>
                    <Button asChild variant="outline" disabled={!contactUser?.email}>
                      <a href={whatsappUrl} target="_blank" rel="noreferrer">
                        <MessageCircleMore className="mr-2 h-4 w-4" />
                        WhatsApp
                      </a>
                    </Button>
                    <Button asChild variant="ghost">
                      <a href="/admin/queries">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open Ticket Board
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                  No active tickets at the moment.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Weekly Snapshot</CardTitle>
              <CardDescription>Tickets created and resolved since Monday.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Created</p>
                  <p className="mt-1 text-2xl font-semibold">{thisWeekCreated}</p>
                </div>
                <div className="rounded-xl bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Resolved</p>
                  <p className="mt-1 text-2xl font-semibold">{thisWeekResolved}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Most active project</p>
                <p className="mt-1 font-medium">{busiestProject?.workspaceName || "No project data"}</p>
                <p className="text-sm text-muted-foreground">{busiestProject ? `${busiestProject.total} tickets` : ""}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-primary" />
                Project-Specific Ticket Breakdown
              </CardTitle>
              <CardDescription>Quickly compare ticket load across projects.</CardDescription>
            </CardHeader>
            <CardContent>
              {projectSummary.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                  No tickets yet.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {projectSummary.map((project) => (
                    <div key={project.workspaceId} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold">{project.workspaceName}</p>
                          <p className="text-xs text-muted-foreground">{project.total} tickets total</p>
                        </div>
                        <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="rounded-lg bg-background p-2">
                          <p className="text-xs text-muted-foreground">Open</p>
                          <p className="font-semibold">{project.open}</p>
                        </div>
                        <div className="rounded-lg bg-background p-2">
                          <p className="text-xs text-muted-foreground">Active</p>
                          <p className="font-semibold">{project.inProgress}</p>
                        </div>
                        <div className="rounded-lg bg-background p-2">
                          <p className="text-xs text-muted-foreground">Done</p>
                          <p className="font-semibold">{project.resolved}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
