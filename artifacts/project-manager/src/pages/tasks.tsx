import { useState } from "react";
import { Layout } from "@/components/layout";
import { StatusBadge } from "@/components/status-badge";
import { PriorityBadge } from "@/components/priority-badge";
import { UserAvatar } from "@/components/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListTasks,
  useListProjects,
  useListMembers,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  getListTasksQueryKey,
  getGetProjectProgressQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, CheckSquare, Pencil, Trash2 } from "lucide-react";
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
  projectId: z.string().min(1, "Project is required"),
  status: z.enum(["todo", "in_progress", "done", "blocked"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  ownerId: z.string().optional(),
  dueDate: z.string().optional(),
});
type TaskForm = z.infer<typeof taskSchema>;

function TaskDialog({
  open,
  onClose,
  task,
}: {
  open: boolean;
  onClose: () => void;
  task?: any;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const create = useCreateTask();
  const update = useUpdateTask();
  const projects = useListProjects();
  const members = useListMembers();
  const isEdit = !!task;

  const form = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      projectId: task?.projectId?.toString() ?? "",
      status: (task?.status as any) ?? "todo",
      priority: (task?.priority as any) ?? "medium",
      ownerId: task?.ownerId?.toString() ?? "",
      dueDate: task?.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "",
    },
  });

  function onSubmit(values: TaskForm) {
    const payload = {
      title: values.title,
      description: values.description || null,
      status: values.status,
      priority: values.priority,
      ownerId: values.ownerId ? parseInt(values.ownerId) : null,
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
      projectId: parseInt(values.projectId),
    };
    if (isEdit) {
      update.mutate(
        { id: task.id, data: payload },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
            toast({ title: "Task updated" });
            onClose();
          },
          onError: () => toast({ title: "Failed to update", variant: "destructive" }),
        }
      );
    } else {
      create.mutate(
        { data: payload },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
            qc.invalidateQueries({ queryKey: getGetProjectProgressQueryKey(parseInt(values.projectId)) });
            toast({ title: "Task created" });
            form.reset();
            onClose();
          },
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
            <FormField control={form.control} name="projectId" render={({ field }) => (
              <FormItem>
                <FormLabel>Project</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger data-testid="select-task-project"><SelectValue placeholder="Select project" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {projects.data?.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea {...field} placeholder="Optional details" rows={2} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
                    <FormControl><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger></FormControl>
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
                  <FormControl><Input type="date" {...field} /></FormControl>
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

export default function TasksPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");

  const qc = useQueryClient();
  const { toast } = useToast();
  const members = useListMembers();
  const projects = useListProjects();
  const deleteTask = useDeleteTask();

  const queryParams: Record<string, string | number | undefined> = {};
  if (filterStatus !== "all") queryParams.status = filterStatus;
  if (filterPriority !== "all") queryParams.priority = filterPriority;
  if (filterOwner !== "all") queryParams.ownerId = parseInt(filterOwner);

  const tasks = useListTasks(queryParams as any);

  const projectMap = Object.fromEntries(
    projects.data?.map((p) => [p.id, p]) ?? []
  );

  function handleDelete() {
    if (!deleteTaskId) return;
    deleteTask.mutate(
      { id: deleteTaskId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
          toast({ title: "Task deleted" });
          setDeleteTaskId(null);
        },
      }
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              All tasks across projects
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} data-testid="button-new-task">
            <Plus className="h-4 w-4 mr-1.5" />
            New Task
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36" data-testid="filter-status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-36" data-testid="filter-priority">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterOwner} onValueChange={setFilterOwner}>
            <SelectTrigger className="w-40" data-testid="filter-owner">
              <SelectValue placeholder="All members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All members</SelectItem>
              {members.data?.map((m) => (
                <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterStatus || filterPriority || filterOwner) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFilterStatus(""); setFilterPriority(""); setFilterOwner(""); }}
              data-testid="button-clear-filters"
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="bg-card border rounded-lg overflow-hidden">
          {tasks.isLoading ? (
            <div className="divide-y">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex gap-4 items-center">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : !tasks.data?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckSquare className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">No tasks found</p>
              {(filterStatus || filterPriority || filterOwner) ? (
                <p className="text-sm text-muted-foreground/70 mt-1">Try clearing the filters</p>
              ) : (
                <Button className="mt-4" size="sm" onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4 mr-1" />New Task
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              <div className="grid grid-cols-[1fr_120px_100px_120px_120px_80px] gap-4 px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
                <span>Title</span>
                <span>Project</span>
                <span>Status</span>
                <span>Priority</span>
                <span>Assignee</span>
                <span>Due</span>
              </div>
              {tasks.data.map((task) => (
                <div
                  key={task.id}
                  className="grid grid-cols-[1fr_120px_100px_120px_120px_80px] gap-4 px-4 py-3 items-center hover:bg-muted/20 group"
                  data-testid={`task-row-${task.id}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
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
                  <div>
                    {projectMap[task.projectId] ? (
                      <span
                        className="text-xs font-medium truncate"
                        style={{ color: projectMap[task.projectId].color }}
                      >
                        {projectMap[task.projectId].name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                  <StatusBadge status={task.status as any} />
                  <PriorityBadge priority={task.priority as any} />
                  <div>
                    {task.owner ? (
                      <div className="flex items-center gap-2">
                        <UserAvatar name={task.owner.name} color={task.owner.avatarColor} className="h-6 w-6" />
                        <span className="text-xs text-muted-foreground truncate">{task.owner.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unassigned</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {task.dueDate ? format(new Date(task.dueDate), "MMM d") : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <TaskDialog open={showCreate} onClose={() => setShowCreate(false)} />
      {editTask && (
        <TaskDialog open={!!editTask} onClose={() => setEditTask(null)} task={editTask} />
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
