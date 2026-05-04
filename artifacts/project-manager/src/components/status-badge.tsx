import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "active" | "on_hold" | "completed" | "cancelled" | "todo" | "in_progress" | "done" | "blocked";
  className?: string;
}

const statusConfig = {
  active: { label: "Active", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  on_hold: { label: "On Hold", className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20" },
  completed: { label: "Completed", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  cancelled: { label: "Cancelled", className: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20" },
  todo: { label: "To Do", className: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20" },
  in_progress: { label: "In Progress", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  done: { label: "Done", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  blocked: { label: "Blocked", className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.todo;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
