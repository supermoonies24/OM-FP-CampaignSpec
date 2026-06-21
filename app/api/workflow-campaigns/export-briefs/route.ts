import { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { renderBriefPptx } from "@/lib/ai/briefPptx";
import type { BriefDeckPayload } from "@/lib/workflow/briefStub";

// Bulk brief export. Accepts a list of campaign IDs via either query string
// (?ids=a,b,c) or a JSON body { ids: [...] } on POST. Returns a ZIP archive
// where each entry is a campaign's current brief deck pptx. If a campaign has
// no brief, it is skipped silently. If a pptx file is missing on disk, we
// re-render it on the fly from the persisted payload.

interface CampaignWithBrief {
  id: string;
  name: string;
  client: string;
  briefDeck: {
    id: string;
    version: number;
    pptxUrl: string | null;
    highLevelJourney: string;
    sfmcJourney: string;
    timeline: string;
    specFormDraft: string;
  } | null;
}

function sanitize(s: string): string {
  return s.replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

async function bytesForBrief(c: CampaignWithBrief): Promise<Buffer | null> {
  if (!c.briefDeck) return null;
  if (c.briefDeck.pptxUrl) {
    const filePath = path.join(process.cwd(), "public", c.briefDeck.pptxUrl.replace(/^\//, ""));
    try {
      return await fs.readFile(filePath);
    } catch {
      // fallthrough — re-render below
    }
  }
  try {
    const payload: BriefDeckPayload = {
      highLevelJourney: JSON.parse(c.briefDeck.highLevelJourney),
      sfmcJourney: JSON.parse(c.briefDeck.sfmcJourney),
      timeline: JSON.parse(c.briefDeck.timeline),
      specFormDraft: JSON.parse(c.briefDeck.specFormDraft),
    };
    const { filePath } = await renderBriefPptx({
      campaignId: c.id,
      campaignName: c.name,
      client: c.client,
      version: c.briefDeck.version,
      payload,
    });
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

async function buildZip(ids: string[]): Promise<{ body: Buffer; included: number; skipped: string[] }> {
  const campaigns = (await prisma.workflowCampaign.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      client: true,
      briefDeck: {
        select: {
          id: true,
          version: true,
          pptxUrl: true,
          highLevelJourney: true,
          sfmcJourney: true,
          timeline: true,
          specFormDraft: true,
        },
      },
    },
  })) as CampaignWithBrief[];

  const zip = new JSZip();
  let included = 0;
  const skipped: string[] = [];
  for (const c of campaigns) {
    const buf = await bytesForBrief(c);
    if (!buf) {
      skipped.push(c.id);
      continue;
    }
    const filename = `${sanitize(c.name) || c.id}-v${c.briefDeck?.version ?? 1}.pptx`;
    zip.file(filename, buf);
    included++;
  }

  const body = await zip.generateAsync({ type: "nodebuffer" });
  return { body, included, skipped };
}

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids");
  const ids = idsParam ? idsParam.split(",").map((s) => s.trim()).filter(Boolean) : [];
  return respond(ids);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { ids?: string[] };
  const ids = Array.isArray(body.ids) ? body.ids.filter((s) => typeof s === "string") : [];
  return respond(ids);
}

async function respond(ids: string[]): Promise<Response> {
  if (ids.length === 0) {
    return new Response(JSON.stringify({ error: "Provide ids" }), { status: 400 });
  }
  const { body, included, skipped } = await buildZip(ids);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="briefs-${new Date().toISOString().slice(0, 10)}.zip"`,
      "X-Briefs-Included": String(included),
      "X-Briefs-Skipped": skipped.join(","),
    },
  });
}
