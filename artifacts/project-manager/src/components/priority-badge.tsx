import { cn } from "@/lib/utils";
import { AlertCircle, ArrowDown, ArrowRight, ArrowUp } from "lucide-react";

interface PriorityBadgeProps {
  priority: "low" | "medium" | "high" | "urgent";
  className?: string;
  showLabel?: boolean;
}

const priorityConfig = {
  low: { label: "Low", icon: ArrowDown, className: "text-gray-500" },
  medium: { label: "Medium", icon: ArrowRight, className: "text-blue-500" },
  high: { label: "High", icon: ArrowUp, className: "text-orange-500" },
  urgent: { label: "Urgent", icon: AlertCircle, className: "text-red-500" },
};

export function PriorityBadge({ priority, className, showLabel = true }: PriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig.medium;
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-1.5", config.className, className)}>
      <Icon className="h-4 w-4" />
      {showLabel && <span className="text-xs font-medium">{config.label}</span>}
    </div>
  );
}
