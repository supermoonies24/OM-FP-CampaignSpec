"use client";

import { UseFormReturn, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { EmailNameOutput } from "@/components/ui/EmailNameOutput";
import { useSettings } from "@/contexts/SettingsContext";
import { generateMainEmailName } from "@/lib/emailNameGenerator";
import type { CampaignFormValues } from "@/app/campaigns/[id]/page";

interface OverviewSectionProps {
  form: UseFormReturn<CampaignFormValues>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

function FormField({ label, required, tooltip, children, error }: {
  label: string; required?: boolean; tooltip?: React.ReactNode;
  children: React.ReactNode; error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center">
        <Label className="text-sm">{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
        {tooltip && <InfoTooltip content={tooltip} />}
      </div>
      {children}
      <FieldError message={error} />
    </div>
  );
}

const NAME_VALIDATION_ERROR = "Campaign name cannot contain spaces, dashes, or underscores — it is used directly in the generated email name";

const CAMPAIGN_TYPE_TIPS: Record<string, string> = {
  "Always-on": "Runs forever; subscribers added on a regular basis. Set it and forget it. Examples: welcome emails, journeys or automations in SFMC",
  "API trigger": "Initiated by subscriber behavior — transactional in nature (purchase, password reset). Smaller and more niche than always-on",
  "One-time": "Newsletters, batch, promos, ad-hoc sends — anything not recurring. Can be a single email or a multi-touch journey run once",
};

export function OverviewSection({ form }: OverviewSectionProps) {
  const { settings } = useSettings();
  const { register, setValue, control, formState: { errors } } = form;

  const values = useWatch({ control });
  const emailName = generateMainEmailName({
    productLine: values.productLine,
    weekOf: values.weekOf,
    campaignName: values.campaignName,
    audience: values.audience,
    segmentation: values.segmentation,
    country: values.country,
    language: values.language,
    numSends: values.numSends,
    contentBlock: values.contentBlock,
  });

  function sel(name: keyof CampaignFormValues) {
    return (val: string) => setValue(name, val as never, { shouldDirty: true });
  }

  return (
    <section id="overview" className="scroll-mt-20">
      <h2 className="text-lg font-semibold mb-4">Campaign Overview</h2>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">

        {/* Week of */}
        <FormField label="Week Of" error={errors.weekOf?.message}>
          <Input type="date" {...register("weekOf")} className="w-full" />
        </FormField>

        {/* Brand */}
        <FormField label="Brand">
          <Select value={values.brand ?? ""} onValueChange={sel("brand")}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {settings.dropdown_brand.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>

        {/* Country */}
        <FormField label="Country">
          <Select value={values.country ?? ""} onValueChange={sel("country")}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {settings.dropdown_country.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>

        {/* Language */}
        <FormField label="Language">
          <Select value={values.language ?? ""} onValueChange={sel("language")}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {settings.dropdown_language.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>

        {/* Email Build Type — no tooltip per request */}
        <FormField label="Email Build Type">
          <Select value={values.emailBuildType ?? ""} onValueChange={sel("emailBuildType")}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {settings.dropdown_emailBuildType.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>

        {/* Figma Link */}
        <FormField label="Figma Link">
          <Input {...register("figmaLink")} placeholder="https://figma.com/…" type="url" />
        </FormField>

        {/* Figma File URL (renamed from Figma File Name) */}
        <FormField label="Figma File URL">
          <Input {...register("figmaFileName")} placeholder="https://figma.com/file/…" type="url" />
        </FormField>

        {/* Campaign Name */}
        <FormField
          label="Campaign Name"
          error={errors.campaignName?.message}
          tooltip="No spaces, dashes, or underscores allowed — this value is used directly in the auto-generated SFMC email name."
        >
          <Input
            {...register("campaignName", {
              validate: (v) => !v || /^[^\s\-_]+$/.test(v) || NAME_VALIDATION_ERROR,
            })}
            placeholder="e.g. SpringFleetPromo"
          />
        </FormField>

        {/* Product Line */}
        <FormField label="Product Line">
          <Select value={values.productLine ?? ""} onValueChange={sel("productLine")}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {settings.dropdown_productLineShort.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>

        {/* Audience */}
        <FormField label="Audience">
          <Select value={values.audience ?? ""} onValueChange={sel("audience")}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {settings.dropdown_audience.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>

        {/* Segmentation */}
        <FormField label="Segmentation">
          <Select value={values.segmentation ?? ""} onValueChange={sel("segmentation")}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {settings.dropdown_segmentation.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>

        {/* Campaign Type */}
        <FormField
          label="Campaign Type"
          tooltip={Object.entries(CAMPAIGN_TYPE_TIPS).map(([k, v]) => `${k}: ${v}`).join("\n\n")}
        >
          <Select value={values.campaignType ?? ""} onValueChange={sel("campaignType")}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {settings.dropdown_campaignType.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>

        {/* # of Sends */}
        <FormField label="# of Sends">
          <Input
            type="number"
            min={1}
            max={10}
            {...register("numSends", { valueAsNumber: true, min: 1, max: 10 })}
          />
        </FormField>

        {/* Send From Name */}
        <FormField
          label="Send From Name"
          tooltip="What the subscriber sees as the from name in the preview pane — the first impression of the email"
        >
          <Select value={values.sendFromName ?? ""} onValueChange={sel("sendFromName")}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {settings.dropdown_sendFromName.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>

        {/* Send From Address */}
        <FormField
          label="Send From Address"
          tooltip="Branded from address. Most ISPs hide this unless the subscriber clicks the from name to reveal it"
        >
          <Input
            value={values.sendFromAddress ?? "reply@e.fordpro.com"}
            readOnly
            className="bg-muted text-muted-foreground cursor-not-allowed"
          />
        </FormField>

        {/* Desired Send Date */}
        <FormField label="Desired Send Date">
          <Input type="date" {...register("desiredSendDate")} />
        </FormField>

        {/* Desired Send Time */}
        <FormField label="Desired Send Time">
          <div className="relative">
            <Input {...register("desiredSendTime")} placeholder="9:00" className="pr-8" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ET</span>
          </div>
        </FormField>

        {/* STO */}
        <FormField label="STO (Send Time Optimization)">
          <div className="flex items-center gap-2 h-9">
            <Switch
              checked={values.sto ?? false}
              onCheckedChange={(checked) => setValue("sto", checked, { shouldDirty: true })}
            />
            <span className="text-sm text-muted-foreground">{values.sto ? "Enabled" : "Disabled"}</span>
          </div>
        </FormField>

        {/* Miro URL */}
        <FormField label="Miro Board URL">
          <Input {...register("miroUrl")} placeholder="https://miro.com/app/board/…" type="url" />
        </FormField>

      </div>

      {/* Email Name Output */}
      <div className="mt-6">
        <EmailNameOutput
          value={emailName}
          label="Generated Email Name"
          placeholder="Please use the Orchestration section below"
        />
      </div>
    </section>
  );
}
