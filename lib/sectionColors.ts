export const SECTION_COLORS: Record<string, string> = {
  overview: "#3b82f6",
  "special-instructions": "#f97316",
  targeting: "#a855f7",
  orchestration: "#14b8a6",
  links: "#ec4899",
  "seed-lists": "#22c55e",
};

export function getSectionColor(id: string): string {
  return SECTION_COLORS[id] ?? "#64748b";
}
