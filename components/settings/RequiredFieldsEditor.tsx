"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface RequiredFieldsEditorProps {
  requiredFields: Record<string, boolean>;
  onChange: (fields: Record<string, boolean>) => void;
}

const FIELD_GROUPS: { group: string; fields: { key: string; label: string }[] }[] = [
  {
    group: "Overview",
    fields: [
      { key: "weekOf", label: "Week Of" },
      { key: "brand", label: "Brand" },
      { key: "businessUnit", label: "Business Unit" },
      { key: "childProd", label: "Child Prod" },
      { key: "country", label: "Country" },
      { key: "language", label: "Language" },
      { key: "emailBuildType", label: "Email Build Type" },
      { key: "figmaFileName", label: "Figma File Name" },
      { key: "campaignName", label: "Campaign Name" },
      { key: "productLine", label: "Product Line" },
      { key: "audience", label: "Audience" },
      { key: "segmentation", label: "Segmentation" },
      { key: "campaignType", label: "Campaign Type" },
      { key: "sendType", label: "Send Type" },
      { key: "numSends", label: "# of Sends" },
      { key: "sendFromName", label: "Send From Name" },
      { key: "desiredSendDate", label: "Desired Send Date" },
      { key: "desiredSendTime", label: "Desired Send Time" },
      { key: "miroUrl", label: "Miro Board URL" },
    ],
  },
  {
    group: "Targeting",
    fields: [
      { key: "segmentationDesc", label: "Segmentation Description" },
      { key: "audienceSource", label: "Audience Source" },
      { key: "engagementSplits", label: "Engagement Splits" },
    ],
  },
  {
    group: "Orchestration",
    fields: [
      { key: "orchestrationDesc", label: "Orchestration Description" },
    ],
  },
  {
    group: "Email Sends (per send)",
    fields: [
      { key: "send_productLine", label: "Product Line" },
      { key: "send_description", label: "Description" },
      { key: "send_audience", label: "Audience" },
      { key: "send_segmentation", label: "Segmentation" },
      { key: "send_country", label: "Country" },
      { key: "send_language", label: "Language" },
      { key: "send_subjectLine", label: "Subject Line" },
      { key: "send_preheader", label: "Pre-header" },
    ],
  },
];

export function RequiredFieldsEditor({ requiredFields, onChange }: RequiredFieldsEditorProps) {
  function toggle(key: string) {
    onChange({ ...requiredFields, [key]: !requiredFields[key] });
  }

  return (
    <div className="space-y-6">
      {FIELD_GROUPS.map(({ group, fields }) => (
        <div key={group}>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">{group}</h3>
          <div className="grid grid-cols-2 gap-3">
            {fields.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <Label className="text-sm cursor-pointer" htmlFor={`req-${key}`}>{label}</Label>
                <Switch
                  id={`req-${key}`}
                  checked={!!requiredFields[key]}
                  onCheckedChange={() => toggle(key)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
