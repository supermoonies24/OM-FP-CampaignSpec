# VISION.md — Ford Pro CRM Ops Platform

> Workflow orchestration platform for the Ford Pro CRM email team at OneMagnify.
> Wraps and extends the existing **CampaignSpec** app to manage the full 21-stage campaign lifecycle from intake through deployment.

---

## 1. What we're building

A single internal app that runs the entire Ford Pro CRM email production pipeline. It absorbs **CampaignSpec** as one module (the "Build Spec Form" stage) and adds everything before and after it: intake, brief generation, multi-team alignment, creative review gates, build, QC, and deployment.

The app's three jobs:
1. **Orchestrate the 21-stage workflow** across 6 channels (roles) with clear handoffs, gate approvals, and timeline tracking.
2. **Automate the busywork** — calendar invites, brief deck generation, status pings, meeting scheduling, risk alerts.
3. **Be the encyclopedia** — every campaign ever run is searchable, filterable, and retrievable as a reference.

CampaignSpec stays the source of truth for spec form data. This app becomes the source of truth for everything else (workflow state, briefs, reviews, timelines, comms).

---

## 2. Core concept: the Campaign object

Everything orbits one entity: the **Campaign**. A Campaign moves through 21 stages, has a Spec Form (the existing CampaignSpec data), a Brief Deck, a Figma link, a timeline, assigned people per channel, and a history of every status change, comment, approval, and notification.

A Campaign is the unit users browse in the encyclopedia, the unit AI generates briefs for, the unit the tracker watches, and the unit that ultimately ships to SFMC.

---

## 3. Architecture decision: extend, don't fork

**Recommendation: same codebase as CampaignSpec.** Add new modules, routes, and Prisma models. Keep one app.

Why:
- CampaignSpec already uses Next.js 15 / Prisma / SQLite / shadcn — the right stack for this.
- The "Build Spec Form" stage *is* CampaignSpec. Same app means a stage transition just creates/links the existing SpecForm record — no cross-app API plumbing.
- One auth system, one deployment, one schema.
- Two apps would force you to duplicate users, campaigns, and notifications.

**One caveat:** Plan a SQLite → Postgres migration before Ford Pro client users get logins (future state). SQLite is fine for the OneMagnify-internal team. Multi-tenant + concurrent client access wants Postgres. Add a Prisma migration path now so the switch is mechanical later.

Repo layout (additions to existing CampaignSpec):
```
/app
  /campaigns                  # Campaign list, detail, encyclopedia
    /[id]
      /workflow               # 21-stage board view
      /brief                  # AI-generated brief deck
      /timeline               # Gantt-style timeline
      /spec-form              # Existing CampaignSpec (linked)
      /comms                  # Notifications + comment log
  /intake                     # New intake form
  /admin
    /channels                 # Manage role assignments
    /templates                # Brief deck templates, email templates
/lib
  /workflow                   # State machine, stage transitions
  /ai                         # Brief generation, risk scoring
  /integrations
    /outlook                  # Calendar + email
    /figma                    # File linking + comment polling
    /jira                     # Ticket creation
    /sfmc                     # Future: build status sync
    /airtable                 # Strategy team's existing tracker sync
/prisma
  schema.prisma               # Extended schema (see §5)
```

---

## 4. The 21-stage workflow

```
INTAKE → OM ALIGNMENT → STRATEGY DEV → OM STRATEGY ALIGN → CLIENT STRATEGY ALIGN
  → CLIENT STRATEGY APPROVAL → CREATIVE BRIEF → OM CREATIVE KICKOFF
  → OM CREATIVE ADMIN → CREATIVE DESIGN & COPY → OM CREATIVE ALIGN
  → CLIENT CREATIVE APPROVAL → LEGAL CREATIVE APPROVAL → CREATIVE TO DEV
  → BUILD SPEC FORM ★ → BUILD SPEC REVIEW → SFMC BUILD → OM QC
  → EMAIL TESTING → CLIENT QC & APPROVAL → EMAIL DEPLOYMENT
```

★ = CampaignSpec (existing).

Each stage is a state with:
- An **owner channel** (who drives it)
- **Participating channels** (who provides input)
- **Gate type**: signoff-required vs. informational
- **SLA**: target duration (used by AI risk scoring)
- **Entry actions**: what fires on transition in (notifications, calendar invites, AI generation)
- **Exit conditions**: what must be true to advance (approvals, attached deliverables)

