"use client";

import { UseFormReturn, useWatch } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColoredSelect } from "@/components/ui/ColoredSelect";
import { useSettings } from "@/contexts/SettingsContext";
import type { CampaignFormValues } from "@/app/campaigns/[id]/page";

interface TargetingSectionProps {
  form: UseFormReturn<CampaignFormValues>;
}

export function TargetingSection({ form }: TargetingSectionProps) {
  const { settings } = useSettings();
  const { register, setValue, control } = form;
  const values = useWatch({ control });

  const segments = [
    { label: "Segment 1", field: "seg1Field" as const, condition: "seg1Condition" as const, value: "seg1Value" as const },
    { label: "Segment 2", field: "seg2Field" as const, condition: "seg2Condition" as const, value: "seg2Value" as const },
    { label: "Segment 3", field: "seg3Field" as const, condition: "seg3Condition" as const, value: "seg3Value" as const },
    { label: "Segment 4", field: "seg4Field" as const, condition: "seg4Condition" as const, value: "seg4Value" as const },
  ];

  return (
    <section id="targeting" className="scroll-mt-20">
      <h2 className="text-lg font-semibold mb-4">Targeting</h2>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Segmentation Description</Label>
          <p className="text-xs text-muted-foreground">Include purchase and date qualifications</p>
          <Textarea {...register("segmentationDesc")} rows={3} placeholder="Describe the full segmentation logic…" />
        </div>

        <div className="space-y-1.5">
          <Label>Audience Source</Label>
          <ColoredSelect
            value={values.audienceSource ?? ""}
            onValueChange={(v) => setValue("audienceSource", v, { shouldDirty: true })}
            options={settings.dropdown_audienceSource}
            className="max-w-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {segments.map(({ label, field, condition, value }) => (
            <Card key={label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Field Name</Label>
                  <Input {...register(field)} placeholder="e.g. Fleet_Size" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Condition</Label>
                  <Input {...register(condition)} placeholder="e.g. equals, contains" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Value</Label>
                  <Input {...register(value)} placeholder="e.g. Large" className="h-8 text-sm" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label>Engagement Splits</Label>
          <p className="text-xs text-muted-foreground">
            Will there be additional engagement splits based on click or open behavior? If yes, please explain.
          </p>
          <Textarea {...register("engagementSplits")} rows={3} placeholder="Describe engagement split logic…" />
        </div>
      </div>
    </section>
  );
}
