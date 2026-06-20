import { PhasePlaceholder } from "@/components/workflow/PhasePlaceholder";

export default function WorkflowBoardPage() {
  return (
    <PhasePlaceholder
      title="Workflow Board"
      phase="Phase 1"
      description="Kanban view of every in-flight campaign across the 21 stages, with stage owners, blockers, and timeline status per card."
    />
  );
}
