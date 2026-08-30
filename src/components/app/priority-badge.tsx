import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  high: "bg-amber-500/15 text-amber-700 dark:text-amber-500",
  urgent: "bg-destructive/15 text-destructive",
};

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent capitalize", STYLES[priority])}
    >
      {priority}
    </Badge>
  );
}
