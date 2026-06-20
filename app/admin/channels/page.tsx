import { PhasePlaceholder } from "@/components/workflow/PhasePlaceholder";

export default function AdminChannelsPage() {
  return (
    <PhasePlaceholder
      title="Channel Assignments"
      phase="Phase 1"
      description="Manage which users belong to which channel (Ford Pro, Audience, Strategy, Creative, Dev/Ops, Tech/Dev). Permissions are channel-scoped, not per-user."
    />
  );
}
