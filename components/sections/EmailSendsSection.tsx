"use client";

import { UseFormReturn } from "react-hook-form";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmailNameOutput } from "@/components/ui/EmailNameOutput";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useSettings } from "@/contexts/SettingsContext";
import { generateOrchestrationEmailName } from "@/lib/emailNameGenerator";
import type { CampaignFormValues, EmailSendFormValues } from "@/app/campaigns/[id]/page";

interface EmailSendsSectionProps {
  form: UseFormReturn<CampaignFormValues>;
  sends: EmailSendFormValues[];
  onSendChange: (index: number, field: keyof EmailSendFormValues, value: unknown) => void;
  weekOf: string | null | undefined;
}

const NAME_VALIDATION_ERROR = "Description cannot contain spaces, dashes, or underscores — it is used directly in the generated email name";

function SendCard({
  send, index, onChange, weekOf,
}: {
  send: EmailSendFormValues;
  index: number;
  onChange: (field: keyof EmailSendFormValues, value: unknown) => void;
  weekOf: string | null | undefined;
}) {
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
    if (v && !/^[^\s\-_]+$/.test(v)) {
      setDescError(NAME_VALIDATION_ERROR);
    } else {
      setDescError("");
    }
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <button
          type="button"
          className="flex items-center justify-between w-full text-left"
          onClick={() => setOpen(!open)}
        >
          <span className="font-medium">Email {index + 1}</span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </CardHeader>

      {open && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Product Line</Label>
              <Select value={send.productLine ?? ""} onValueChange={sel("productLine")}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {settings.dropdown_productLineShort.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={send.description ?? ""}
                onChange={(e) => { onChange("description", e.target.value); validateDesc(e.target.value); }}
                placeholder="e.g. SpringFleetPromo (no spaces/dashes/underscores)"
              />
              {descError && <p className="text-xs text-destructive">{descError}</p>}
              <p className="text-xs text-muted-foreground">No spaces, dashes, or underscores</p>
            </div>

            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Select value={send.audience ?? ""} onValueChange={sel("audience")}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {settings.dropdown_audience.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Segmentation</Label>
              <Select value={send.segmentation ?? ""} onValueChange={sel("segmentation")}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {settings.dropdown_segmentation.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Country</Label>
              <Select value={send.country ?? ""} onValueChange={sel("country")}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {settings.dropdown_country.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select value={send.language ?? ""} onValueChange={sel("language")}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {settings.dropdown_language.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Version Type</Label>
              <Select value={send.versionType ?? ""} onValueChange={sel("versionType")}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {settings.dropdown_versionType.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Email Group #</Label>
              <Select
                value={String(send.emailGroupNum ?? 1)}
                onValueChange={(v) => onChange("emailGroupNum", parseInt(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {settings.dropdown_emailGroupNum.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
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

          <EmailNameOutput
            value={emailName}
            label="Generated Email Name"
          />
        </CardContent>
      )}
    </Card>
  );
}

export function EmailSendsSection({ form, sends, onSendChange, weekOf }: EmailSendsSectionProps) {
  const numSends = form.watch("numSends") ?? 1;
  const visibleSends = sends.slice(0, numSends);

  return (
    <section id="email-sends" className="scroll-mt-20">
      <h2 className="text-lg font-semibold mb-4">Email Sends</h2>
      <div className="space-y-4">
        {visibleSends.map((send, i) => (
          <SendCard
            key={send.id ?? `send-${i}`}
            send={send}
            index={i}
            onChange={(field, value) => onSendChange(i, field, value)}
            weekOf={weekOf}
          />
        ))}
        {numSends > visibleSends.length && (
          <p className="text-sm text-muted-foreground text-center py-2">
            {numSends - visibleSends.length} more send{numSends - visibleSends.length > 1 ? "s" : ""} will be added on save.
          </p>
        )}
      </div>
    </section>
  );
}