Implement as a state machine in `/lib/workflow`. Encode stages as a config (not hardcoded) so the workflow can evolve without code changes.

---

## 5. Data model (additions)

New Prisma models, alongside existing CampaignSpec models:

```prisma
model Campaign {
  id              String   @id @default(cuid())
  name            String
  client          String   // "Ford Pro" — future: foreign key
  currentStage    Stage
  status          CampaignStatus
  intake          Intake?
  briefDeckId     String?
  figmaUrl        String?
  specFormId      String?  // → existing CampaignSpec SpecForm
  jiraEpicKey     String?
  sfmcJourneyId   String?
  teamsChannelUrl String?
  createdAt       DateTime @default(now())
  deployedAt      DateTime?
  assignments     ChannelAssignment[]
  stageHistory    StageTransition[]
  timeline        TimelineItem[]
  notifications   Notification[]
  approvals       Approval[]
  comments        Comment[]
}

model Intake {
  id          String   @id @default(cuid())
  campaignId  String   @unique
  campaign    Campaign @relation(fields: [campaignId], references: [id])
  submittedBy String   // user id
  rawForm     Json     // intake form fields
  clarifications Json[] // followups from Strategy
  createdAt   DateTime @default(now())
}

model BriefDeck {
  id              String   @id @default(cuid())
  campaignId      String   @unique
  highLevelJourney Json
  sfmcJourney     Json
  timeline        Json
  specFormDraft   Json     // AI-suggested spec form values
  generatedBy     String   // "ai" | userId
  version         Int      @default(1)
  pptxUrl         String?  // pptxgenjs output
  createdAt       DateTime @default(now())
}

model ChannelAssignment {
  id         String   @id @default(cuid())
  campaignId String
  channel    Channel  // Audience | Strategy | Creative | DevOps | TechDev | FordPro
  userId     String
  role       String   // "owner" | "contributor" | "reviewer"
}

model StageTransition {
  id            String   @id @default(cuid())
  campaignId    String
  fromStage     Stage?
  toStage       Stage
  triggeredBy   String   // user id or "system"
  notes         String?
  createdAt     DateTime @default(now())
}

model TimelineItem {
  id            String   @id @default(cuid())
  campaignId    String
  stage         Stage
  targetDate    DateTime
  actualDate    DateTime?
  status        TimelineStatus  // onTrack | atRisk | late | complete
  riskScore     Float?          // 0-1, AI-generated
  riskReason    String?         // AI explanation
}

model Approval {
  id          String   @id @default(cuid())
  campaignId  String
  stage       Stage
  channel     Channel
  approvedBy  String
  approvedAt  DateTime @default(now())
  notes       String?
}

model Notification {
  id          String   @id @default(cuid())
  campaignId  String
  kind        NotificationKind // stageTransition | atRiskAlert | approvalRequested | meetingScheduled
  recipients  String[]         // user ids
  channel     DeliveryChannel  // outlook | inApp | teams
  payload     Json
  sentAt      DateTime?
}

model Comment {
  id          String   @id @default(cuid())
  campaignId  String
  source      CommentSource    // inApp | figma | outlook
  externalId  String?          // figma comment id, email message id
  authorEmail String
  body        String
  createdAt   DateTime @default(now())
}

enum Stage {
  INTAKE
  OM_ALIGNMENT
  STRATEGY_DEVELOPMENT
  OM_STRATEGY_ALIGNMENT
  CLIENT_STRATEGY_ALIGNMENT
  CLIENT_STRATEGY_APPROVAL
  CREATIVE_BRIEF
  OM_CREATIVE_KICKOFF
  OM_CREATIVE_ADMIN
  CREATIVE_DESIGN_AND_COPY
  OM_CREATIVE_ALIGNMENT
  CLIENT_CREATIVE_APPROVAL
  LEGAL_CREATIVE_APPROVAL
  CREATIVE_TO_DEVELOPMENT
  BUILD_SPEC_FORM
  BUILD_SPEC_REVIEW
  SFMC_BUILD
  OM_QC
  EMAIL_TESTING
  CLIENT_QC_AND_APPROVAL
  EMAIL_DEPLOYMENT
}

enum Channel {
  FORD_PRO
  AUDIENCE
  STRATEGY
  CREATIVE
  DEV_OPS
  TECH_DEV
}
```

