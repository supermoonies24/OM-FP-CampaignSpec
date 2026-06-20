import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PhasePlaceholder } from "@/components/workflow/PhasePlaceholder";
import { CampaignTabs } from "@/components/workflow/CampaignTabs";

export default async function WorkflowBriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b bg-background px-6 py-4 flex items-center gap-4">
        <Link href={`/workflow/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-semibold">Brief</h1>
        <div className="flex-1" />
        <CampaignTabs campaignId={id} active="brief" />
      </div>
      <PhasePlaceholder
        title="Brief Deck"
        phase="Phase 2"
        description="AI-generated campaign brief: high-level journey, SFMC Journey Builder diagram, full timeline, and pre-filled spec form fields. Rendered to pptx via pptxgenjs."
      />
    </div>
  );
}
