import { getSectionColor } from "@/lib/sectionColors";

export function SectionHeading({ id, title }: { id: string; title: string }) {
  const color = getSectionColor(id);
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className="w-1.5 h-5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <h2 className="text-lg font-semibold" style={{ color }}>{title}</h2>
    </div>
  );
}
