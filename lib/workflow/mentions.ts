import { CHANNELS, type Channel } from "./channels";

// Lightweight @mention parser for comment bodies.
//
// Recognized forms:
//   @CHANNEL_NAME           — case-insensitive match against the Channel enum
//                             (FORD_PRO, AUDIENCE, STRATEGY, CREATIVE, DEV_OPS,
//                              TECH_DEV)
//   @ford-pro / @devops     — common spellings normalized to the enum
//   @here                   — alias meaning "everyone on the campaign"
//
// Returns the set of channels referenced. Unknown @tokens are ignored.

const ALIASES: Record<string, Channel | "ALL"> = {
  "FORD_PRO": "FORD_PRO",
  "FORDPRO": "FORD_PRO",
  "FORD-PRO": "FORD_PRO",
  "AUDIENCE": "AUDIENCE",
  "STRATEGY": "STRATEGY",
  "CREATIVE": "CREATIVE",
  "DEV_OPS": "DEV_OPS",
  "DEVOPS": "DEV_OPS",
  "DEV-OPS": "DEV_OPS",
  "TECH_DEV": "TECH_DEV",
  "TECHDEV": "TECH_DEV",
  "TECH-DEV": "TECH_DEV",
  "HERE": "ALL",
  "EVERYONE": "ALL",
  "CHANNEL": "ALL",
};

export interface MentionResult {
  channels: Channel[];
  /** true if @here / @everyone / @channel appeared. */
  all: boolean;
}

export function parseMentions(body: string): MentionResult {
  if (!body) return { channels: [], all: false };
  const matched = new Set<Channel>();
  let all = false;
  const re = /@([A-Za-z][A-Za-z0-9_-]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const token = m[1].toUpperCase();
    const target = ALIASES[token];
    if (!target) continue;
    if (target === "ALL") {
      all = true;
    } else {
      matched.add(target);
    }
  }
  return {
    channels: all ? [...CHANNELS] : Array.from(matched),
    all,
  };
}
