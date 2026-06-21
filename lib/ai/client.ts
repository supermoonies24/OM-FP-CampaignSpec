import Anthropic from "@anthropic-ai/sdk";

// Singleton Anthropic client. Returns null when ANTHROPIC_API_KEY is unset,
// which lets callers fall back to deterministic stubs in dev/CI without
// requiring a live key.

let cached: Anthropic | null | undefined;

export function getAnthropic(): Anthropic | null {
  if (cached !== undefined) return cached;
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  cached = key ? new Anthropic({ apiKey: key }) : null;
  return cached;
}

export function resetAnthropicForTests(client: Anthropic | null): void {
  cached = client;
}

export const BRIEF_GENERATOR_MODEL = "claude-opus-4-8";
