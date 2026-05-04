import { useState } from "react";
import { Layout } from "@/components/layout";
import { UserAvatar } from "@/components/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListMembers,
  useGetMemberWorkload,
  useCreateMember,
  useUpdateMember,
  useDeleteMember,
  getListMembersQueryKey,
  getGetMemberWorkloadQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Mail, Briefcase, Pencil, Trash2 } from "lucide-react";
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

const AVATAR_COLORS = [
  "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444",
  "#ec4899", "#6366f1", "#14b8a6", "#f97316", "#84cc16",
];

const memberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  role: z.string().min(1, "Role is required"),
  avatarColor: z.string().default("#0ea5e9"),
});
type MemberForm = z.infer<typeof memberSchema>;

function MemberDialog({
  open,
  onClose,
  member,
}: {
  open: boolean;
  onClose: () => void;
  member?: { id: number; name: string; email: string; role: string; avatarColor: string };
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const create = useCreateMember();
  const update = useUpdateMember();
  const isEdit = !!member;

  const form = useForm<MemberForm>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      name: member?.name ?? "",
      email: member?.email ?? "",
      role: member?.role ?? "",
      avatarColor: member?.avatarColor ?? "#0ea5e9",
    },
  });

  function onSubmit(values: MemberForm) {
    if (isEdit) {
      update.mutate(
        { id: member.id, data: values },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListMembersQueryKey() });
            qc.invalidateQueries({ queryKey: getGetMemberWorkloadQueryKey() });
            toast({ title: "Member updated" });
            onClose();
          },
          onError: () => toast({ title: "Failed to update", variant: "destructive" }),
        }
      );
    } else {
      create.mutate(
        { data: values },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListMembersQueryKey() });
            qc.invalidateQueries({ queryKey: getGetMemberWorkloadQueryKey() });
            toast({ title: "Member added" });
            form.reset();
            onClose();
          },
          onError: () => toast({ title: "Failed to add member", variant: "destructive" }),
        }
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Member" : "Add Team Member"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex justify-center py-2">
              <UserAvatar
                name={form.watch("name") || "?"}
                color={form.watch("avatarColor")}
                className="h-16 w-16 text-xl"
                showTooltip={false}
              />
            </div>
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl><Input {...field} data-testid="input-member-name" placeholder="e.g. Alex Chen" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input {...field} type="email" data-testid="input-member-email" placeholder="alex@company.com" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <FormControl><Input {...field} data-testid="input-member-role" placeholder="e.g. Engineer, Designer" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="avatarColor" render={({ field }) => (
              <FormItem>
                <FormLabel>Avatar Color</FormLabel>
                <div className="flex gap-2 flex-wrap">
                  {AVATAR_COLORS.map((c) => (
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
            )} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={create.isPending || update.isPending} data-testid="button-save-member">
                {(create.isPending || update.isPending) ? "Saving..." : isEdit ? "Save Changes" : "Add Member"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function MembersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editMember, setEditMember] = useState<any>(null);
  const [deleteMemberId, setDeleteMemberId] = useState<number | null>(null);

  const qc = useQueryClient();
  const { toast } = useToast();
  const members = useListMembers();
  const workload = useGetMemberWorkload();
  const deleteMember = useDeleteMember();

  const workloadMap = Object.fromEntries(
    workload.data?.map((w) => [w.memberId, w]) ?? []
  );

  function handleDelete() {
    if (!deleteMemberId) return;
    deleteMember.mutate(
      { id: deleteMemberId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListMembersQueryKey() });
          qc.invalidateQueries({ queryKey: getGetMemberWorkloadQueryKey() });
          toast({ title: "Member removed" });
          setDeleteMemberId(null);
        },
      }
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {members.data?.length ?? 0} people on the team
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} data-testid="button-add-member">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Member
          </Button>
        </div>

        {members.isLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : !members.data?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground font-medium">No team members yet</p>
            <Button className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Member
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {members.data.map((member) => {
              const w = workloadMap[member.id];
              const pct = w && w.totalTasks > 0
                ? Math.round((w.completedTasks / w.totalTasks) * 100)
                : 0;

              return (
                <div
                  key={member.id}
                  className="bg-card border rounded-lg p-5 group"
                  data-testid={`member-card-${member.id}`}
                >
                  <div className="flex items-start gap-4">
                    <UserAvatar
                      name={member.name}
                      color={member.avatarColor}
                      className="h-12 w-12 text-base"
                      showTooltip={false}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{member.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                            <Briefcase className="h-3 w-3" />
                            <span>{member.role}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{member.email}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => setEditMember(member)}
                            className="p-1.5 hover:bg-accent rounded"
                            data-testid={`button-edit-member-${member.id}`}
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => setDeleteMemberId(member.id)}
                            className="p-1.5 hover:bg-destructive/10 rounded"
                            data-testid={`button-delete-member-${member.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      </div>

                      {w ? (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>{w.completedTasks}/{w.totalTasks} tasks</span>
                            <span>{pct}% done</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                          <div className="flex gap-3 mt-1.5">
                            {w.inProgressTasks > 0 && (
                              <span className="text-xs text-blue-600">{w.inProgressTasks} active</span>
                            )}
                            {w.blockedTasks > 0 && (
                              <span className="text-xs text-red-500">{w.blockedTasks} blocked</span>
                            )}
                            {w.totalTasks === 0 && (
                              <span className="text-xs text-muted-foreground">No tasks assigned</span>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <MemberDialog open={showCreate} onClose={() => setShowCreate(false)} />
      {editMember && (
        <MemberDialog open={!!editMember} onClose={() => setEditMember(null)} member={editMember} />
      )}
      <AlertDialog open={!!deleteMemberId} onOpenChange={() => setDeleteMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the member from the team. Their tasks will become unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
