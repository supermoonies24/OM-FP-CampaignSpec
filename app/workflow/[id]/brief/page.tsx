import { PhasePlaceholder } from "@/components/workflow/PhasePlaceholder";

export default function WorkflowBriefPage() {
  return (
    <PhasePlaceholder
      title="Brief Deck"
      phase="Phase 2"
      description="AI-generated campaign brief: high-level journey, SFMC Journey Builder diagram, full timeline, and pre-filled spec form fields. Rendered to pptx via pptxgenjs."
    />
  );
}
