import type { Channel } from "./channels";

// 21 stages of the Ford Pro CRM email pipeline (VISION.md §4).
// Config-driven: adding, reordering, or tweaking a stage should not require
// schema changes. The DB stores `currentStage` as a String.

export const STAGES = [
  "INTAKE",
  "OM_ALIGNMENT",
  "STRATEGY_DEVELOPMENT",
  "OM_STRATEGY_ALIGNMENT",
  "CLIENT_STRATEGY_ALIGNMENT",
  "CLIENT_STRATEGY_APPROVAL",
  "CREATIVE_BRIEF",
  "OM_CREATIVE_KICKOFF",
  "OM_CREATIVE_ADMIN",
  "CREATIVE_DESIGN_AND_COPY",
  "OM_CREATIVE_ALIGNMENT",
  "CLIENT_CREATIVE_APPROVAL",
  "LEGAL_CREATIVE_APPROVAL",
  "CREATIVE_TO_DEVELOPMENT",
  "BUILD_SPEC_FORM",
  "BUILD_SPEC_REVIEW",
  "SFMC_BUILD",
  "OM_QC",
  "EMAIL_TESTING",
  "CLIENT_QC_AND_APPROVAL",
  "EMAIL_DEPLOYMENT",
] as const;

export type Stage = (typeof STAGES)[number];

export type GateType =
  | "signoff"        // requires an Approval record from the owner channel before exit
  | "informational"; // advances when entry actions complete or owner marks done

export interface StageEntryAction {
  kind:
    | "notify"            // send Notification record(s)
    | "calendarInvite"    // create Outlook calendar invite
    | "aiBriefGenerate"   // trigger Brief Deck generation
    | "aiRiskScore"       // recompute risk for active TimelineItem
    | "ensureSpecForm"    // create + link a spec form if none attached
    | "createJiraEpic"
    | "createTeamsChannel";
  notes?: string;
}

export interface StageConfig {
  id: Stage;
  label: string;
  ownerChannel: Channel;
  participants: Channel[];
  gate: GateType;
  /** Target duration in business days. Feeds the AI risk scorer. */
  slaDays: number;
  /** Actions fired on transition INTO this stage. */
  entryActions: StageEntryAction[];
}

