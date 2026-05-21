import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  sent: "Sent",
};

const STATUS_CLASSES: Record<string, string> = {
  draft: "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200",
  in_review: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border-0",
        STATUS_CLASSES[status] ?? STATUS_CLASSES.draft
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
