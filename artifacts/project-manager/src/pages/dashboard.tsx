import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { StatusBadge } from "@/components/status-badge";
import { PriorityBadge } from "@/components/priority-badge";
import { UserAvatar } from "@/components/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  useGetDashboardSummary,
  useGetRecentActivity,
  useGetMemberWorkload,
  useGetUpcomingDeadlines,
} from "@workspace/api-client-react";
import { formatDistanceToNow, format, isToday, isTomorrow } from "date-fns";
import {
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  TrendingUp,
  Activity,
} from "lucide-react";

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-card border rounded-lg p-5" data-testid="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p
            className={`mt-1.5 text-3xl font-bold ${accent || "text-foreground"}`}
          >
            {value}
          </p>
          {sub && (
            <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
          )}
        </div>
        <div className="p-2 bg-muted rounded-md">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

function formatDeadline(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "MMM d");
}

export default function DashboardPage() {
  const summary = useGetDashboardSummary();
  const activity = useGetRecentActivity({ limit: 8 });
  const workload = useGetMemberWorkload();
  const upcoming = useGetUpcomingDeadlines({ days: 7 });

  const s = summary.data;

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Team overview and activity
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summary.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))
          ) : (
            <>
              <StatCard
                label="Active Projects"
                value={s?.activeProjects ?? 0}
                icon={Layers}
                sub={`${s?.totalProjects ?? 0} total`}
              />
              <StatCard
                label="Completion Rate"
                value={`${s?.completionRate ?? 0}%`}
                icon={TrendingUp}
                sub={`${s?.completedTasks ?? 0} of ${s?.totalTasks ?? 0} tasks done`}
                accent="text-primary"
              />
              <StatCard
                label="In Progress"
                value={s?.inProgressTasks ?? 0}
                icon={Clock}
                sub="tasks active"
              />
              <StatCard
                label="Overdue"
                value={s?.overdueTasks ?? 0}
                icon={AlertTriangle}
                sub="tasks past deadline"
                accent={
                  (s?.overdueTasks ?? 0) > 0 ? "text-red-500" : undefined
                }
              />
            </>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-card border rounded-lg">
            <div className="px-5 py-4 border-b flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Recent Activity</h2>
            </div>
            <div className="divide-y">
              {activity.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-5 py-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3 mt-1.5" />
                  </div>
                ))
              ) : !activity.data?.length ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No activity yet
                </div>
              ) : (
                activity.data.map((item) => (
                  <div
                    key={item.id}
                    className="px-5 py-3"
                    data-testid={`activity-item-${item.id}`}
                  >
                    <p className="text-sm">{item.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {item.memberName && (
                        <span className="text-xs text-muted-foreground font-medium">
                          {item.memberName}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-card border rounded-lg">
            <div className="px-5 py-4 border-b flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Upcoming Deadlines</h2>
              <span className="text-xs text-muted-foreground ml-auto">
                Next 7 days
              </span>
            </div>
            <div className="divide-y">
              {upcoming.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-5 py-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2 mt-1.5" />
                  </div>
                ))
              ) : !upcoming.data?.length ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No deadlines in the next 7 days
                </div>
              ) : (
                upcoming.data.map((task) => (
                  <div
                    key={task.id}
                    className="px-5 py-3 flex items-start justify-between gap-3"
                    data-testid={`deadline-task-${task.id}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <PriorityBadge
                          priority={task.priority as "low" | "medium" | "high" | "urgent"}
                          showLabel={false}
                        />
                        {task.owner && (
                          <span className="text-xs text-muted-foreground">
                            {task.owner.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-primary shrink-0 mt-0.5">
                      {formatDeadline(task.dueDate)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Team Workload */}
        <div className="bg-card border rounded-lg">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Team Workload</h2>
          </div>
          <div className="divide-y">
            {workload.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-5 py-4">
                  <Skeleton className="h-4 w-1/4 mb-2" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))
            ) : !workload.data?.length ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No team members yet
              </div>
            ) : (
              workload.data.map((member) => {
                const pct =
                  member.totalTasks > 0
                    ? Math.round(
                        (member.completedTasks / member.totalTasks) * 100
                      )
                    : 0;
                return (
                  <div
                    key={member.memberId}
                    className="px-5 py-4"
                    data-testid={`workload-member-${member.memberId}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={member.memberName}
                          color={member.avatarColor}
                          showTooltip={false}
                          className="h-7 w-7"
                        />
                        <div>
                          <span className="text-sm font-medium">
                            {member.memberName}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{member.completedTasks}/{member.totalTasks} done</span>
                        <span className="font-semibold text-foreground">
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <div className="flex gap-4 mt-2">
                      {member.inProgressTasks > 0 && (
                        <span className="text-xs text-blue-600">
                          {member.inProgressTasks} in progress
                        </span>
                      )}
                      {member.todoTasks > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {member.todoTasks} todo
                        </span>
                      )}
                      {member.blockedTasks > 0 && (
                        <span className="text-xs text-red-500">
                          {member.blockedTasks} blocked
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
