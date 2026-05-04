import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  color?: string;
  className?: string;
  showTooltip?: boolean;
}

export function UserAvatar({ name, color, className, showTooltip = true }: UserAvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const content = (
    <Avatar className={cn("h-8 w-8 border border-background", className)}>
      <AvatarFallback 
        className="text-white font-medium text-xs" 
        style={{ backgroundColor: color || "#64748b" }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  if (!showTooltip) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {content}
      </TooltipTrigger>
      <TooltipContent>
        <p>{name}</p>
      </TooltipContent>
    </Tooltip>
  );
}
