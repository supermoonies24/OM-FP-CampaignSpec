import type { CampaignFormValues, EmailSendFormValues } from "@/app/campaigns/[id]/page";
import type { LinkRow } from "@/components/sections/LinksSection";
import type { SeedEntry } from "@/components/sections/SeedListsSection";
import { generateMainEmailName, generateOrchestrationEmailName } from "@/lib/emailNameGenerator";

const CAMPAIGN_FIELD_LABELS: Record<keyof CampaignFormValues, string> = {
  weekOf: "Week Of",
  brand: "Brand",
  businessUnit: "Business Unit",
  childProd: "Child Product",
  country: "Country",
  language: "Language",
  emailBuildType: "Email Build Type",
  figmaLink: "Figma Link",
  figmaFileName: "Figma File Name",
  campaignName: "Campaign Name",
  productLine: "Product Line",
  audience: "Audience",
  segmentation: "Segmentation",
  campaignType: "Campaign Type",
  sendType: "Send Type",
  numSends: "# of Sends",
  sendFromName: "Send From Name",
  sendFromAddress: "Send From Address",
  desiredSendDate: "Desired Send Date",
  desiredSendTime: "Desired Send Time",
  sto: "Send Time Optimization",
  miroUrl: "Miro Board URL",
  status: "Status",
  abTest: "A/B Test",
  abTestType: "Test Type",
  abAudienceSplit: "Audience Split",
  contentBlock: "Content Block",
  contentBlockProductLine: "Content Block Product Line",
  contentBlockProductName: "Content Block Product Name",
  contentBlockName: "Content Block Name",
  contentBlockDesc: "Content Block Description",
  contentBlockFigmaLink: "Content Block Figma Link URL",
  notes: "Notes",
  segmentationDesc: "Segmentation Description",
  audienceSource: "Audience Source",
  seg1Field: "Segment 1 Field",
  seg1Condition: "Segment 1 Condition",
  seg1Value: "Segment 1 Value",
  seg2Field: "Segment 2 Field",
  seg2Condition: "Segment 2 Condition",
  seg2Value: "Segment 2 Value",
  seg3Field: "Segment 3 Field",
  seg3Condition: "Segment 3 Condition",
  seg3Value: "Segment 3 Value",
  seg4Field: "Segment 4 Field",
  seg4Condition: "Segment 4 Condition",
  seg4Value: "Segment 4 Value",
  seg5Field: "Segment 5 Field",
  seg5Condition: "Segment 5 Condition",
  seg5Value: "Segment 5 Value",
  seg6Field: "Segment 6 Field",
  seg6Condition: "Segment 6 Condition",
  seg6Value: "Segment 6 Value",
  seg7Field: "Segment 7 Field",
  seg7Condition: "Segment 7 Condition",
  seg7Value: "Segment 7 Value",
  seg8Field: "Segment 8 Field",
  seg8Condition: "Segment 8 Condition",
  seg8Value: "Segment 8 Value",
  seg9Field: "Segment 9 Field",
  seg9Condition: "Segment 9 Condition",
  seg9Value: "Segment 9 Value",
  seg10Field: "Segment 10 Field",
  seg10Condition: "Segment 10 Condition",
  seg10Value: "Segment 10 Value",
  engagementSplits: "Engagement Splits",
  orchestrationDesc: "Orchestration Description",
};

const SEND_FIELD_LABELS: Record<keyof Omit<EmailSendFormValues, "id" | "emailNumber">, string> = {
  productLine: "Product Line",
  description: "Description",
  audience: "Audience",
  segmentation: "Segmentation",
  country: "Country",
  language: "Language",
  versionType: "Version Type",
  emailGroupNum: "Email Group #",
  figmaFileName: "Figma File Name",
  isTest: "Test Email",
  subjectLine: "Subject Line",
  preheader: "Preheader",
};

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "boolean") return value === true;
  return true;
}

function csvCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(",");
}

export function buildCampaignExportCsv(
  values: CampaignFormValues,
  sends: EmailSendFormValues[],
  links: LinkRow[],
  seeds: SeedEntry[]
): string {
  const lines: string[] = [];
  const numSends = values.numSends ?? 1;

  lines.push(csvRow(["Campaign Overview"]));
  lines.push(csvRow(["Field", "Value"]));
  for (const key of Object.keys(CAMPAIGN_FIELD_LABELS) as (keyof CampaignFormValues)[]) {
    const value = values[key];
    if (!isFilled(value)) continue;
    lines.push(csvRow([CAMPAIGN_FIELD_LABELS[key], typeof value === "boolean" ? "Yes" : value]));
  }

  const useOrchestrationNames = numSends > 1 || !!values.contentBlock;

  for (let i = 0; i < numSends; i++) {
    const send = sends[i];
    if (!send) continue;

    const emailName = useOrchestrationNames
      ? generateOrchestrationEmailName({
          productLine: send.productLine,
          weekOf: values.weekOf,
          description: send.description,
          audience: send.audience,
          segmentation: send.segmentation,
          country: send.country,
          language: send.language,
          versionType: send.versionType,
          emailGroupNum: send.emailGroupNum,
        })
      : generateMainEmailName({
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

    lines.push("");
    lines.push(csvRow([`Email ${send.emailNumber} — ${emailName || "(incomplete)"}`]));
    lines.push(csvRow(["Field", "Value"]));
    for (const key of Object.keys(SEND_FIELD_LABELS) as (keyof typeof SEND_FIELD_LABELS)[]) {
      const value = send[key];
      if (!isFilled(value)) continue;
      lines.push(csvRow([SEND_FIELD_LABELS[key], typeof value === "boolean" ? "Yes" : value]));
    }

    const emailLinks = links.filter((l) => l.emailNumber === send.emailNumber);
    if (emailLinks.length > 0) {
      lines.push(csvRow(["Links"]));
      lines.push(csvRow(["CTA Name", "Asset Type", "Alias", "Base URL"]));
      for (const link of emailLinks) {
        lines.push(csvRow([link.ctaName, link.assetType, link.alias, link.baseUrl]));
      }
    }
  }

  if (seeds.length > 0) {
    lines.push("");
    lines.push(csvRow(["Seed Lists"]));
    lines.push(csvRow(["List Type", "Name", "Email"]));
    const LIST_TYPE_LABELS: Record<SeedEntry["listType"], string> = {
      onemagnify: "OneMagnify",
      client: "Client",
      all_seeds: "All Seeds",
    };
    for (const seed of seeds) {
      lines.push(csvRow([LIST_TYPE_LABELS[seed.listType], seed.firstName, seed.email]));
    }
  }

  return lines.join("\n");
}

export function downloadCampaignExport(campaignName: string | null | undefined, csv: string) {
  const safeName = (campaignName || "campaign").trim().replace(/[^a-z0-9_-]+/gi, "_");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}_export.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
