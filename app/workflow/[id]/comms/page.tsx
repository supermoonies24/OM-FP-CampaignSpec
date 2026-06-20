import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PhasePlaceholder } from "@/components/workflow/PhasePlaceholder";
import { CampaignTabs } from "@/components/workflow/CampaignTabs";

export default async function WorkflowCommsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b bg-background px-6 py-4 flex items-center gap-4">
        <Link href={`/workflow/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-semibold">Comms</h1>
        <div className="flex-1" />
        <CampaignTabs campaignId={id} active="comms" />
      </div>
      <PhasePlaceholder
        title="Comms"
        phase="Phase 3"
        description="Unified comment log across channels: in-app comments, Figma comments (polled via API), and Outlook email replies."
      />
    </div>
  );
}
