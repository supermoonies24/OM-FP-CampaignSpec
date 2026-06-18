import { getContrastTextColor, getValueColor } from "@/lib/valueColors";

export function StatusBadge({ status, color }: { status: string; color?: string }) {
  const bg = color ?? getValueColor(status);
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border-0"
      style={{ backgroundColor: bg, color: getContrastTextColor(bg) }}
    >
      {status}
    </span>
  );
}
