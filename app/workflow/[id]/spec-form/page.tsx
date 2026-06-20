import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { CampaignTabs } from "@/components/workflow/CampaignTabs";

export default async function SpecFormRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await prisma.workflowCampaign.findUnique({
    where: { id },
    select: { id: true, name: true, specFormId: true },
  });
  if (!campaign) return null;

  if (campaign.specFormId) {
    redirect(`/campaigns/${campaign.specFormId}`);
  }

  // No spec form attached — show a stub with a back link to the overview
  // (where the SpecFormPanel can attach one).
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b bg-background px-6 py-4 flex items-center gap-4">
        <Link href={`/workflow/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-semibold">{campaign.name}</h1>
        <div className="flex-1" />
        <CampaignTabs campaignId={id} active="specForm" />
      </div>
      <div className="max-w-md mx-auto px-6 py-16 text-center space-y-3">
        <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
        <h2 className="font-semibold">No spec form attached</h2>
        <p className="text-sm text-muted-foreground">
          Attach one from the campaign overview. Once linked, this tab jumps straight to the spec form editor.
        </p>
        <Link href={`/workflow/${id}`} className="inline-block text-sm text-primary hover:underline">
          ← Back to overview
        </Link>
      </div>
    </div>
  );
}
