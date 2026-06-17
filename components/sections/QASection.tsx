import { SectionHeading } from "@/components/ui/SectionHeading";

export function QASection() {
  return (
    <section id="qa" className="scroll-mt-20">
      <SectionHeading id="qa" title="QA & Sign-off" />
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-muted-foreground text-sm">TBD — fields to be defined</p>
        <p className="text-xs text-muted-foreground mt-1">
          This section will be configured in a future iteration.
        </p>
      </div>
    </section>
  );
}
