import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListProjects,
  useCreateProject,
  useGetProjectProgress,
  getListProjectsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, FolderKanban, CalendarDays, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["active", "on_hold", "completed", "cancelled"]).default("active"),
  color: z.string().default("#0ea5e9"),
  dueDate: z.string().optional(),
});
type CreateProjectForm = z.infer<typeof createProjectSchema>;

const PROJECT_COLORS = [
  "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444",
  "#ec4899", "#6366f1", "#14b8a6", "#f97316", "#84cc16",
];

function ProjectCard({ project }: { project: { id: number; name: string; description?: string | null; status: string; color: string; dueDate?: string | null } }) {
  const progress = useGetProjectProgress(project.id);

  return (
    <Link href={`/projects/${project.id}`} data-testid={`project-card-${project.id}`}>
      <div className="bg-card border rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer group">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: project.color }}
            />
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {project.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={project.status as any} />
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {progress.data ? (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>{progress.data.completedTasks}/{progress.data.totalTasks} tasks</span>
              <span className="font-medium">{progress.data.completionPercentage}%</span>
            </div>
            <Progress value={progress.data.completionPercentage} className="h-1.5" />
            {progress.data.blockedTasks > 0 && (
              <p className="text-xs text-red-500 mt-1.5">
                {progress.data.blockedTasks} blocked
              </p>
            )}
          </div>
        ) : (
          <div className="mt-3">
            <Skeleton className="h-1.5 w-full rounded" />
          </div>
        )}

        {project.dueDate && (
          <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            <span>Due {format(new Date(project.dueDate), "MMM d, yyyy")}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function CreateProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const create = useCreateProject();

  const form = useForm<CreateProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "", description: "", status: "active", color: "#0ea5e9" },
  });

  function onSubmit(values: CreateProjectForm) {
    create.mutate(
      {
        data: {
          name: values.name,
          description: values.description || null,
          status: values.status,
          color: values.color,
          dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          toast({ title: "Project created" });
          form.reset();
          onClose();
        },
        onError: () => {
          toast({ title: "Failed to create project", variant: "destructive" });
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-project-name" placeholder="e.g. Q4 Launch" />
                  </FormControl>
                  <FormMessage />
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
                    <Textarea {...field} data-testid="input-project-description" placeholder="What's this project about?" rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-project-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-project-due-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <div className="flex gap-2 flex-wrap">
                    {PROJECT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        data-testid={`color-swatch-${c}`}
                        onClick={() => field.onChange(c)}
                        className="w-7 h-7 rounded-full border-2 transition-all"
                        style={{
                          backgroundColor: c,
                          borderColor: field.value === c ? "#000" : "transparent",
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={create.isPending}
                data-testid="button-create-project"
              >
                {create.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const projects = useListProjects();

  const grouped = {
    active: projects.data?.filter((p) => p.status === "active") ?? [],
    on_hold: projects.data?.filter((p) => p.status === "on_hold") ?? [],
    completed: projects.data?.filter((p) => p.status === "completed") ?? [],
    cancelled: projects.data?.filter((p) => p.status === "cancelled") ?? [],
  };

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {projects.data?.length ?? 0} total projects
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} data-testid="button-new-project">
            <Plus className="h-4 w-4 mr-1.5" />
            New Project
          </Button>
        </div>

        {projects.isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-lg" />
            ))}
          </div>
        ) : !projects.data?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FolderKanban className="h-10 w-10 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground font-medium">No projects yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Create your first project to get started
            </p>
            <Button className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              New Project
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.active.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Active ({grouped.active.length})
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grouped.active.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </div>
              </section>
            )}
            {grouped.on_hold.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  On Hold ({grouped.on_hold.length})
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grouped.on_hold.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </div>
              </section>
            )}
            {grouped.completed.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Completed ({grouped.completed.length})
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grouped.completed.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </div>
              </section>
            )}
            {grouped.cancelled.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Cancelled ({grouped.cancelled.length})
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grouped.cancelled.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
      <CreateProjectDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </Layout>
  );
}