---

## 6. Roles & permissions

Six channels map to roles. Permissions are channel-scoped, not per-user-flag:

| Channel | Primary stages owned | Gets notified on |
|---|---|---|
| Ford Pro | (none — client) | Approval stages they own |
| Audience | (advisory) | Strategy + Creative reviews |
| Strategy | Intake, Strategy Dev, Creative Brief, Updates Airtable | Most stages |
| Creative | Creative Design & Copy, Creative to Dev | Brief + review stages |
| Dev/Ops | Build Spec Form, SFMC Build, QC, Deployment | All build/QC stages |
| Tech/Dev | (advisory on architecture) | Architecture-touching stages |

For v1, Ford Pro has no login — but mark them as a Channel in the data model so when client logins land in v2, it's a permissions flip, not a schema migration.

---

## 7. Features by phase

### v1 (MVP)

**Intake form**
- Web form, submitted by Strategy (per the Miro: "Intake notifies only Strategy")
- On submit: creates Campaign, fires Outlook calendar invite to all channels for OM Alignment meeting, sends in-app + Outlook notification to all channels.

**AI Campaign Brief Deck generation** (Claude API)
- Trigger: Strategy uploads intake + alignment meeting notes
- Output (structured JSON, then rendered to pptx via pptxgenjs):
  - High Level Journey
  - SFMC Journey Builder journey diagram
  - Timeline for every step + deliverable (auto-fills `TimelineItem` records)
  - Spec Form draft (pre-fills CampaignSpec fields where AI is confident)
- Reuse the navy-branded pptx templates already built for the Q1 reporting system.

**21-stage workflow board**
- Kanban-style view of all in-flight campaigns, columns = stages
- Detail view per campaign showing stage history, current owner, blockers, timeline status
- Stage transitions trigger entry actions (notifications, calendar invites, AI runs)

**In-app tracker with AI risk alerts**
- Cron job (every 30 min or so) evaluates every active TimelineItem
- Claude API call scores risk: looks at days remaining, current review round, latest comment timestamps, historical similar campaigns
- If risk crosses threshold → fire alert via Outlook + in-app + Teams
- Example logic: "round 3 of reviews, reviews due in 24 hours, no comments in 18 hours" → atRisk

**Outlook integration**
- Calendar: auto-create invites on stage transitions that need meetings (OM Alignment, Strategy Alignment, Creative Kickoff, Spec Review, OM QC)
- Email: send notifications, pull email replies into Comments
- Use Microsoft Graph API

**Figma linking**
- Per-campaign Figma URL field
- Poll Figma comments via API, surface in the campaign timeline + Comments table
- Feed Figma comment activity into the AI risk model

**Campaign encyclopedia**
- Searchable, filterable, sortable list of all campaigns ever
- Filters: stage, channel owner, date range, client, status, tags
- Detail view shows everything: brief deck, spec form, figma, deployment metrics (later)

**Auto-scheduled meetings**
- Specific stage transitions trigger "find a time" logic via Microsoft Graph FindMeetingTimes API
- Spec Form Review meeting auto-scheduled on entry to BUILD_SPEC_REVIEW

### v2 (Future state — from your Miro notes)

**Visual journey view ("Maneuverable flow chart like Miro")**
- Each touchpoint in the campaign journey shows:
  - The creative PNG (or web-linked browser-rendered version)
  - Tagging links per CTA, copy-paste-ready
  - Generated email names
- CSV export of all link tags + email IDs per campaign

**Ford Pro client logins**
- Multi-tenant. Migrate SQLite → Postgres.
- Read-only by default; approval actions on stages they own.

**SFMC bidirectional sync**
- Pull deployment metrics into the encyclopedia (opens, clicks — already analyzed in your link data work)
- Push journey config from Brief Deck → SFMC

**Airtable sync**
- Strategy team updates Airtable today. Make this app the source of truth and sync to Airtable for transition, then deprecate Airtable.

**Jira + Teams deeper integration**
- Auto-create Jira tickets on Creative Kickoff stage
- Auto-create Teams channel per campaign

---

## 8. AI architecture

Three Claude API surface areas. All use `claude-opus-4-8` unless noted.

