"use client";

import { UseFormReturn, useWatch } from "react-hook-form";
import { ChevronDown, ChevronUp, Copy } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmailNameOutput } from "@/components/ui/EmailNameOutput";
import { ColoredSelect, ValueChip } from "@/components/ui/ColoredSelect";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useSettings } from "@/contexts/SettingsContext";
import { generateOrchestrationEmailName } from "@/lib/emailNameGenerator";
import { cn } from "@/lib/utils";
import type { CampaignFormValues, EmailSendFormValues } from "@/app/campaigns/[id]/page";

interface EmailSendsSectionProps {
  form: UseFormReturn<CampaignFormValues>;
  sends: EmailSendFormValues[];
  onSendChange: (index: number, field: keyof EmailSendFormValues, value: unknown) => void;
  weekOf: string | null | undefined;
}

const NAME_VALIDATION_ERROR = "Description cannot contain spaces, dashes, or underscores — it is used directly in the generated email name";

function isEmailComplete(send: EmailSendFormValues): boolean {
  return !!(send.productLine && send.description && send.audience && send.segmentation && send.country && send.language);
}

interface SendCardProps {
  send: EmailSendFormValues;
  index: number;
  onChange: (field: keyof EmailSendFormValues, value: unknown) => void;
  weekOf: string | null | undefined;
  onCopyFromPrevious?: () => void;
}

function SendCard({ send, index, onChange, weekOf, onCopyFromPrevious }: SendCardProps) {
  const { settings } = useSettings();
  const [open, setOpen] = useState(true);
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

  const summaryValues = [send.productLine, send.audience, send.segmentation, send.country].filter(Boolean) as string[];

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-2 flex-1 text-left min-w-0"
            onClick={() => setOpen(!open)}
          >
            {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
            <span className="font-medium shrink-0">Email {index + 1}</span>
            {!open && summaryValues.length > 0 && (
              <div className="flex items-center gap-1.5 ml-1 flex-wrap">
                {summaryValues.map((v) => <ValueChip key={v} value={v} />)}
                {send.description && (
                  <span className="text-xs text-muted-foreground truncate">— {send.description}</span>
                )}
              </div>
            )}
          </button>
          {onCopyFromPrevious && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-xs h-7 gap-1"
              onClick={onCopyFromPrevious}
            >
              <Copy className="h-3 w-3" />
              Copy Email {index}
            </Button>
          )}
        </div>
      </CardHeader>

      {open && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Product Line</Label>
              <ColoredSelect
                value={send.productLine ?? ""}
                onValueChange={sel("productLine")}
                options={settings.dropdown_productLineShort}
              />
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
              <ColoredSelect
                value={send.audience ?? ""}
                onValueChange={sel("audience")}
                options={settings.dropdown_audience}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Segmentation</Label>
              <ColoredSelect
                value={send.segmentation ?? ""}
                onValueChange={sel("segmentation")}
                options={settings.dropdown_segmentation}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Country</Label>
              <ColoredSelect
                value={send.country ?? ""}
                onValueChange={sel("country")}
                options={settings.dropdown_country}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Language</Label>
              <ColoredSelect
                value={send.language ?? ""}
                onValueChange={sel("language")}
                options={settings.dropdown_language}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Version Type</Label>
              <ColoredSelect
                value={send.versionType ?? ""}
                onValueChange={sel("versionType")}
                options={settings.dropdown_versionType}
              />
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
                <Switch
                  checked={send.isTest ?? false}
                  onCheckedChange={(v) => onChange("isTest", v)}
                />
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
        </CardContent>
      )}
    </Card>
  );
}

export function EmailSendsSection({ form, sends, onSendChange, weekOf }: EmailSendsSectionProps) {
  const numSends = useWatch({ control: form.control, name: "numSends" }) ?? 1;
  const visibleSends = sends.slice(0, numSends);
  const [activeTab, setActiveTab] = useState("0");

  // Keep active tab in range when numSends shrinks
  useEffect(() => {
    const max = Math.max(0, visibleSends.length - 1);
    if (parseInt(activeTab) > max) setActiveTab(String(max));
  }, [visibleSends.length, activeTab]);

  function copyFromPrevious(index: number) {
    const prev = sends[index - 1];
    if (!prev) return;
    (["productLine", "audience", "segmentation", "country", "language", "versionType"] as (keyof EmailSendFormValues)[])
      .forEach((f) => onSendChange(index, f, prev[f]));
  }

  if (numSends === 1) {
    return (
      <section id="email-sends" className="scroll-mt-20">
        <h2 className="text-lg font-semibold mb-4">Email Sends</h2>
        <SendCard
          send={visibleSends[0] ?? { emailNumber: 1 }}
          index={0}
          onChange={(field, value) => onSendChange(0, field, value)}
          weekOf={weekOf}
        />
      </section>
    );
  }

  return (
    <section id="email-sends" className="scroll-mt-20">
      <h2 className="text-lg font-semibold mb-4">Email Sends</h2>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 mb-4 w-full justify-start">
          {visibleSends.map((send, i) => {
            const complete = isEmailComplete(send);
            return (
              <TabsTrigger
                key={i}
                value={String(i)}
                className="flex items-center gap-1.5 data-[state=active]:bg-background"
              >
                <span
                  className={cn("w-2 h-2 rounded-full shrink-0", complete ? "bg-green-500" : "bg-muted-foreground/30")}
                />
                <span>Email {i + 1}</span>
                {send.description && (
                  <span className="hidden sm:inline text-xs text-muted-foreground font-normal">
                    — {send.description}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {visibleSends.map((send, i) => (
          <TabsContent key={i} value={String(i)}>
            <SendCard
              send={send}
              index={i}
              onChange={(field, value) => onSendChange(i, field, value)}
              weekOf={weekOf}
              onCopyFromPrevious={i > 0 ? () => copyFromPrevious(i) : undefined}
            />
          </TabsContent>
        ))}
      </Tabs>

      {numSends > visibleSends.length && (
        <p className="text-sm text-muted-foreground text-center py-2 mt-2">
          {numSends - visibleSends.length} more send{numSends - visibleSends.length > 1 ? "s" : ""} will be added on save.
        </p>
      )}
    </section>
  );
}
