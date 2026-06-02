import { format, parse } from "date-fns";

function toYYMMDD(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    // Try parsing ISO format YYYY-MM-DD
    const d = parse(dateStr, "yyyy-MM-dd", new Date());
    if (!isNaN(d.getTime())) return format(d, "yyMMdd");
    // Try MM/DD/YYYY
    const d2 = parse(dateStr, "MM/dd/yyyy", new Date());
    if (!isNaN(d2.getTime())) return format(d2, "yyMMdd");
  } catch {
    // fall through
  }
  return "";
}

function firstN(str: string | null | undefined, n: number): string {
  return (str ?? "").slice(0, n);
}

function firstChar(str: string | null | undefined): string {
  return (str ?? "").charAt(0);
}

// Extracts the language letter from values like "English (E)" → "E", or falls back to first char
function langChar(str: string | null | undefined): string {
  const match = (str ?? "").match(/\(([A-Z])\)/);
  if (match) return match[1];
  return firstChar(str);
}

export interface MainEmailNameParams {
  productLine?: string | null;
  weekOf?: string | null;
  campaignName?: string | null;
  audience?: string | null;
  segmentation?: string | null;
  country?: string | null;
  language?: string | null;
  numSends?: number | null;
  contentBlock?: boolean | null;
}

export function generateMainEmailName(params: MainEmailNameParams): string | null {
  if ((params.numSends ?? 1) > 1 || params.contentBlock) return null; // show "use orchestration" message

  const parts = [
    firstN(params.productLine, 3),
    toYYMMDD(params.weekOf),
    params.campaignName ?? "",
    params.audience ?? "",
    params.segmentation ?? "",
    params.country ?? "",
    langChar(params.language),
    "Email1",
  ];

  if (parts.slice(0, 7).some((p) => !p)) return "";
  return parts.join("_");
}

export interface ContentBlockNameParams {
  weekOf?: string | null;
  contentBlockProductLine?: string | null;
  contentBlockProductName?: string | null;
}

export function generateContentBlockName(params: ContentBlockNameParams): string {
  const parts = [
    toYYMMDD(params.weekOf),
    params.contentBlockProductLine ?? "",
    params.contentBlockProductName ?? "",
  ];
  if (parts.some((p) => !p)) return "";
  return parts.join("_");
}

export interface OrchestrationEmailNameParams {
  productLine?: string | null;
  weekOf?: string | null;
  description?: string | null;
  audience?: string | null;
  segmentation?: string | null;
  country?: string | null;
  language?: string | null;
  versionType?: string | null;
  emailGroupNum?: number | null;
}

export function generateOrchestrationEmailName(params: OrchestrationEmailNameParams): string {
  const groupNum = params.emailGroupNum ?? 1;
  let emailSuffix: string;
  if (params.versionType === "Control Version") {
    emailSuffix = `Email${groupNum}A`;
  } else if (params.versionType === "Test Version") {
    emailSuffix = `Email${groupNum}B`;
  } else {
    emailSuffix = `Email${groupNum}`;
  }

  const parts = [
    firstN(params.productLine, 3),
    toYYMMDD(params.weekOf),
    params.description ?? "",
    params.audience ?? "",
    params.segmentation ?? "",
    params.country ?? "",
    langChar(params.language),
    emailSuffix,
  ];

  if (parts.slice(0, 7).some((p) => !p)) return "";
  return parts.join("_");
}
