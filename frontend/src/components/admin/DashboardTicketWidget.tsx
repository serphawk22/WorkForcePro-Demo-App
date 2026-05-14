"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, ArrowRight, Loader2, Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { fetchAllUsers, getAllTasks, getToken, listLabels, type Label } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const API_BASE = "/api";

const querySchema = z.object({
  workspace_id: z.coerce.number().min(1, "Project is required"),
  related_task_id: z.coerce.number().int().positive().optional(),
  assigned_to: z.coerce.number().int().positive().optional(),
  title: z.string().min(5, "Title must be at least 5 characters").max(300),
  description: z.string().max(2000).optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  estimated_hours: z.coerce.number().positive("Hours must be positive").optional(),
  label_ids: z.array(z.number()).optional(),
});

type QueryFormValues = z.infer<typeof querySchema>;

interface Workspace {
  id: number;
  name: string;
}

interface Project {
  id: number;
  title: string;
  public_id?: string;
  workspace_id?: number | null;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
}

interface DashboardTicketWidgetProps {
  onTicketCreated?: () => void;
}

export function DashboardTicketWidget({ onTicketCreated }: DashboardTicketWidgetProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [developers, setDevelopers] = useState<TeamMember[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<QueryFormValues>({
    resolver: zodResolver(querySchema),
    defaultValues: {
      workspace_id: 0,
      related_task_id: undefined,
      assigned_to: undefined,
      title: "",
      description: "",
      priority: "medium",
      label_ids: [],
    },
  });

  const loadProjectsData = async (workspaceId: number) => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await getAllTasks(undefined, undefined, workspaceId, { rootsOnly: true });
      if (response.data) {
        const filteredProjects = response.data.filter((task) => !task.parent_task_id);
        setProjects(filteredProjects);
        form.setValue("related_task_id", filteredProjects[0]?.id ?? undefined);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
      setProjects([]);
      form.setValue("related_task_id", undefined);
    }
  };

  const loadWorkspacesData = async () => {
    setLoadingWorkspaces(true);
    try {
      const token = getToken();
      if (!token) {
        toast({
          title: "Error",
          description: "Please log in first",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`${API_BASE}/workspaces`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load workspaces: ${response.status}`);
      }

      const data = await response.json();
      setWorkspaces(data);
      if (data.length > 0) {
        form.setValue("workspace_id", data[0].id);
        await loadProjectsData(data[0].id);
      }
    } catch (error) {
      console.error("Failed to load workspaces:", error);
      toast({
        title: "Error",
        description: "Failed to load projects. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  const loadDeveloperData = async () => {
    try {
      const result = await fetchAllUsers();
      if (result.data) {
        setDevelopers(result.data.filter((user) => user.role === "employee"));
      }
    } catch (error) {
      console.error("Failed to load developers:", error);
    }
  };

  const loadLabelsData = async () => {
    setLoadingLabels(true);
    try {
      const result = await listLabels();
      if (result.data) {
        setLabels(result.data);
      }
    } catch (error) {
      console.error("Failed to load labels:", error);
      toast({
        title: "Warning",
        description: "Could not load labels. You can still create the ticket without labels.",
        variant: "default",
      });
    } finally {
      setLoadingLabels(false);
    }
  };

  const handleDialogOpenChange = async (open: boolean) => {
    setIsDialogOpen(open);

    if (open && workspaces.length === 0) {
      await loadWorkspacesData();
    }
    if (open && developers.length === 0) {
      await loadDeveloperData();
    }
    if (open && labels.length === 0) {
      await loadLabelsData();
    }
  };

  const handleWorkspaceChange = async (workspaceId: number) => {
    form.setValue("workspace_id", workspaceId, { shouldValidate: true });
    form.setValue("related_task_id", undefined, { shouldValidate: true });
    setProjects([]);
    await loadProjectsData(workspaceId);
  };

  const onSubmit = async (values: QueryFormValues) => {
    setIsSubmitting(true);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/admin/queries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...values,
          assigned_to: values.assigned_to || undefined,
          related_task_id: values.related_task_id || undefined,
          estimated_hours: values.estimated_hours || undefined,
          label_ids: (values.label_ids && values.label_ids.length > 0) ? values.label_ids : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create ticket");
      }

      toast({
        title: "Success",
        description: "Ticket created successfully",
      });

      form.reset({
        workspace_id: workspaces[0]?.id || 0,
        related_task_id: undefined,
        assigned_to: undefined,
        title: "",
        description: "",
        priority: "medium",
        estimated_hours: undefined,
        label_ids: [],
      });
      setIsDialogOpen(false);

      if (onTicketCreated) {
        onTicketCreated();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create ticket",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-amber-200/50 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:border-amber-900/30 dark:from-amber-950/30 dark:to-orange-950/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Raise Ticket
            </CardTitle>
            <CardDescription>Create or view project tickets and issues</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button className="gap-2" size="lg">
                <Plus className="h-4 w-4" />
                Create New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Raise New Ticket</DialogTitle>
                <DialogDescription>
                  Quickly create a ticket for any project to track issues and blockers
                </DialogDescription>
              </DialogHeader>

              {loadingWorkspaces ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading projects...</span>
                </div>
              ) : workspaces.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  No projects found. Please create a project first.
                </div>
              ) : (
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
                            onValueChange={(v) => handleWorkspaceChange(parseInt(v))}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a space" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {workspaces.map((ws) => (
                                <SelectItem key={ws.id} value={ws.id.toString()}>
                                  {ws.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>Select the space that owns this ticket</FormDescription>
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
                            onValueChange={(v) => field.onChange(v === "none" ? undefined : parseInt(v))}
                            disabled={projects.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a project" />
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
                      name="assigned_to"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Developer</FormLabel>
                          <Select
                            value={field.value ? field.value.toString() : "none"}
                            onValueChange={(v) => field.onChange(v === "none" ? undefined : parseInt(v))}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Assign to a developer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Unassigned</SelectItem>
                              {developers.map((dev) => (
                                <SelectItem key={dev.id} value={dev.id.toString()}>
                                  {dev.name} ({dev.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>Optional: assign this ticket to the developer who will handle it</FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ticket Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Database connection timeout" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Provide details about the issue..."
                              rows={3}
                              {...field}
                            />
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
                              <SelectItem value="low">Low - Can wait</SelectItem>
                              <SelectItem value="medium">Medium - Normal</SelectItem>
                              <SelectItem value="high">High - Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="estimated_hours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Hours (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g., 8"
                              min="0.5"
                              step="0.5"
                              {...field}
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">How long do you estimate this will take?</p>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="label_ids"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Labels</FormLabel>
                          {loadingLabels ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              <span className="ml-2 text-sm text-muted-foreground">Loading labels...</span>
                            </div>
                          ) : labels.length === 0 ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                              No labels created yet. You can still create the ticket and add labels later.
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {labels.map((label) => {
                                const isSelected = field.value?.includes(label.id);
                                return (
                                  <button
                                    key={label.id}
                                    type="button"
                                    onClick={() => {
                                      const newValue = isSelected
                                        ? (field.value || []).filter((id) => id !== label.id)
                                        : [...(field.value || []), label.id];
                                      field.onChange(newValue);
                                    }}
                                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-all cursor-pointer ${
                                      isSelected
                                        ? "ring-2 ring-offset-1"
                                        : "opacity-60 hover:opacity-100"
                                    }`}
                                    style={{
                                      backgroundColor: label.color + "20",
                                      color: label.color,
                                      ...(isSelected && {
                                        boxShadow: `0 0 0 2px var(--background), 0 0 0 4px ${label.color}`,
                                      }),
                                    }}
                                  >
                                    {label.name}
                                    {isSelected && <X className="h-3 w-3" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          <FormDescription>Select labels to organize your ticket (optional)</FormDescription>
                        </FormItem>
                      )}
                    />

                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Ticket"
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="lg" onClick={() => router.push("/admin/queries")} className="gap-2">
            View All Tickets
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
