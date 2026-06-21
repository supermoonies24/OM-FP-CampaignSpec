import fs from "fs/promises";
import path from "path";
import PptxGenJS from "pptxgenjs";
import type { BriefDeckPayload } from "@/lib/workflow/briefStub";

// Renders a BriefDeckPayload to a navy-branded PowerPoint deck and writes it
// under public/briefs/. The returned URL is a /briefs/... path the UI can link
// to directly. Idempotent: each (campaign, version) gets a stable filename.

// Navy palette matching the existing CampaignSpec shadcn theme.
const NAVY_DARK = "1F2A44";
const NAVY = "2C3E66";
const ACCENT = "C8A24B"; // muted gold for highlights
const TEXT_LIGHT = "FFFFFF";
const TEXT_MUTED = "8A93A6";
const SLIDE_BG = "F5F6FA";

export interface BriefPptxContext {
  campaignId: string;
  campaignName: string;
  client: string;
  version: number;
  payload: BriefDeckPayload;
}

export interface BriefPptxResult {
  filePath: string;
  publicUrl: string;
}

function sanitize(s: string): string {
  return s.replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

export async function renderBriefPptx(ctx: BriefPptxContext): Promise<BriefPptxResult> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.3 x 7.5
  pptx.title = `${ctx.campaignName} — Brief Deck v${ctx.version}`;
  pptx.company = "OneMagnify";
  pptx.subject = `Ford Pro CRM brief deck for ${ctx.campaignName}`;

  // Reusable master with the navy header strip.
  pptx.defineSlideMaster({
    title: "FORDPRO_MASTER",
    background: { color: SLIDE_BG },
    objects: [
      { rect: { x: 0, y: 0, w: 13.3, h: 0.55, fill: { color: NAVY_DARK } } },
      {
        text: {
          text: "Ford Pro CRM — Campaign Brief",
          options: {
            x: 0.4, y: 0.08, w: 12.5, h: 0.4,
            fontFace: "Calibri", fontSize: 11, color: TEXT_LIGHT, bold: true,
          },
        },
      },
      { rect: { x: 0, y: 7.35, w: 13.3, h: 0.15, fill: { color: ACCENT } } },
    ],
  });

  // ---- Title slide --------------------------------------------------------
  const cover = pptx.addSlide({ masterName: "FORDPRO_MASTER" });
  cover.background = { color: NAVY };
  cover.addText(ctx.campaignName, {
    x: 0.6, y: 2.3, w: 12, h: 1.2,
    fontFace: "Calibri", fontSize: 44, bold: true, color: TEXT_LIGHT,
  });
  cover.addText(`${ctx.client} · v${ctx.version}`, {
    x: 0.6, y: 3.6, w: 12, h: 0.6,
    fontFace: "Calibri", fontSize: 18, color: ACCENT,
  });
  cover.addText(ctx.payload.highLevelJourney.summary, {
    x: 0.6, y: 4.4, w: 12, h: 1.8,
    fontFace: "Calibri", fontSize: 14, color: TEXT_LIGHT,
  });

  // ---- High-Level Journey -------------------------------------------------
  addSectionHeader(pptx, "High-Level Journey");

  const hlj = pptx.addSlide({ masterName: "FORDPRO_MASTER" });
  hlj.addText("High-Level Journey", titleStyle());
  hlj.addText(ctx.payload.highLevelJourney.summary, {
    x: 0.6, y: 1.4, w: 12, h: 1.2,
    fontFace: "Calibri", fontSize: 13, color: NAVY_DARK,
  });
  const touchRows = ctx.payload.highLevelJourney.touchpoints.map((t, i) => [
    { text: String(i + 1), options: { color: ACCENT, bold: true } },
    { text: t.name, options: { color: NAVY_DARK, bold: true } },
    { text: t.channel, options: { color: NAVY_DARK } },
    { text: t.purpose, options: { color: NAVY_DARK } },
  ]);
  hlj.addTable(
    [
      [
        headerCell("#"),
        headerCell("Touchpoint"),
        headerCell("Channel"),
        headerCell("Purpose"),
      ],
      ...touchRows,
    ],
    {
      x: 0.6, y: 2.8, w: 12.1,
      colW: [0.6, 3.2, 1.8, 6.5],
      fontFace: "Calibri", fontSize: 11,
      border: { type: "solid", pt: 0.5, color: "D7DAE5" },
    },
  );

  // ---- SFMC Journey -------------------------------------------------------
  addSectionHeader(pptx, "SFMC Journey");

  const sfmc = pptx.addSlide({ masterName: "FORDPRO_MASTER" });
  sfmc.addText("SFMC Journey", titleStyle());
  sfmc.addText(`${ctx.payload.sfmcJourney.name}`, {
    x: 0.6, y: 1.4, w: 12, h: 0.4,
    fontFace: "Calibri", fontSize: 16, bold: true, color: NAVY_DARK,
  });
  sfmc.addText(`Entry source: ${ctx.payload.sfmcJourney.entrySource}`, {
    x: 0.6, y: 1.9, w: 12, h: 0.35,
    fontFace: "Calibri", fontSize: 12, color: TEXT_MUTED,
  });
  const activityRows = ctx.payload.sfmcJourney.activities.map((a, i) => [
    { text: String(i + 1), options: { color: ACCENT, bold: true } },
    { text: a.kind, options: { color: NAVY_DARK, bold: true } },
    { text: a.label, options: { color: NAVY_DARK } },
  ]);
  sfmc.addTable(
    [
      [headerCell("#"), headerCell("Activity"), headerCell("Description")],
      ...activityRows,
    ],
    {
      x: 0.6, y: 2.5, w: 12.1,
      colW: [0.6, 2.2, 9.3],
      fontFace: "Calibri", fontSize: 11,
      border: { type: "solid", pt: 0.5, color: "D7DAE5" },
    },
  );

  // ---- Timeline -----------------------------------------------------------
  addSectionHeader(pptx, "Timeline");

  const tl = pptx.addSlide({ masterName: "FORDPRO_MASTER" });
  tl.addText("Timeline", titleStyle());
  tl.addText("Cumulative target days from kickoff per stage.", {
    x: 0.6, y: 1.4, w: 12, h: 0.35,
    fontFace: "Calibri", fontSize: 11, color: TEXT_MUTED,
  });
  const tlRows = ctx.payload.timeline.map((t) => [
    { text: t.label, options: { color: NAVY_DARK } },
    { text: t.stage, options: { color: TEXT_MUTED, fontSize: 9 } },
    { text: `D+${t.targetOffsetDays}`, options: { color: ACCENT, bold: true, align: "right" as const } },
  ]);
  tl.addTable(
    [
      [headerCell("Stage"), headerCell("ID"), headerCell("Target")],
      ...tlRows,
    ],
    {
      x: 0.6, y: 1.85, w: 12.1,
      colW: [5.2, 4.5, 2.4],
      fontFace: "Calibri", fontSize: 10,
      border: { type: "solid", pt: 0.5, color: "D7DAE5" },
    },
  );

  // ---- Spec Form Draft ----------------------------------------------------
  addSectionHeader(pptx, "Spec Form Draft");

  const spec = pptx.addSlide({ masterName: "FORDPRO_MASTER" });
  spec.addText("Spec Form Draft", titleStyle());
  spec.addText("Pre-fills applied when this campaign reaches the Build Spec Form stage.", {
    x: 0.6, y: 1.4, w: 12, h: 0.35,
    fontFace: "Calibri", fontSize: 11, color: TEXT_MUTED,
  });
  const specRows = Object.entries(ctx.payload.specFormDraft).map(([k, v]) => [
    { text: humanize(k), options: { color: NAVY_DARK, bold: true } },
    { text: formatValue(v), options: { color: NAVY_DARK } },
  ]);
  spec.addTable(
    [
      [headerCell("Field"), headerCell("Value")],
      ...specRows,
    ],
    {
      x: 0.6, y: 1.85, w: 12.1,
      colW: [4, 8.1],
      fontFace: "Calibri", fontSize: 11,
      border: { type: "solid", pt: 0.5, color: "D7DAE5" },
    },
  );

  // ---- Write to disk ------------------------------------------------------
  const dir = path.join(process.cwd(), "public", "briefs");
  await fs.mkdir(dir, { recursive: true });
  const filename = `${sanitize(ctx.campaignId)}-v${ctx.version}.pptx`;
  const filePath = path.join(dir, filename);
  await pptx.writeFile({ fileName: filePath });

  return { filePath, publicUrl: `/briefs/${filename}` };
}

// ---- helpers --------------------------------------------------------------

function titleStyle(): PptxGenJS.TextPropsOptions {
  return {
    x: 0.6, y: 0.75, w: 12, h: 0.55,
    fontFace: "Calibri", fontSize: 24, bold: true, color: NAVY_DARK,
  };
}

function headerCell(text: string): PptxGenJS.TableCell {
  return {
    text,
    options: { bold: true, color: TEXT_LIGHT, fill: { color: NAVY } },
  };
}

function addSectionHeader(pptx: PptxGenJS, title: string): void {
  const s = pptx.addSlide({ masterName: "FORDPRO_MASTER" });
  s.background = { color: NAVY_DARK };
  s.addText(title, {
    x: 0.6, y: 3.0, w: 12, h: 1.5,
    fontFace: "Calibri", fontSize: 40, bold: true, color: TEXT_LIGHT,
  });
  s.addShape("rect", {
    x: 0.6, y: 4.4, w: 1.5, h: 0.08, fill: { color: ACCENT },
    line: { color: ACCENT, width: 0 },
  });
}

function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}