### 8.1 Brief Deck Generator
- Input: intake form JSON + alignment meeting notes
- System prompt: encode Ford Pro CRM brief structure, brand voice, SFMC Journey Builder concepts
- Output: structured JSON matching `BriefDeck` schema
- Post-process: render to pptx via pptxgenjs using existing navy template
- Human-in-the-loop: Strategy reviews and edits before sending to OM Strategy Alignment

### 8.2 Risk/Deadline Scorer
- Cron: every 30 min, per active TimelineItem
- Input: stage, target date, days elapsed, comment activity (Figma + email), review round count, historical campaign averages for this stage
- Output: risk score (0–1) + short reason string
- Action: if score > threshold, create Notification record, fire to Outlook + in-app + Teams

### 8.3 Meeting Time Suggester (lightweight)
- Input: required attendees, urgency, prior meeting cadence for this campaign
- Output: priority-ordered times to feed Microsoft Graph FindMeetingTimes
- Optional in v1 — can use Graph directly if Claude adds no value

Store all AI inputs/outputs (use an `AiRun` table) for evaluation and improvement.

---

## 9. Integrations

| Integration | What | Direction | Priority |
|---|---|---|---|
| Microsoft Graph | Outlook calendar + email | Both | v1 |
| Figma API | Pull comments, link files | In | v1 |
| Claude API | Brief gen, risk scoring | Out | v1 |
| Teams | Notifications + auto-create channels | Out | v1 (notif), v2 (channels) |
| Jira | Auto-create epic + tickets | Out | v2 |
| SFMC | Build status, deployment metrics | Both | v2 |
| Airtable | Strategy team sync during transition | Both | v2 |

---

## 10. Phasing / rollout

**Phase 0** (now, in repo): Extend Prisma schema. Stub out new routes. Build workflow state machine config.

**Phase 1**: Intake form + Campaign object + workflow board. No AI yet — just the orchestration shell. Get Strategy team using it for intake/tracking.

**Phase 2**: AI Brief Deck generator. This is the biggest visible win — auto-generating decks from intake notes.

**Phase 3**: Outlook integration (calendar + email). This unlocks the auto-scheduling and notification stories.

**Phase 4**: In-app tracker + AI risk alerts. Requires Phase 3 to be useful.

**Phase 5**: Figma integration + encyclopedia search polish.

**Phase 6** (v2): Visual journey view, Ford Pro logins, SFMC sync.

---

## 11. What this app is *not*

- Not a replacement for SFMC. Builds happen in SFMC; this orchestrates the work around it.
- Not a replacement for Figma. Designs live in Figma; this links and tracks them.
- Not a project management tool in general. It's specialized for Ford Pro CRM email campaigns. The stage list and channel set are encoded, not configurable. (If OneMagnify wants to white-label this for other accounts later, refactor at that point.)
- Not a CRM. Despite the name, it's a workflow ops tool for the CRM team.

---

## 12. Open questions to resolve before/during Phase 1

- Who actually submits intake? Strategy submits per the Miro, but does the request originate in email, Teams, Outlook form, or this app's intake form?
- What's the data source for "historical similar campaigns" for AI risk scoring? Starting cold means the first 20+ campaigns have no historical baseline — fall back to static SLAs.
- How are users provisioned? SSO via Microsoft? Manual admin invite?
- Approval signoff — digital signature, just a logged click, or comment + click?
- Versioning of Brief Decks — is a new version a new record or an edit in place?
- Where does Audience team's work product live today? Need to know what artifacts to attach to the Campaign.

---

## 13. For Claude Code

When extending this app:
- Stages are config-driven (`/lib/workflow/stages.ts`). Adding/reordering stages should not require schema changes.
- Channel permissions are channel-scoped, not per-user. Use the `ChannelAssignment` table.
- Every stage transition goes through the state machine — never write directly to `Campaign.currentStage`.
- AI calls go through `/lib/ai/*`. Log every input/output to `AiRun`.
- New integrations go in `/lib/integrations/{service}/`. Each exposes a typed client + a typed sync function.
- Use existing CampaignSpec shadcn components and the existing navy color tokens. Don't introduce new design primitives.
- Server actions over API routes where possible (Next.js 15 conventions).
- Keep `ARCHITECTURE.md` current — same maintenance pattern as CampaignSpec.
