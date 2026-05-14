"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAllTasks, getToken } from "@/lib/api";

const API_BASE = "/api";

const querySchema = z.object({
  workspace_id: z.coerce.number().min(1, "Project is required"),
  related_task_id: z.coerce.number().int().positive().optional(),
  title: z.string().min(5, "Title must be at least 5 characters").max(300),
  description: z.string().max(2000).optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

type QueryFormValues = z.infer<typeof querySchema>;

interface QueryCreationFormProps {
  workspaces: Array<{ id: number; name: string }>;
  onSuccess?: () => void;
}

interface Project {
  id: number;
  title: string;
  public_id?: string;
  workspace_id?: number | null;
}

export function QueryCreationForm({ workspaces, onSuccess }: QueryCreationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const { toast } = useToast();

  const form = useForm<QueryFormValues>({
    resolver: zodResolver(querySchema),
    defaultValues: {
      workspace_id: workspaces[0]?.id || 0,
      related_task_id: undefined,
      title: "",
      description: "",
      priority: "medium",
    },
  });

  const loadProjects = async (workspaceId: number) => {
    try {
      const result = await getAllTasks(undefined, undefined, workspaceId, { rootsOnly: true });
      const filteredProjects = (result.data || []).filter((task) => !task.parent_task_id);
      setProjects(filteredProjects);
      form.setValue("related_task_id", filteredProjects[0]?.id ?? undefined);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      setProjects([]);
      form.setValue("related_task_id", undefined);
    }
  };

  useEffect(() => {
    if (workspaces.length > 0) {
      const defaultWorkspaceId = form.getValues("workspace_id") || workspaces[0].id;
      form.setValue("workspace_id", defaultWorkspaceId);
      loadProjects(defaultWorkspaceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaces]);

  const onSubmit = async (values: QueryFormValues) => {
    setIsSubmitting(true);
    setIsSuccess(false);

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
          related_task_id: values.related_task_id || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create ticket");
      }

      const data = await response.json();
      setIsSuccess(true);
      form.reset();
      setProjects([]);

      toast({
        title: "Success",
        description: `Ticket #${data.id} created successfully`,
      });

      if (onSuccess) {
        setTimeout(onSuccess, 500);
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
    <div className="space-y-6">
      {isSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-800">Ticket created successfully!</p>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Space Selection */}
          <FormField
            control={form.control}
            name="workspace_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Space</FormLabel>
                <Select
                  value={field.value.toString()}
                  onValueChange={(v) => {
                    const workspaceId = parseInt(v);
                    field.onChange(workspaceId);
                    loadProjects(workspaceId);
                  }}
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
                <FormDescription>Select the space for this ticket</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Project Selection */}
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
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ticket Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Database connection timeout issue"
                    {...field}
                  />
                </FormControl>
                <FormDescription>Brief summary of the ticket</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Provide detailed information about the ticket..."
                    className="resize-none"
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormDescription>Additional context or steps to reproduce</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Priority */}
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
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Ticket...
              </>
            ) : (
              "Create Ticket"
            )}
          </Button>
        </form>
      </Form>

      {/* Quick Tips */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-sm text-blue-900 mb-2">Quick Tips:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Be specific in the title for easy identification</li>
          <li>• Add details that help track the issue</li>
          <li>• Set appropriate priority level</li>
          <li>• Use this to track blockers and issues with projects</li>
        </ul>
      </div>
    </div>
  );
}
