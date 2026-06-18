"use client";

import { UseFormReturn, useWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ColoredSelect } from "@/components/ui/ColoredSelect";
import { EmailNameOutput } from "@/components/ui/EmailNameOutput";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useSettings } from "@/contexts/SettingsContext";
import { generateContentBlockName } from "@/lib/emailNameGenerator";
import type { CampaignFormValues } from "@/app/campaigns/[id]/page";

interface SpecialInstructionsSectionProps {
  form: UseFormReturn<CampaignFormValues>;
}

export function SpecialInstructionsSection({ form }: SpecialInstructionsSectionProps) {
  const { settings } = useSettings();
  const { register, setValue, control } = form;
  const values = useWatch({ control });

  const contentBlockName = generateContentBlockName({
    weekOf: values.weekOf,
    contentBlockProductLine: values.contentBlockProductLine,
    contentBlockProductName: values.contentBlockProductName,
  });

  function sel(name: keyof CampaignFormValues) {
    return (val: string) => setValue(name, val as never, { shouldDirty: true });
  }

  return (
    <section id="special-instructions" className="scroll-mt-20">
      <SectionHeading id="special-instructions" title="Special Instructions" />
      <div className="grid grid-cols-2 gap-4">

        {/* Card 1 — A/B Test */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">A/B Test</CardTitle>
              <Switch
                checked={values.abTest ?? false}
                onCheckedChange={(v) => setValue("abTest", v, { shouldDirty: true })}
              />
            </div>
          </CardHeader>
          {values.abTest && (
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Test Type</Label>
                <ColoredSelect
                  value={values.abTestType ?? ""}
                  onValueChange={sel("abTestType")}
                  options={settings.dropdown_abTestType}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Audience Split</Label>
                <ColoredSelect
                  value={values.abAudienceSplit ?? ""}
                  onValueChange={sel("abAudienceSplit")}
                  options={settings.dropdown_abAudienceSplit}
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Card 2 — Content Block (full width) */}
        <Card className="col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Content Block</CardTitle>
              <Switch
                checked={values.contentBlock ?? false}
                onCheckedChange={(v) => setValue("contentBlock", v, { shouldDirty: true })}
              />
            </div>
          </CardHeader>
          {values.contentBlock && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Product Line (Full)</Label>
                  <ColoredSelect
                    value={values.contentBlockProductLine ?? ""}
                    onValueChange={sel("contentBlockProductLine")}
                    options={settings.dropdown_productLineFull}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Product Name</Label>
                  <Input {...register("contentBlockProductName")} placeholder="e.g. SpringBanner" />
                </div>
              </div>
              <EmailNameOutput
                value={contentBlockName}
                label="Generated Content Block Name"
              />
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea {...register("contentBlockDesc")} placeholder="Describe the content block…" rows={3} />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Card 3 — Notes (full width) */}
        <Card className="col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea {...register("notes")} placeholder="General campaign notes…" rows={4} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
