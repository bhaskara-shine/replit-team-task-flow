import { useState } from "react";
import { useParams, Link } from "wouter";
import { Layout } from "@/components/layout";
import { StatusBadge } from "@/components/status-badge";
import { PriorityBadge } from "@/components/priority-badge";
import { UserAvatar } from "@/components/user-avatar";
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
  useGetProject,
  useGetProjectProgress,
  useListTasks,
  useListMembers,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useUpdateProject,
  getListTasksQueryKey,
  getGetProjectProgressQueryKey,
  getListProjectsQueryKey,
  getGetProjectQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, ChevronLeft, Pencil, Trash2, CalendarDays, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done", "blocked"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  ownerId: z.string().optional(),
  dueDate: z.string().optional(),
});
type TaskForm = z.infer<typeof taskSchema>;

function TaskDialog({
  open,
  onClose,
  projectId,
  task,
}: {
  open: boolean;
  onClose: () => void;
  projectId: number;
  task?: { id: number; title: string; description?: string | null; status: string; priority: string; ownerId?: number | null; dueDate?: string | null };
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const create = useCreateTask();
  const update = useUpdateTask();
  const members = useListMembers();
  const isEdit = !!task;

  const form = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      status: (task?.status as any) ?? "todo",
      priority: (task?.priority as any) ?? "medium",
      ownerId: task?.ownerId?.toString() ?? "",
      dueDate: task?.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "",
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
    qc.invalidateQueries({ queryKey: getGetProjectProgressQueryKey(projectId) });
  }

  function onSubmit(values: TaskForm) {
    const payload = {
      title: values.title,
      description: values.description || null,
      status: values.status,
      priority: values.priority,
      ownerId: values.ownerId ? parseInt(values.ownerId) : null,
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
    };
    if (isEdit) {
      update.mutate(
        { id: task.id, data: payload },
        {
          onSuccess: () => { invalidate(); toast({ title: "Task updated" }); onClose(); },
          onError: () => toast({ title: "Failed to update", variant: "destructive" }),
        }
      );
    } else {
      create.mutate(
        { data: { ...payload, projectId } },
        {
          onSuccess: () => { invalidate(); toast({ title: "Task created" }); form.reset(); onClose(); },
          onError: () => toast({ title: "Failed to create task", variant: "destructive" }),
        }
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl><Input {...field} data-testid="input-task-title" placeholder="Task title" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea {...field} data-testid="input-task-description" placeholder="Optional details" rows={2} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger data-testid="select-task-status"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger data-testid="select-task-priority"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="ownerId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignee</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger data-testid="select-task-owner"><SelectValue placeholder="Unassigned" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {members.data?.map((m) => (
                        <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl><Input type="date" {...field} data-testid="input-task-due-date" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={create.isPending || update.isPending} data-testid="button-save-task">
                {(create.isPending || update.isPending) ? "Saving..." : isEdit ? "Save Changes" : "Create Task"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const COLUMN_ORDER = ["todo", "in_progress", "blocked", "done"] as const;
const COLUMN_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id!);
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const project = useGetProject(projectId, { query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) } });
  const progress = useGetProjectProgress(projectId, { query: { enabled: !!projectId, queryKey: getGetProjectProgressQueryKey(projectId) } });
  const tasks = useListTasks({ projectId }, { query: { enabled: !!projectId, queryKey: getListTasksQueryKey({ projectId }) } });
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();

  const tasksByStatus = COLUMN_ORDER.reduce((acc, s) => {
    acc[s] = tasks.data?.filter((t) => t.status === s) ?? [];
    return acc;
  }, {} as Record<string, typeof tasks.data>);

  function handleDelete() {
    if (!deleteTaskId) return;
    deleteTask.mutate(
      { id: deleteTaskId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
          qc.invalidateQueries({ queryKey: getGetProjectProgressQueryKey(projectId) });
          toast({ title: "Task deleted" });
          setDeleteTaskId(null);
        },
      }
    );
  }

  function quickStatus(taskId: number, status: string) {
    updateTask.mutate(
      { id: taskId, data: { status: status as any } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
          qc.invalidateQueries({ queryKey: getGetProjectProgressQueryKey(projectId) });
        },
      }
    );
  }

  if (project.isLoading) {
    return (
      <Layout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="grid grid-cols-4 gap-4 mt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!project.data) {
    return (
      <Layout>
        <div className="p-6 text-center py-20">
          <p className="text-muted-foreground">Project not found</p>
          <Link href="/projects">
            <Button variant="outline" className="mt-4">Back to Projects</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const p = project.data;

  return (
    <Layout>
      <div className="p-6 space-y-5 max-w-full">
        {/* Header */}
        <div>
          <Link href="/projects">
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors" data-testid="link-back-projects">
              <ChevronLeft className="h-3.5 w-3.5" />
              Projects
            </button>
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight">{p.name}</h1>
                {p.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">{p.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <StatusBadge status={p.status as any} />
              <Button size="sm" onClick={() => setShowCreate(true)} data-testid="button-add-task">
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            </div>
          </div>

          {/* Progress */}
          {progress.data && (
            <div className="mt-4 flex items-center gap-4">
              <div className="flex-1 max-w-xs">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{progress.data.completedTasks}/{progress.data.totalTasks} tasks done</span>
                  <span>{progress.data.completionPercentage}%</span>
                </div>
                <Progress value={progress.data.completionPercentage} className="h-1.5" />
              </div>
              {p.dueDate && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>Due {format(new Date(p.dueDate), "MMM d, yyyy")}</span>
                </div>
              )}
              {progress.data.overdueCount > 0 && (
                <span className="text-xs text-red-500 font-medium">
                  {progress.data.overdueCount} overdue
                </span>
              )}
            </div>
          )}
        </div>

        {/* Kanban */}
        {tasks.isLoading ? (
          <div className="grid grid-cols-4 gap-4">
            {COLUMN_ORDER.map((s) => (
              <div key={s} className="space-y-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {COLUMN_ORDER.map((col) => (
              <div key={col} className="space-y-3" data-testid={`column-${col}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {COLUMN_LABELS[col]}
                  </h3>
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {tasksByStatus[col]?.length ?? 0}
                  </span>
                </div>
                <div className="space-y-2 min-h-[4rem]">
                  {tasksByStatus[col]?.map((task) => (
                    <div
                      key={task.id}
                      className="bg-card border rounded-lg p-3 group"
                      data-testid={`task-card-${task.id}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-sm font-medium leading-snug flex-1">{task.title}</p>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => setEditTask(task)}
                            className="p-1 hover:bg-accent rounded"
                            data-testid={`button-edit-task-${task.id}`}
                          >
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => setDeleteTaskId(task.id)}
                            className="p-1 hover:bg-destructive/10 rounded"
                            data-testid={`button-delete-task-${task.id}`}
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2 gap-2">
                        <PriorityBadge priority={task.priority as any} showLabel={false} />
                        <div className="flex items-center gap-1.5 ml-auto">
                          {task.dueDate && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(task.dueDate), "MMM d")}
                            </span>
                          )}
                          {task.owner && (
                            <UserAvatar
                              name={task.owner.name}
                              color={task.owner.avatarColor}
                              className="h-6 w-6"
                            />
                          )}
                        </div>
                      </div>
                      {col !== "done" && (
                        <button
                          onClick={() => quickStatus(task.id, "done")}
                          className="mt-2 w-full text-xs text-muted-foreground hover:text-emerald-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`button-complete-task-${task.id}`}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Mark done
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TaskDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        projectId={projectId}
      />
      {editTask && (
        <TaskDialog
          open={!!editTask}
          onClose={() => setEditTask(null)}
          projectId={projectId}
          task={editTask}
        />
      )}
      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
