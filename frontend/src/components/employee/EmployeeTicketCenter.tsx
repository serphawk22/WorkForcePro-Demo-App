"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MessageCircleMore, Play, Square, Plus, ChevronDown, ChevronRight, FolderKanban } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { createAdminQuery, getAllTasks, getMyAdminQueries, getWorkspaces, resolveAdminQuery, startAdminQuery, type AdminQuery, type Task } from "@/lib/api";

const querySchema = z.object({
  workspace_id: z.coerce.number().min(1, "Space is required"),
  related_task_id: z.coerce.number().int().positive().optional(),
  title: z.string().min(5, "Title must be at least 5 characters").max(300),
  description: z.string().max(2000).optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

type QueryFormValues = z.infer<typeof querySchema>;

interface Workspace {
  id: number;
  name: string;
}

export function EmployeeTicketCenter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [queries, setQueries] = useState<AdminQuery[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedQueryId, setExpandedQueryId] = useState<number | null>(null);

  const form = useForm<QueryFormValues>({
    resolver: zodResolver(querySchema),
    defaultValues: {
      workspace_id: 0,
      related_task_id: undefined,
      title: "",
      description: "",
      priority: "medium",
    },
  });

  const selectedWorkspaceId = form.watch("workspace_id");

  const loadProjects = async (workspaceId: number) => {
    setLoadingProjects(true);
    try {
      const response = await getAllTasks(undefined, undefined, workspaceId, { rootsOnly: true });
      const filtered = (response.data || []).filter((task) => !task.parent_task_id);
      setProjects(filtered);
      form.setValue("related_task_id", filtered[0]?.id ?? undefined);
    } catch (error) {
      console.error("Failed to load projects for query center:", error);
      setProjects([]);
      form.setValue("related_task_id", undefined);
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [queriesResult, workspacesResult] = await Promise.all([getMyAdminQueries(), getWorkspaces()]);
      const myQueries = queriesResult.data || [];
      const myWorkspaces = workspacesResult.data || [];
      setQueries(myQueries);
      setWorkspaces(myWorkspaces);
      const defaultWorkspace = myWorkspaces[0];
      if (defaultWorkspace) {
        form.setValue("workspace_id", defaultWorkspace.id);
        await loadProjects(defaultWorkspace.id);
      }
    } catch (error) {
      console.error("Failed to load employee ticket center:", error);
      toast({
        title: "Error",
        description: "Failed to load your tickets.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orderedQueries = useMemo(() => {
    return [...queries].sort((a, b) => {
      const aAssigned = a.assigned_to === user?.id ? 1 : 0;
      const bAssigned = b.assigned_to === user?.id ? 1 : 0;
      if (aAssigned !== bAssigned) return bAssigned - aAssigned;

      const statusWeight = (status: AdminQuery["status"]) => {
        if (status === "in_progress") return 3;
        if (status === "open") return 2;
        if (status === "resolved" || status === "closed") return 1;
        return 0;
      };

      if (statusWeight(a.status) !== statusWeight(b.status)) {
        return statusWeight(b.status) - statusWeight(a.status);
      }

      return +new Date(b.created_at) - +new Date(a.created_at);
    });
  }, [queries, user?.id]);

  const activeQuery = useMemo(() => {
    return orderedQueries.find((query) => query.assigned_to === user?.id && query.status === "in_progress") ||
      orderedQueries.find((query) => query.assigned_to === user?.id && query.status === "open") ||
      orderedQueries[0] ||
      null;
  }, [orderedQueries, user?.id]);

  const handleWorkspaceChange = async (workspaceId: number) => {
    form.setValue("workspace_id", workspaceId, { shouldValidate: true });
    form.setValue("related_task_id", undefined, { shouldValidate: true });
    setProjects([]);
    await loadProjects(workspaceId);
  };

  const onSubmit = async (values: QueryFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await createAdminQuery({
        workspace_id: values.workspace_id,
        related_task_id: values.related_task_id || undefined,
        title: values.title,
        description: values.description,
        priority: values.priority,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast({
        title: "Query raised",
        description: "Your admin has been notified.",
      });
      form.reset({
        workspace_id: workspaces[0]?.id || 0,
        related_task_id: undefined,
        title: "",
        description: "",
        priority: "medium",
      });
      setIsDialogOpen(false);
      await loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to raise query",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStart = async (queryId: number) => {
    try {
      const response = await startAdminQuery(queryId);
      if (response.error) throw new Error(response.error);
      await loadData();
      toast({ title: "Started", description: "Ticket marked as in progress." });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start ticket",
        variant: "destructive",
      });
    }
  };

  const handleClose = async (queryId: number) => {
    try {
      const response = await resolveAdminQuery(queryId);
      if (response.error) throw new Error(response.error);
      await loadData();
      toast({ title: "Closed", description: "Ticket marked as resolved." });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to close ticket",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-violet-200/60 bg-gradient-to-br from-white/95 via-violet-50/70 to-fuchsia-50/60">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-violet-600" />
              My Tickets
            </CardTitle>
            <CardDescription>Tickets assigned to you appear first. Start or close them here, or raise a new query for admin.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Raise Query
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Raise New Query</DialogTitle>
                <DialogDescription>Your admin will get a notification when you submit this query.</DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="workspace_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Space</FormLabel>
                        <Select
                          value={field.value ? field.value.toString() : "0"}
                          onValueChange={(value) => handleWorkspaceChange(parseInt(value))}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a space" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {workspaces.map((workspace) => (
                              <SelectItem key={workspace.id} value={workspace.id.toString()}>
                                {workspace.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Select the space for your query</FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="related_task_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project</FormLabel>
                        <Select
                          value={field.value ? field.value.toString() : "none"}
                          onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                          disabled={loadingProjects || projects.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={loadingProjects ? "Loading projects..." : "Select a project"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No project selected</SelectItem>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id.toString()}>
                                {project.public_id ? `${project.public_id} - ` : ""}{project.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Select a project inside the chosen space</FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Login not working" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Explain what you need help with..." rows={4} {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Submit Query
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeQuery ? (
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{activeQuery.status.replace("_", " ")}</Badge>
              <Badge variant="outline">{activeQuery.priority}</Badge>
              <Badge>#{activeQuery.id}</Badge>
            </div>
            <div>
              <h3 className="text-lg font-semibold">{activeQuery.title}</h3>
              <p className="text-sm text-muted-foreground">{activeQuery.workspace_name || "Unknown space"}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {activeQuery.description || "No additional description provided."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setExpandedQueryId(expandedQueryId === activeQuery.id ? null : activeQuery.id)}>
                {expandedQueryId === activeQuery.id ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                Open
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleStart(activeQuery.id)}
                disabled={activeQuery.status === "in_progress" || activeQuery.status === "resolved" || activeQuery.status === "closed"}
              >
                <Play className="mr-2 h-4 w-4" />
                Start
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleClose(activeQuery.id)}
                disabled={activeQuery.status === "resolved" || activeQuery.status === "closed"}
              >
                <Square className="mr-2 h-4 w-4" />
                Close
              </Button>
              {activeQuery.assigned_to_name && (
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground">
                  <MessageCircleMore className="h-3.5 w-3.5" />
                  Assigned to {activeQuery.assigned_to_name}
                </div>
              )}
            </div>
            {expandedQueryId === activeQuery.id && (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Open ticket details</p>
                <p className="mt-1">This ticket is currently visible in your dashboard. Start it when you begin work, and close it when the issue is resolved.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
            No tickets assigned or raised yet.
          </div>
        )}

        <div className="space-y-3">
          {orderedQueries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              You have not raised any tickets yet.
            </div>
          ) : (
            orderedQueries.map((query) => (
              <div key={query.id} className={`rounded-2xl border p-4 ${query.assigned_to === user?.id ? "border-violet-300/70 bg-violet-50/60" : "border-border/60 bg-background/70"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{query.status.replace("_", " ")}</Badge>
                      <Badge variant="outline">{query.priority}</Badge>
                      <Badge>#{query.id}</Badge>
                    </div>
                    <p className="font-semibold">{query.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {query.workspace_name || "Unknown space"}
                      {query.assigned_to_name ? ` • ${query.assigned_to_name}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setExpandedQueryId(expandedQueryId === query.id ? null : query.id)}>
                      {expandedQueryId === query.id ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                      Open
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleStart(query.id)}
                      disabled={query.status === "in_progress" || query.status === "resolved" || query.status === "closed" || query.assigned_to !== user?.id}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Start
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleClose(query.id)}
                      disabled={query.status === "resolved" || query.status === "closed" || query.assigned_to !== user?.id}
                    >
                      <Square className="mr-2 h-4 w-4" />
                      Close
                    </Button>
                  </div>
                </div>
                {expandedQueryId === query.id && (
                  <p className="mt-3 text-sm text-muted-foreground">{query.description || "No description provided."}</p>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
