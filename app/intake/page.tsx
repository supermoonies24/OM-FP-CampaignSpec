import { PhasePlaceholder } from "@/components/workflow/PhasePlaceholder";

export default function IntakePage() {
  return (
    <PhasePlaceholder
      title="New Campaign Intake"
      phase="Phase 1"
      description="Strategy team submits a new campaign request. On submit, creates a WorkflowCampaign, fires Outlook calendar invites for OM Alignment, and notifies all channels."
    />
  );
}