export const STAGE_CONFIG: Record<Stage, StageConfig> = {
  INTAKE: {
    id: "INTAKE",
    label: "Intake",
    ownerChannel: "STRATEGY",
    participants: ["STRATEGY"],
    gate: "informational",
    slaDays: 1,
    entryActions: [{ kind: "notify", notes: "Strategy team only" }],
  },
  OM_ALIGNMENT: {
    id: "OM_ALIGNMENT",
    label: "OM Alignment",
    ownerChannel: "STRATEGY",
    participants: ["AUDIENCE", "STRATEGY", "CREATIVE", "DEV_OPS", "TECH_DEV"],
    gate: "informational",
    slaDays: 2,
    entryActions: [
      { kind: "calendarInvite", notes: "All OM channels" },
      { kind: "notify" },
    ],
  },
  STRATEGY_DEVELOPMENT: {
    id: "STRATEGY_DEVELOPMENT",
    label: "Strategy Development",
    ownerChannel: "STRATEGY",
    participants: ["STRATEGY", "AUDIENCE"],
    gate: "informational",
    slaDays: 3,
    entryActions: [{ kind: "aiBriefGenerate" }],
  },
  OM_STRATEGY_ALIGNMENT: {
    id: "OM_STRATEGY_ALIGNMENT",
    label: "OM Strategy Alignment",
    ownerChannel: "STRATEGY",
    participants: ["AUDIENCE", "STRATEGY", "CREATIVE", "DEV_OPS"],
    gate: "informational",
    slaDays: 2,
    entryActions: [{ kind: "calendarInvite" }, { kind: "notify" }],
  },
  CLIENT_STRATEGY_ALIGNMENT: {
    id: "CLIENT_STRATEGY_ALIGNMENT",
    label: "Client Strategy Alignment",
    ownerChannel: "STRATEGY",
    participants: ["FORD_PRO", "STRATEGY"],
    gate: "informational",
    slaDays: 2,
    entryActions: [{ kind: "calendarInvite" }, { kind: "notify" }],
  },
  CLIENT_STRATEGY_APPROVAL: {
    id: "CLIENT_STRATEGY_APPROVAL",
    label: "Client Strategy Approval",
    ownerChannel: "FORD_PRO",
    participants: ["FORD_PRO", "STRATEGY"],
    gate: "signoff",
    slaDays: 3,
    entryActions: [{ kind: "notify" }],
  },
  CREATIVE_BRIEF: {
    id: "CREATIVE_BRIEF",
    label: "Creative Brief",
    ownerChannel: "STRATEGY",
    participants: ["STRATEGY", "CREATIVE"],
    gate: "informational",
    slaDays: 2,
    entryActions: [{ kind: "notify" }],
  },
  OM_CREATIVE_KICKOFF: {
    id: "OM_CREATIVE_KICKOFF",
    label: "OM Creative Kickoff",
    ownerChannel: "CREATIVE",
    participants: ["STRATEGY", "CREATIVE", "DEV_OPS"],
    gate: "informational",
    slaDays: 1,
    entryActions: [{ kind: "calendarInvite" }, { kind: "notify" }],
  },
  OM_CREATIVE_ADMIN: {
    id: "OM_CREATIVE_ADMIN",
    label: "OM Creative Admin",
    ownerChannel: "CREATIVE",
    participants: ["CREATIVE"],
    gate: "informational",
    slaDays: 1,
    entryActions: [],
  },
  CREATIVE_DESIGN_AND_COPY: {
    id: "CREATIVE_DESIGN_AND_COPY",
    label: "Creative Design & Copy",
    ownerChannel: "CREATIVE",
    participants: ["CREATIVE"],
    gate: "informational",
    slaDays: 5,
    entryActions: [{ kind: "notify" }],
  },
  OM_CREATIVE_ALIGNMENT: {
    id: "OM_CREATIVE_ALIGNMENT",
    label: "OM Creative Alignment",
    ownerChannel: "CREATIVE",
    participants: ["STRATEGY", "CREATIVE", "DEV_OPS"],
    gate: "informational",
    slaDays: 2,
    entryActions: [{ kind: "calendarInvite" }, { kind: "notify" }],
  },
  CLIENT_CREATIVE_APPROVAL: {
    id: "CLIENT_CREATIVE_APPROVAL",
    label: "Client Creative Approval",
    ownerChannel: "FORD_PRO",
    participants: ["FORD_PRO", "STRATEGY", "CREATIVE"],
    gate: "signoff",
    slaDays: 3,
    entryActions: [{ kind: "notify" }],
  },
  LEGAL_CREATIVE_APPROVAL: {
    id: "LEGAL_CREATIVE_APPROVAL",
    label: "Legal Creative Approval",
    ownerChannel: "FORD_PRO",
    participants: ["FORD_PRO"],
    gate: "signoff",
    slaDays: 3,
    entryActions: [{ kind: "notify" }],
  },
  CREATIVE_TO_DEVELOPMENT: {
    id: "CREATIVE_TO_DEVELOPMENT",
    label: "Creative to Development",
    ownerChannel: "CREATIVE",
    participants: ["CREATIVE", "DEV_OPS"],
    gate: "informational",
    slaDays: 1,
    entryActions: [{ kind: "notify" }],
  },
  BUILD_SPEC_FORM: {
    id: "BUILD_SPEC_FORM",
    label: "Build Spec Form",
    ownerChannel: "DEV_OPS",
    participants: ["DEV_OPS"],
    gate: "informational",
    slaDays: 1,
    entryActions: [
      { kind: "ensureSpecForm", notes: "Auto-create from brief draft if none attached" },
      { kind: "notify" },
    ],
  },
  BUILD_SPEC_REVIEW: {
    id: "BUILD_SPEC_REVIEW",
    label: "Build Spec Review",
    ownerChannel: "DEV_OPS",
    participants: ["DEV_OPS", "STRATEGY"],
    gate: "signoff",
    slaDays: 1,
    entryActions: [{ kind: "calendarInvite" }, { kind: "notify" }],
  },
  SFMC_BUILD: {
    id: "SFMC_BUILD",
    label: "SFMC Build",
    ownerChannel: "DEV_OPS",
    participants: ["DEV_OPS"],
    gate: "informational",
    slaDays: 3,
    entryActions: [{ kind: "notify" }],
  },
  OM_QC: {
    id: "OM_QC",
    label: "OM QC",
    ownerChannel: "DEV_OPS",
    participants: ["DEV_OPS"],
    gate: "signoff",
    slaDays: 1,
    entryActions: [{ kind: "calendarInvite" }, { kind: "notify" }],
  },
  EMAIL_TESTING: {
    id: "EMAIL_TESTING",
    label: "Email Testing",
    ownerChannel: "DEV_OPS",
    participants: ["DEV_OPS"],
    gate: "informational",
    slaDays: 1,
    entryActions: [{ kind: "notify" }],
  },
  CLIENT_QC_AND_APPROVAL: {
    id: "CLIENT_QC_AND_APPROVAL",
    label: "Client QC & Approval",
    ownerChannel: "FORD_PRO",
    participants: ["FORD_PRO", "DEV_OPS"],
    gate: "signoff",
    slaDays: 2,
    entryActions: [{ kind: "notify" }],
  },
  EMAIL_DEPLOYMENT: {
    id: "EMAIL_DEPLOYMENT",
    label: "Email Deployment",
    ownerChannel: "DEV_OPS",
    participants: ["DEV_OPS"],
    gate: "informational",
    slaDays: 1,
    entryActions: [{ kind: "notify" }],
  },
};

export function getStageConfig(stage: Stage): StageConfig {
  return STAGE_CONFIG[stage];
}

export function getStageIndex(stage: Stage): number {
  return STAGES.indexOf(stage);
}

export function getNextStage(stage: Stage): Stage | null {
  const i = getStageIndex(stage);
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null;
}

export function getPreviousStage(stage: Stage): Stage | null {
  const i = getStageIndex(stage);
  return i > 0 ? STAGES[i - 1] : null;
}

export function isValidStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value);
}
