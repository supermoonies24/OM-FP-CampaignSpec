"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Plus } from "lucide-react";
import { UseFormReturn, useWatch } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ColoredSelect } from "@/components/ui/ColoredSelect";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useSettings } from "@/contexts/SettingsContext";
import type { CampaignFormValues } from "@/app/campaigns/[id]/page";

interface TargetingSectionProps {
  form: UseFormReturn<CampaignFormValues>;
}

const MAX_SEGMENTS = 10;

function segmentFields(n: number) {
  return {
    field: `seg${n}Field` as keyof CampaignFormValues,
    condition: `seg${n}Condition` as keyof CampaignFormValues,
    value: `seg${n}Value` as keyof CampaignFormValues,
  };
}

// A segment counts as "filled" if any of its three sub-fields has data. Used to figure out
// how many segment rows to show on load, since the count itself isn't a persisted field.
function countFilledSegments(values: Partial<CampaignFormValues>): number {
  for (let n = MAX_SEGMENTS; n >= 1; n--) {
    const { field, condition, value } = segmentFields(n);
    if (values[field] || values[condition] || values[value]) return n;
  }
  return 1;
}

export function TargetingSection({ form }: TargetingSectionProps) {
  const { settings } = useSettings();
  const { register, setValue, control, getValues } = form;
  const values = useWatch({ control });

  const [segmentCount, setSegmentCount] = useState(() => countFilledSegments(getValues()));
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggleExpanded(n: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }

  function addSegment() {
    const next = Math.min(MAX_SEGMENTS, segmentCount + 1);
    setSegmentCount(next);
    setExpanded((prev) => new Set(prev).add(next));
  }

  return (
    <section id="targeting" className="scroll-mt-20">
      <SectionHeading id="targeting" title="Targeting" />

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

        <div className="space-y-1.5">
          <Label>Segments</Label>
          <div className="space-y-2">
            {Array.from({ length: segmentCount }, (_, i) => i + 1).map((n) => {
              const { field, condition, value } = segmentFields(n);
              const isOpen = expanded.has(n);
              const preview = [values[field], values[condition], values[value]].filter(Boolean).join(" · ");
              const isLast = n === segmentCount;

              return (
                <Collapsible key={n} open={isOpen} onOpenChange={() => toggleExpanded(n)}>
                  <Card>
                    <div className="flex items-center gap-2 px-4 py-2.5">
                      <CollapsibleTrigger asChild>
                        <button type="button" className="flex-1 flex items-center gap-2 text-left min-w-0">
                          {isOpen
                            ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                          <span className="text-sm truncate">
                            {preview || <span className="text-muted-foreground">Empty segment</span>}
                          </span>
                        </button>
                      </CollapsibleTrigger>
                      {isLast && segmentCount < MAX_SEGMENTS && (
                        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={addSegment}>
                          <Plus className="h-3.5 w-3.5" />
                          Add Segment
                        </Button>
                      )}
                    </div>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-3 gap-2">
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
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
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
