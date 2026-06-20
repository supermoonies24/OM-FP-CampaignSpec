// Channels = the six "lanes" that own work on a campaign (VISION.md §6).
// Stored as a String column in the DB; this is the canonical TS union.

export const CHANNELS = [
  "FORD_PRO",
  "AUDIENCE",
  "STRATEGY",
  "CREATIVE",
  "DEV_OPS",
  "TECH_DEV",
] as const;

export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABELS: Record<Channel, string> = {
  FORD_PRO: "Ford Pro",
  AUDIENCE: "Audience",
  STRATEGY: "Strategy",
  CREATIVE: "Creative",
  DEV_OPS: "Dev / Ops",
  TECH_DEV: "Tech / Dev",
};
