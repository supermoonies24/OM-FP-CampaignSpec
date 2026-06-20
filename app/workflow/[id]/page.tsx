import { PhasePlaceholder } from "@/components/workflow/PhasePlaceholder";

export default async function WorkflowCampaignOverview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PhasePlaceholder
      title={`Campaign ${id}`}
      phase="Phase 1"
      description="Campaign overview: current stage, assigned channels, deliverables, and links to brief, timeline, comms, and the spec form."
    />
  );
}
