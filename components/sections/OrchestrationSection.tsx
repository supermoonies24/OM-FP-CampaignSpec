"use client";

import { UseFormReturn, useWatch } from "react-hook-form";
import { ChevronLeft, Copy } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { EmailNameOutput } from "@/components/ui/EmailNameOutput";
import { ColoredSelect, ValueChip } from "@/components/ui/ColoredSelect";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useSettings } from "@/contexts/SettingsContext";
import { generateOrchestrationEmailName } from "@/lib/emailNameGenerator";
import { cn } from "@/lib/utils";
import type { CampaignFormValues, EmailSendFormValues } from "@/app/campaigns/[id]/page";

interface OrchestrationSectionProps {
  form: UseFormReturn<CampaignFormValues>;
  sends: EmailSendFormValues[];
  onSendChange: (index: number, field: keyof EmailSendFormValues, value: unknown) => void;
  weekOf: string | null | undefined;
}

const NAME_VALIDATION_ERROR = "Description cannot contain spaces, dashes, or underscores — it is used directly in the generated email name";
const RAIL_HEIGHT = 560;

function isEmailComplete(send: EmailSendFormValues): boolean {
  return !!(send.productLine && send.description && send.audience && send.segmentation && send.country && send.language);
}

// Cycle of card accent colors so adjacent cards in the rail are visually distinct
const CARD_ACCENTS = ["#3b82f6", "#a855f7", "#f97316", "#14b8a6", "#ec4899", "#22c55e", "#eab308", "#6366f1"];

interface SendCardProps {
  send: EmailSendFormValues;
  index: number;
  accent: string;
  expanded: boolean;
  onToggle: () => void;
  onChange: (field: keyof EmailSendFormValues, value: unknown) => void;
  weekOf: string | null | undefined;
  onCopyFromPrevious?: () => void;
}

function MinimizedCard({ send, index, accent, onToggle }: Pick<SendCardProps, "send" | "index" | "accent" | "onToggle">) {
  const complete = isEmailComplete(send);
  const summaryValues = [send.productLine, send.audience, send.country].filter(Boolean) as string[];

  return (
    <button
      type="button"
      onClick={onToggle}
      style={{ borderTopColor: accent, height: RAIL_HEIGHT }}
      className="shrink-0 w-44 border-t-4 border rounded-xl bg-card hover:bg-accent/40 transition-colors flex flex-col items-start gap-2 p-4 text-left"
    >
      <div className="flex items-center gap-2 w-full">
        <span className={cn("w-2 h-2 rounded-full shrink-0", complete ? "bg-green-500" : "bg-muted-foreground/30")} />
        <span className="font-semibold" style={{ color: accent }}>Email {index + 1}</span>
      </div>
      {send.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">{send.description}</p>
      )}
      <div className="flex flex-col gap-1 mt-1">
        {summaryValues.map((v) => <ValueChip key={v} value={v} />)}
      </div>
      <span className="text-xs text-muted-foreground mt-auto">Click to expand →</span>
    </button>
  );
}

