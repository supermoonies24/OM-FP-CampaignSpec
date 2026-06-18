"use client";

import { UseFormReturn, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { EmailNameOutput } from "@/components/ui/EmailNameOutput";
import { ColoredSelect } from "@/components/ui/ColoredSelect";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useSettings } from "@/contexts/SettingsContext";
import { generateMainEmailName } from "@/lib/emailNameGenerator";
import { cn } from "@/lib/utils";
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

  const numSends = values.numSends ?? 1;
  const isMulti = numSends > 1;

  const emailName = generateMainEmailName({
    productLine: values.productLine,
    weekOf: values.weekOf,
    campaignName: values.campaignName,
    audience: values.audience,
    segmentation: values.segmentation,
    country: values.country,
    language: values.language,
    numSends,
    contentBlock: values.contentBlock,
  });

  function sel(name: keyof CampaignFormValues) {
    return (val: string) => setValue(name, val as never, { shouldDirty: true });
  }

  return (
    <section id="overview" className="scroll-mt-20">
      <SectionHeading id="overview" title="Campaign Overview" />

      {/* Prominent # of Sends stepper — front and center */}
      <div className="flex flex-col items-center py-8 mb-8 border-2 border-blue-200 dark:border-blue-900 rounded-2xl bg-gradient-to-b from-blue-50 to-transparent dark:from-blue-950/30 shadow-sm">
        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4">
          Number of Email Sends
        </p>
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setValue("numSends", Math.max(1, numSends - 1), { shouldDirty: true })}
            disabled={numSends <= 1}
            className={cn(
              "w-11 h-11 rounded-full border-2 flex items-center justify-center text-2xl font-bold transition-colors",
              numSends <= 1
                ? "opacity-30 cursor-not-allowed border-border"
                : "border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
            )}
          >
            −
          </button>
          <span className="text-6xl font-extrabold w-20 text-center tabular-nums text-blue-600 dark:text-blue-400">
            {numSends}
          </span>
          <button
            type="button"
            onClick={() => setValue("numSends", Math.min(30, numSends + 1), { shouldDirty: true })}
            disabled={numSends >= 30}
            className={cn(
              "w-11 h-11 rounded-full border-2 flex items-center justify-center text-2xl font-bold transition-colors",
              numSends >= 30
                ? "opacity-30 cursor-not-allowed border-border"
                : "border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
            )}
          >
            +
          </button>
        </div>
        {isMulti && (
          <p className="text-xs text-muted-foreground mt-3">
            Per-email details (product line, audience, etc.) are configured in the Orchestration section below
          </p>
        )}
      </div>

      {/* Fields always visible */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <FormField label="Week Of" error={errors.weekOf?.message}>
          <Input type="date" {...register("weekOf")} className="w-full" />
        </FormField>

        <FormField
          label="Campaign Type"
          tooltip={Object.entries(CAMPAIGN_TYPE_TIPS).map(([k, v]) => `${k}: ${v}`).join("\n\n")}
        >
          <ColoredSelect
            value={values.campaignType ?? ""}
            onValueChange={sel("campaignType")}
            options={settings.dropdown_campaignType}
          />
        </FormField>

        <FormField
          label="Send From Name"
          tooltip="What the subscriber sees as the from name in the preview pane — the first impression of the email"
        >
          <ColoredSelect
            value={values.sendFromName ?? ""}
            onValueChange={sel("sendFromName")}
            options={settings.dropdown_sendFromName}
          />
        </FormField>

        <FormField label="Miro Board URL">
          <Input {...register("miroUrl")} placeholder="https://miro.com/app/board/…" type="url" />
        </FormField>

        {/* Per-send fields — only when numSends === 1 */}
        {!isMulti && (
          <>
            <FormField label="Brand">
              <ColoredSelect
                value={values.brand ?? ""}
                onValueChange={sel("brand")}
                options={settings.dropdown_brand}
              />
            </FormField>

            <FormField label="Country">
              <ColoredSelect
                value={values.country ?? ""}
                onValueChange={sel("country")}
                options={settings.dropdown_country}
              />
            </FormField>

            <FormField label="Language">
              <ColoredSelect
                value={values.language ?? ""}
                onValueChange={sel("language")}
                options={settings.dropdown_language}
              />
            </FormField>

            <FormField label="Email Build Type">
              <ColoredSelect
                value={values.emailBuildType ?? ""}
                onValueChange={sel("emailBuildType")}
                options={settings.dropdown_emailBuildType}
              />
            </FormField>

            <FormField label="Figma File URL">
              <Input {...register("figmaFileName")} placeholder="https://figma.com/file/…" type="url" />
            </FormField>

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

            <FormField label="Product Line">
              <ColoredSelect
                value={values.productLine ?? ""}
                onValueChange={sel("productLine")}
                options={settings.dropdown_productLineShort}
              />
            </FormField>

            <FormField label="Audience">
              <ColoredSelect
                value={values.audience ?? ""}
                onValueChange={sel("audience")}
                options={settings.dropdown_audience}
              />
            </FormField>

            <FormField label="Segmentation">
              <ColoredSelect
                value={values.segmentation ?? ""}
                onValueChange={sel("segmentation")}
                options={settings.dropdown_segmentation}
              />
            </FormField>

            <FormField label="Send From Address" tooltip="Branded from address. Most ISPs hide this unless the subscriber clicks the from name to reveal it">
              <Input
                value={values.sendFromAddress ?? "reply@e.fordpro.com"}
                readOnly
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
            </FormField>

            <FormField label="Desired Send Date">
              <Input type="date" {...register("desiredSendDate")} />
            </FormField>

            <FormField label="Desired Send Time">
              <div className="relative">
                <Input {...register("desiredSendTime")} placeholder="9:00" className="pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ET</span>
              </div>
            </FormField>

            <FormField label="STO (Send Time Optimization)">
              <div className="flex items-center gap-2 h-9">
                <Switch
                  checked={values.sto ?? false}
                  onCheckedChange={(checked) => setValue("sto", checked, { shouldDirty: true })}
                />
                <span className="text-sm text-muted-foreground">{values.sto ? "Enabled" : "Disabled"}</span>
              </div>
            </FormField>
          </>
        )}
      </div>

      {/* Generated email name — only for single send */}
      {!isMulti && (
        <div className="mt-6">
          <EmailNameOutput
            value={emailName}
            label="Generated Email Name"
            placeholder="Please use the Orchestration section below"
          />
        </div>
      )}
    </section>
  );
}
