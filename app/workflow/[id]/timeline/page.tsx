import { PhasePlaceholder } from "@/components/workflow/PhasePlaceholder";

export default function WorkflowTimelinePage() {
  return (
    <PhasePlaceholder
      title="Timeline"
      phase="Phase 1"
      description="Gantt-style timeline per campaign. Each stage shows target vs actual dates and AI-generated risk score with explanation."
    />
  );
}