function ExpandedCard({ send, index, accent, onToggle, onChange, weekOf, onCopyFromPrevious }: SendCardProps) {
  const { settings } = useSettings();
  const [descError, setDescError] = useState("");

  const emailName = generateOrchestrationEmailName({
    productLine: send.productLine,
    weekOf,
    description: send.description,
    audience: send.audience,
    segmentation: send.segmentation,
    country: send.country,
    language: send.language,
    versionType: send.versionType,
    emailGroupNum: send.emailGroupNum,
  });

  function sel(field: keyof EmailSendFormValues) {
    return (val: string) => onChange(field, val);
  }

  function validateDesc(v: string) {
    setDescError(v && !/^[^\s\-_]+$/.test(v) ? NAME_VALIDATION_ERROR : "");
  }

  return (
    <div
      style={{ borderTopColor: accent, height: RAIL_HEIGHT }}
      className="shrink-0 w-[560px] border-t-4 border rounded-xl bg-card flex flex-col overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
        <button type="button" className="flex items-center gap-2" onClick={onToggle}>
          <ChevronLeft className="h-4 w-4" />
          <span className="font-semibold" style={{ color: accent }}>Email {index + 1}</span>
        </button>
        {onCopyFromPrevious && (
          <Button type="button" variant="ghost" size="sm" className="ml-auto shrink-0 text-xs h-7 gap-1" onClick={onCopyFromPrevious}>
            <Copy className="h-3 w-3" />
            Copy Email {index}
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Product Line</Label>
            <ColoredSelect value={send.productLine ?? ""} onValueChange={sel("productLine")} options={settings.dropdown_productLineShort} />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              value={send.description ?? ""}
              onChange={(e) => { onChange("description", e.target.value); validateDesc(e.target.value); }}
              placeholder="e.g. SpringFleetPromo"
            />
            {descError
              ? <p className="text-xs text-destructive">{descError}</p>
              : <p className="text-xs text-muted-foreground">No spaces, dashes, or underscores</p>
            }
          </div>

          <div className="space-y-1.5">
            <Label>Audience</Label>
            <ColoredSelect value={send.audience ?? ""} onValueChange={sel("audience")} options={settings.dropdown_audience} />
          </div>

          <div className="space-y-1.5">
            <Label>Segmentation</Label>
            <ColoredSelect value={send.segmentation ?? ""} onValueChange={sel("segmentation")} options={settings.dropdown_segmentation} />
          </div>

          <div className="space-y-1.5">
            <Label>Country</Label>
            <ColoredSelect value={send.country ?? ""} onValueChange={sel("country")} options={settings.dropdown_country} />
          </div>

          <div className="space-y-1.5">
            <Label>Language</Label>
            <ColoredSelect value={send.language ?? ""} onValueChange={sel("language")} options={settings.dropdown_language} />
          </div>

          <div className="space-y-1.5">
            <Label>Version Type</Label>
            <ColoredSelect value={send.versionType ?? ""} onValueChange={sel("versionType")} options={settings.dropdown_versionType} />
          </div>

          <div className="space-y-1.5">
            <Label>Email Group #</Label>
            <ColoredSelect
              value={String(send.emailGroupNum ?? 1)}
              onValueChange={(v) => onChange("emailGroupNum", parseInt(v))}
              options={settings.dropdown_emailGroupNum}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Figma File Name</Label>
            <Input
              value={send.figmaFileName ?? ""}
              onChange={(e) => onChange("figmaFileName", e.target.value)}
              placeholder="e.g. FordPro_Email1_v2"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Test?</Label>
            <div className="flex items-center gap-2 h-9">
              <Switch checked={send.isTest ?? false} onCheckedChange={(v) => onChange("isTest", v)} />
              <span className="text-sm text-muted-foreground">{send.isTest ? "Yes — test email" : "No"}</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Subject Line</Label>
          <Input
            value={send.subjectLine ?? ""}
            onChange={(e) => onChange("subjectLine", e.target.value)}
            placeholder="Enter subject line…"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Pre-header</Label>
          <Input
            value={send.preheader ?? ""}
            onChange={(e) => onChange("preheader", e.target.value)}
            placeholder="Enter pre-header text…"
          />
        </div>

        <EmailNameOutput value={emailName} label="Generated Email Name" />
      </div>
    </div>
  );
}

export function OrchestrationSection({ form, sends, onSendChange, weekOf }: OrchestrationSectionProps) {
  const { register, control } = form;
  const values = useWatch({ control });
  const numSends = values.numSends ?? 1;
  const visibleSends = sends.slice(0, numSends);
  const showBanner = numSends > 1 || values.contentBlock;

  const [expandedIndex, setExpandedIndex] = useState(0);

  function copyFromPrevious(index: number) {
    const prev = sends[index - 1];
    if (!prev) return;
    (["productLine", "audience", "segmentation", "country", "language", "versionType"] as (keyof EmailSendFormValues)[])
      .forEach((f) => onSendChange(index, f, prev[f]));
  }

  return (
    <section id="orchestration" className="scroll-mt-20">
      <SectionHeading id="orchestration" title="Orchestration" />

      {showBanner && (
        <div className="mb-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
          Email name generation is active here because this campaign has multiple sends or includes a content block.
        </div>
      )}

      <div className="space-y-1.5 mb-6">
        <Label>Orchestration Description</Label>
        <p className="text-xs text-muted-foreground">
          What should the order of email sends be and the timing in between?
        </p>
        <Textarea
          {...register("orchestrationDesc")}
          rows={4}
          placeholder="Describe the send order and timing. E.g. Email 1 sends on day 0, Email 2 sends 3 days later to non-openers…"
        />
      </div>

      <Label className="mb-2 inline-block">Email Sends</Label>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {visibleSends.map((send, i) => {
          const accent = CARD_ACCENTS[i % CARD_ACCENTS.length];
          return i === expandedIndex ? (
            <ExpandedCard
              key={i}
              send={send}
              index={i}
              accent={accent}
              expanded
              onToggle={() => setExpandedIndex(-1)}
              onChange={(field, value) => onSendChange(i, field, value)}
              weekOf={weekOf}
              onCopyFromPrevious={i > 0 ? () => copyFromPrevious(i) : undefined}
            />
          ) : (
            <MinimizedCard
              key={i}
              send={send}
              index={i}
              accent={accent}
              onToggle={() => setExpandedIndex(i)}
            />
          );
        })}
      </div>

      {numSends > visibleSends.length && (
        <p className="text-sm text-muted-foreground text-center py-2 mt-2">
          {numSends - visibleSends.length} more send{numSends - visibleSends.length > 1 ? "s" : ""} will be added on save.
        </p>
      )}
    </section>
  );
}
