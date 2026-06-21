import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Returns recent AiRun rows for a campaign. Trimmed to metadata + parsed
// output preview — we don't ship inputJson back (intake can be large).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 25), 100);

  const runs = await prisma.aiRun.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      feature: true,
      model: true,
      tokensIn: true,
      tokensOut: true,
      durationMs: true,
      status: true,
      createdAt: true,
      outputJson: true,
    },
  });

  return NextResponse.json(
    runs.map((r) => ({
      ...r,
      // Parse outputJson on the server so we can surface a clean error label.
      output: (() => {
        try {
          const parsed = JSON.parse(r.outputJson) as Record<string, unknown>;
          if (parsed && typeof parsed === "object" && "error" in parsed) {
            return { error: String(parsed.error) };
          }
          return null; // success — UI doesn't need the full payload
        } catch {
          return null;
        }
      })(),
      outputJson: undefined,
    })),
  );
}
