"use client";

import { UseFormReturn, useWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmailNameOutput } from "@/components/ui/EmailNameOutput";
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
      <h2 className="text-lg font-semibold mb-4">Special Instructions</h2>
      <div className="grid grid-cols-2 gap-4">

        {/* Card 1 — Send Throttle */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Send Throttle</CardTitle>
              <Switch
                checked={values.sendThrottle ?? false}
                onCheckedChange={(v) => setValue("sendThrottle", v, { shouldDirty: true })}
              />
            </div>
          </CardHeader>
          {values.sendThrottle && (
            <CardContent>
              <div className="space-y-1.5">
                <Label>Rate?</Label>
                <Input {...register("sendThrottleRate")} placeholder="e.g. 10,000/hour" />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Card 2 — A/B Test */}
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
                <Select value={values.abTestType ?? ""} onValueChange={sel("abTestType")}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {settings.dropdown_abTestType.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Audience Split</Label>
                <Select value={values.abAudienceSplit ?? ""} onValueChange={sel("abAudienceSplit")}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {settings.dropdown_abAudienceSplit.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Card 3 — Content Block (full width) */}
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
                  <Select value={values.contentBlockProductLine ?? ""} onValueChange={sel("contentBlockProductLine")}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {settings.dropdown_productLineFull.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
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

        {/* Card 4 — Notes (full width) */}
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
