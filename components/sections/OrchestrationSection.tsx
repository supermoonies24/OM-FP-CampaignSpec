"use client";

import { UseFormReturn, useWatch } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { CampaignFormValues } from "@/app/campaigns/[id]/page";

interface OrchestrationSectionProps {
  form: UseFormReturn<CampaignFormValues>;
}

export function OrchestrationSection({ form }: OrchestrationSectionProps) {
  const { register, control } = form;
  const values = useWatch({ control });

  const showBanner = (values.numSends ?? 1) > 1 || values.contentBlock;

  return (
    <section id="orchestration" className="scroll-mt-20">
      <h2 className="text-lg font-semibold mb-4">Orchestration</h2>

      {showBanner && (
        <div className="mb-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
          Email name generation is active here because this campaign has multiple sends or includes a content block.
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Orchestration Description</Label>
        <p className="text-xs text-muted-foreground">
          What should the order of email sends be and the timing in between?
        </p>
        <Textarea
          {...register("orchestrationDesc")}
          rows={5}
          placeholder="Describe the send order and timing. E.g. Email 1 sends on day 0, Email 2 sends 3 days later to non-openers…"
        />
      </div>
    </section>
  );
}
