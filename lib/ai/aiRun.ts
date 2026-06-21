import { prisma } from "@/lib/prisma";

// Logs every AI call (success, error, or fallback) to the AiRun table so we
// can evaluate prompt quality, costs, and reliability over time. Designed to
// never throw — logging failures must not break the actual feature.

export type AiRunStatus = "ok" | "error" | "fallback";

export interface AiRunRecord {
  campaignId?: string | null;
  feature: string;
  model: string;
  input: unknown;
  output: unknown;
  tokensIn?: number | null;
  tokensOut?: number | null;
  durationMs?: number | null;
  status?: AiRunStatus;
}

type Logger = (run: AiRunRecord) => Promise<void>;

const defaultLogger: Logger = async (run) => {
  try {
    await prisma.aiRun.create({
      data: {
        campaignId: run.campaignId ?? null,
        feature: run.feature,
        model: run.model,
        inputJson: JSON.stringify(run.input ?? null),
        outputJson: JSON.stringify(run.output ?? null),
        tokensIn: run.tokensIn ?? null,
        tokensOut: run.tokensOut ?? null,
        durationMs: run.durationMs ?? null,
        status: run.status ?? "ok",
      },
    });
  } catch (err) {
    console.error("[aiRun] failed to persist run:", err);
  }
};

let activeLogger: Logger = defaultLogger;

export async function logAiRun(run: AiRunRecord): Promise<void> {
  await activeLogger(run);
}

/** Test seam — replace the active logger and get a restore function. */
export function setLoggerForTests(logger: Logger): () => void {
  activeLogger = logger;
  return () => {
    activeLogger = defaultLogger;
  };
}
