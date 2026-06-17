const COLORS = [
  "#3b82f6", "#22c55e", "#a855f7", "#f97316",
  "#ec4899", "#14b8a6", "#eab308", "#ef4444",
  "#6366f1", "#06b6d4", "#84cc16", "#f43f5e",
  "#8b5cf6", "#10b981", "#f59e0b", "#64748b",
];

function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function getValueColor(value: string, overrides?: Record<string, string>): string {
  if (!value) return "#94a3b8";
  if (overrides?.[value]) return overrides[value];
  return COLORS[hash(value) % COLORS.length];
}
