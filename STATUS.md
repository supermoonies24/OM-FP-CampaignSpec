# STATUS.md — Ford Pro CRM Ops Platform

> Last updated after Phase 2a (Brief Generator + pptx + timeline sync + AiRun UI), Phase 2b (AI risk scorer), and Phase 2c (concurrency limiter, threshold-based atRiskAlert notifications, in-app inbox, AI Runs admin dashboard). Read this alongside VISION.md before doing anything.
> Update this file at the end of every session.

---

## Current branch
`claude/phase-0-workflow-scaffold` (Phase 2a landed on top of Phase 1; still needs PR → `claude/lucid-turing-mz4mh9` → main)

---

## What is built and working

### Phase 0 — Scaffold ✅
- 9 Workflow* Prisma models + migration (String enums, JSON payloads for SQLite compat)
- `/lib/workflow/` state machine: `stages.ts`, `channels.ts`, pure `planTransition()` with signoff gates and no-forward-skip enforcement
- 8 route stubs (mostly replaced by Phase 1)

### Phase 1 — Functional ✅
- **Intake** `/intake` — form creates WorkflowCampaign + WorkflowIntake + StageTransition + TimelineItem in one transaction
- **Workflow Board** `/workflow` — 21-column Kanban + list view, search, hide-closed filter, status chips, risk dots, header stats (active/late/at-risk/closed)
- **Campaign Overview** `/workflow/[id]` — 21-segment stage progress bar, current-stage card with advance/per-channel signoff/kick-back controls, Team panel (channel assignments), Spec Form attach (pre-filled from brief if present), Status (Active/On Hold/Cancelled/Shipped), Intake details, activity log, comment composer
- **Brief** `/workflow/[id]/brief` — Claude-powered `generateBrief()` (Phase 2a). Falls back to `buildBriefStub()` when `ANTHROPIC_API_KEY` is unset or the model call fails. UI surfaces a pptx download button and an expandable AiRun history panel.
- **Timeline** `/workflow/[id]/timeline` — per-stage target/actual/delta, manual risk recompute
- **Comms** `/workflow/[id]/comms` — unified WorkflowNotification + WorkflowComment feed, filter tabs, composer
- **Spec Form tab** `/workflow/[id]/spec-form` — redirects to linked spec form or stub-back
- **Admin** `/admin/channels` (assignments by channel or person), `/admin/templates` (brief library)
- **State machine wiring** — every transition rolls TimelineItems (closes prior, opens next), writes Notification placeholders per declared entry action, auto-attaches spec form on entry to BUILD_SPEC_FORM
- **Risk scoring** — `lib/ai/riskScorer.ts` calls Claude per open TimelineItem with comment activity, approval round count, and historical avg duration for the stage (Phase 2b). Closed items still use the deterministic baseline. `/api/workflow-campaigns/[id]/score-risk` and `/api/workflow-campaigns/score-risk` (batch) both upgraded.
- **Tests** — 52 passing (Node built-in runner, `npm test`)

### Phase 2e — Activity, refinement, search
- ✅ Activity feed at `/activity`: cross-campaign unified stream of StageTransitions, Approvals, Comments, brief regenerations. Type filters + time window (24h/7d/30d/90d). Backed by `GET /api/activity?types=...&sinceHours=N&limit=N`. Sidebar link added.
- ✅ AI brief refinement: POST `/api/workflow-campaigns/[id]/generate-brief` now accepts `{ instructions?: string }`. With instructions, the model receives the prior brief + the new instruction and iterates. UI: "Refine…" button on `/workflow/[id]/brief` opens a textarea + Apply button.
- ✅ Encyclopedia search: `GET /api/workflow-campaigns?q=…` runs server-side LIKE over campaign name, client, brief content (highLevelJourney/sfmcJourney/specFormDraft), and intake form. Workflow board's search box now sends a debounced (250ms) `q=` instead of filtering in-memory, so it can find campaigns by their brief/intake content.

### Phase 2f — Dashboards, visuals, intake AI
- ✅ Risk dashboard at `/risk`: cross-campaign view of every open atRisk/late TimelineItem. Summary cards (late count, atRisk count, campaigns affected). Per-owner-channel breakdown. Filterable by channel + severity. Recompute button calls the batch scorer. Backed by `GET /api/risk`. Sidebar link added.
- ✅ Gantt-style timeline visual on `/workflow/[id]/timeline`: compact horizontal bars per stage anchored at campaign kickoff, colored by status, with a today marker. Sits above the existing detail table.
- ✅ AI intake clarifier: `lib/ai/intakeClarifier.ts` detects sparse intakes (< 3 of 4 key fields filled) and asks Claude for up to 5 targeted follow-up questions with reasons + the intake field each answer would populate. Falls back to a generic 3-item checklist. Surfaced as a panel on `/workflow/[id]` when intake is sparse. Backed by `GET /api/workflow-campaigns/[id]/clarify-intake`. Feature: `intake_clarifier` in AiRun.

### Phase 2j — Tags + bulk status
- ✅ Campaign tags: new `WorkflowCampaign.tags` JSON column (migration `add_campaign_tags`). Tags panel on `/workflow/[id]` lets you add/remove (32-char max, deduped, trimmed). Server-side search now matches tags too — searching the workflow board for "Super Duty" finds anything tagged with it.
- ✅ Bulk status change: list-view select mode gains a "Set status…" dropdown next to "Advance N". Drives `POST /api/workflow-campaigns/bulk-status` (validates against `active | onHold | cancelled | shipped`; shipping a batch also stamps `deployedAt`).

### Phase 2i — Approvals + cloning
- ✅ Approval-requested notifications: every transition INTO a stage with `gate: "signoff"` now also fires a dedicated `kind: "approvalRequested"` in-app notification addressed to just that stage's owner channel. Distinct from the generic `notify` rows so owners can immediately spot approvals waiting on them. Surfaced in `/inbox` with its own icon + summary.
- ✅ Workflow campaign duplicate: `POST /api/workflow-campaigns/[id]/duplicate` clones a campaign — same name (with " (copy)" suffix), same client, copies the intake form, starts fresh at INTAKE with a bootstrap StageTransition annotated `Duplicated from <id>`. Brief deck, assignments, history, timeline, approvals, notifications, comments, AI runs, and spec form link are NOT copied. "Duplicate" button on `/workflow/[id]` header.

### Phase 2h — Productivity + test coverage
- ✅ Saved filter presets: new `WorkflowFilterPreset` model (migration `add_filter_presets`). Presets menu on /workflow header — pick a preset to apply (query + hideClosed + view), save the current config as a new preset, delete with ×. Backed by `GET|POST /api/workflow-presets` and `DELETE /api/workflow-presets/[id]`.
- ✅ Bulk advance multiple campaigns: list view gains a Select toggle. Pick N campaigns, hit "Advance N" — the state machine runs on each, with signoff gates still enforced. Response reports `advanced` vs `blocked` counts. Backed by `POST /api/workflow-campaigns/bulk-advance`.
- ✅ AI module test coverage: refactored `similarCampaigns` and `intakeClarifier` to expose pure cores (`rankSimilarCampaigns(target, roster)` and `clarifyIntakeFromData({campaignId, intake, ...})`) so they can be tested with synthetic data without touching prisma. 9 new mocked-SDK tests covering happy path, missing key, SDK throws, validation failure, and the skip-when-comprehensive guard.

### Phase 2g — Channel ops + bulk export
- ✅ Channel velocity at `/admin/channels-velocity`: per-channel on-time rate (red <60%, amber 60–85%, green ≥85%), open items count, oldest open in days, expandable per-stage breakdown (avg actual vs SLA, on-time/late/open). Sorted by most open items then lowest on-time rate so bottlenecks float to the top. Backed by `GET /api/admin/channels-velocity`. Sidebar link added.
- ✅ Inbox deep links: clicking an inbox item now jumps to the relevant page — atRiskAlert → timeline, brief-related kinds → /brief, meeting kinds → /comms, everything else → campaign overview. Marks as read on click.
- ✅ Bulk brief export at `/admin/bulk-export`: multi-select campaigns and download all their current brief decks as a single ZIP. Backed by `POST /api/workflow-campaigns/export-briefs` (also supports `GET ?ids=a,b,c`). Re-renders missing pptx files on the fly from the persisted payload. Sidebar link added.

### Phase 2d — Encyclopedia + observability polish ✅
- ✅ CSV export: `GET /api/workflow-campaigns/export?include=timeline` returns RFC-4180 CSV with campaign rollups (stage, owner channel, brief metadata, AI run/notification/comment counts, risk summary) and, with `?include=timeline`, additional rows per TimelineItem. "CSV" button added to /workflow header. `lib/csv.ts` is the shared serializer (covered by tests).
- ✅ Per-stage entry timestamps: `WorkflowTimelineItem.enteredAt` (migration `add_timeline_entered_at`). `rollTimeline()` stamps it on activation; brief-seeded future items have `enteredAt: null` until the campaign reaches them. Both score-risk routes use `enteredAt → actualDate` for historical avg duration (falling back to `campaign.createdAt → actualDate` for legacy rows pre-dating the column).
- ✅ AI Run drill-down: `/admin/ai-runs/[id]` renders full input/output JSON + metadata. Linked from the recent-runs row in `/admin/ai-runs`. Backed by `GET /api/admin/ai-runs/[id]`.
- ✅ Similar Campaigns panel on `/workflow/[id]/brief`: AI ranks up to 3 most-similar past campaigns by intake + brief content, with one-sentence reasons. Falls back to "most recent N" stub. `lib/ai/similarCampaigns.ts`, route `/api/workflow-campaigns/[id]/similar`. Feature: `similar_campaigns` in AiRun.
- ✅ Comparison view: `/workflow/compare?a=ID&b=ID` page with two campaign pickers, side-by-side detail cards (current stage, owner, created/deployed, brief metadata, summary), and a 21-row stage-by-stage timeline comparison table. "Compare" button on /workflow header. Swap A↔B via header button.
- **Sidebar** — Workflow Board, New Intake, Channel Roster, Brief Library links added

### Known carry-overs (non-blocking)
- Pinned dropdown-values issue still open (from pre-Phase 1 work)
- Remote URL still redirects `om-fp-campaignspec` → `OM-FP-CampaignSpec` (cosmetic, non-blocking)

---

## Immediate next actions before continuing

1. Set `ANTHROPIC_API_KEY` in `.env` to exercise the AI paths (without a key, both brief generation and risk scoring silently fall back to deterministic versions, logged as `status: "fallback"` in AiRun).
2. `npm run dev` → hit `/workflow`. Exercise:
   - intake → generate brief → verify badge shows "AI" (not "Stub"), download the .pptx, expand AiRun history
   - advance through a few stages → click "Score risk" on the board → check `aiScored` and `alertsFired` counts in the response
   - check timeline page — target dates should reflect the AI's suggested cadence, not just the SLA defaults
   - check `/inbox` — entry-action notifications should appear; risk alerts appear after status increases
   - check `/admin/ai-runs` — summary cards + per-feature breakdown + recent runs table
3. Inspect AiRun log: `sqlite3 ~/.om-fp-data/dev.db "SELECT feature, status, tokensIn, tokensOut, durationMs FROM AiRun ORDER BY createdAt DESC LIMIT 10;"`
4. If happy: `git push origin claude/phase-0-workflow-scaffold`
5. Open PR → `claude/lucid-turing-mz4mh9`

---

## What is NOT built yet (remaining phases)

### Phase 2 — AI Features

#### 2a. AI Brief Deck Generator ✅
- **Built**: `lib/ai/briefGenerator.ts` calls `claude-opus-4-8` with `output_config.format` JSON Schema enforcement matching the `BriefDeckPayload` shape; Zod validates the parsed response.
- **System prompt**: `lib/ai/prompts/brief.ts` encodes Ford Pro CRM brief structure, SFMC Journey Builder concepts (entry sources, splits, waits, exits), brand voice. Output schema is mirrored in code so the model can't add or omit fields.
- **Fallback**: missing API key, network errors, malformed JSON, or schema-validation failure all fall back to `buildBriefStub()` silently. Status recorded in `AiRun.status` as `"fallback"` so dashboards can flag degradation.
- **Logging**: every call writes one `AiRun` row (input, output, tokens in/out, durationMs, status). Logging failures don't block the request.
- **Persistence**: `WorkflowBriefDeck` shape unchanged from Phase 1 — `generatedBy` is `"ai"` on success, `"system"` on fallback.
- **Tests**: 4 mocked-SDK tests cover happy path, missing key, malformed JSON, validation failure.

#### 2a.2 — Brief deck supporting infra ✅
- **pptx rendering**: `lib/ai/briefPptx.ts` renders BriefDeckPayload to a 5-section navy-branded deck (title, high-level journey, SFMC journey, timeline, spec form draft). Output at `public/briefs/<campaignId>-v<version>.pptx`. URL persisted to `WorkflowBriefDeck.pptxUrl`. `.gitignore`d.
- **Timeline auto-fill**: `lib/workflow/timeline.ts:syncBriefTimeline()` upserts a WorkflowTimelineItem for each stage based on `payload.timeline.targetOffsetDays` (anchored at intake.createdAt). Closed items are never touched. `rollTimeline()` made idempotent so brief-seeded items aren't duplicated on stage transitions.
- **AiRun history UI**: collapsible panel on `/workflow/[id]/brief` showing recent AiRun rows (status, tokens, latency, error preview). Backed by `GET /api/workflow-campaigns/[id]/ai-runs`.

#### 2b. AI Risk Scorer ✅
- **Built**: `lib/ai/riskScorer.ts:scoreRiskAi()` calls `claude-opus-4-8` with structured-JSON output `{ status, riskScore, riskReason }`, Zod-validated. Closed items skip the model and use deterministic `scoreRisk()`. Fallback path is identical to the brief generator (missing key, API error, malformed JSON → deterministic).
- **Signals**: stage, target date, days-to-target, comments in last 14 days, days since last comment, approval count for the stage, historical avg duration for this stage across other campaigns. Cold-start: when no historical data exists, the prompt tells the model to use the SLA as baseline.
- **Calibration anchors** embedded in the system prompt: <0.3 = comfortable, 0.3–0.6 = limited slack, 0.6–0.85 = atRisk, >0.85 = late.
- **Routes**: `/api/workflow-campaigns/[id]/score-risk` (per-campaign) and `/api/workflow-campaigns/score-risk` (batch — what the Phase 4 cron will call). Batch query uses one query per signal kind grouped by campaign so it scales sub-linearly.
- **Logging**: every AI invocation logs to `AiRun` (feature=`risk_scorer`). Deterministic fallbacks log with `status: "fallback"`.
- **Tests**: 5 mocked-SDK tests (happy path, closed-item bypass, network failure, missing key, invalid response).

#### 2b.2 — Risk scorer follow-ups
- ✅ Edge-triggered `atRiskAlert` WorkflowNotifications fire when a TimelineItem's risk severity *increases* (onTrack → atRisk, atRisk → late, or onTrack → late). Re-runs at the same severity don't re-fire — prevents alert fatigue. See `lib/workflow/riskNotifications.ts`.
- ✅ Bounded concurrency (`lib/concurrency.ts:mapWithConcurrency`) caps parallel Anthropic calls at 5 per batch so the 30-min cron can't stampede the rate limit.
- Vercel cron config (Phase 3 territory once Outlook is wired anyway).
- Per-stage entry timestamp tracking (the current `historicalAvgDays` approximation uses `actualDate - campaign.createdAt`, which conflates pipeline position with stage duration).

### Phase 2c — In-app delivery + observability ✅

- **In-app inbox** at `/inbox`: lists all WorkflowNotifications with `channel: "inApp"`, grouped by campaign, with kind-aware icons and humanized summaries. Filter toggle (Unread / All) and a "Mark all read" action. Backed by:
  - `GET /api/notifications` (with `?unread=1`, `?counts=1`, `?limit=N`)
  - `POST /api/notifications` (bulk mark read: `{ all: true }` or `{ ids: [...] }`)
  - `POST /api/notifications/[id]/read` (single mark read)
- **Sidebar Inbox link** with unread-count badge that polls `/api/notifications?counts=1` every 60s.
- **In-app delivery semantics**: entryAction-generated notifications and risk alerts now set `sentAt = createdAt` for `channel: "inApp"`. Outlook/Teams rows stay `sentAt: null` for their Phase 3 integrations to claim. New `WorkflowNotification.readAt` column tracks read state (global until Phase 6 multi-tenant).
- **AI Runs admin dashboard** at `/admin/ai-runs`:
  - Summary cards: total runs, fallback rate (red over 20%), tokens in/out, p50/p95 latency.
  - Per-feature breakdown (run count, fallback %, tokens).
  - Recent runs table (200 rows) with feature/status/window filters (24h / 7d / 30d).
  - Backed by `GET /api/admin/ai-runs?feature=&status=&sinceHours=N&limit=N`.
  - `AiRun` now has a real Prisma relation to `WorkflowCampaign` (onDelete: SetNull — preserves history when a campaign is deleted).
- **Sidebar AI Runs link** added.

#### 2c. AiRun table ✅
Built in Phase 2a. SQLite-compat shape (String JSON columns):
```prisma
model AiRun {
  id         String   @id @default(cuid())
  campaignId String?
  feature    String   // brief_generator | risk_scorer | meeting_suggester
  model      String
  inputJson  String   // JSON
  outputJson String   // JSON (may include { error } on failures)
  tokensIn   Int?
  tokensOut  Int?
  durationMs Int?
  status     String   @default("ok")  // ok | error | fallback
  createdAt  DateTime @default(now())
  @@index([campaignId, createdAt])
  @@index([feature, createdAt])
}
```

---

### Phase 3 — Outlook Integration

#### Microsoft Graph API setup
- Register app in Azure AD (OneMagnify tenant)
- Scopes needed: `Calendars.ReadWrite`, `Mail.Send`, `Mail.Read`, `OnlineMeetings.ReadWrite`
- Store tokens in DB (new `IntegrationToken` model), refresh automatically
- Client in `/lib/integrations/outlook/client.ts`

#### Calendar: auto-create meeting invites on stage transitions
Stages that trigger a calendar invite on entry (defined in `stages.ts` entry actions):
- `OM_ALIGNMENT` → "OM Alignment Meeting" (all channels)
- `OM_STRATEGY_ALIGNMENT` → "OM Strategy Alignment" (Strategy + OM leads)
- `CLIENT_STRATEGY_ALIGNMENT` → "Client Strategy Alignment" (add Ford Pro contacts)
- `OM_CREATIVE_KICKOFF` → "Creative Kickoff" (Creative + Strategy + Dev/Ops)
- `BUILD_SPEC_REVIEW` → "Spec Review Meeting" (auto-scheduled via FindMeetingTimes API)
- `OM_QC` → "OM QC Review"

Implementation: on `planTransition()` returning `entryActions`, check for `scheduleCalendarInvite`, call Graph `POST /me/events`.

#### Email: send notifications via Outlook
- Replace WorkflowNotification placeholder writes with actual Graph `POST /me/sendMail` calls
- Pull email replies into WorkflowComment table (poll `GET /me/mailFolders/Inbox/messages` filtered by campaign subject tag)

#### Meeting time suggester (lightweight)
- Use Graph `POST /me/findMeetingTimes` with required attendees
- Optional Phase 2a Claude call to priority-rank the returned slots

---

### Phase 4 — Figma Integration

- Per-campaign Figma URL field (already has a DB column stub from earlier migration `add_content_block_figma_link`)
- Figma API: `GET /v1/files/{file_key}/comments`
- Poll every 60 min (or webhook if Figma plan supports it)
- Surface comments in `/workflow/[id]/comms` feed with `source: "figma"` badge
- Feed Figma comment activity (timestamp of last comment, comment count) into Phase 2b AI risk scorer input
- Store Figma comment external IDs to deduplicate on re-poll

---

### Phase 5 — Encyclopedia polish + search

- Full-text search across campaigns (name, brief content, spec form fields)
- Advanced filters: stage, channel owner, date range, status, tags, deployed/not
- Saved filter presets per user
- Campaign comparison view (side-by-side two campaigns)
- Export to CSV (campaign list + timeline data)
- "Similar campaigns" panel on brief page (feeds AI risk scorer cold-start problem)

---

### Phase 6 (v2) — Future state

- **Visual journey view**: Miro-style canvas, each touchpoint shows creative PNG, copy-paste tagging links per CTA, generated email names, CSV export of all link tags + email IDs
- **Ford Pro client logins**: migrate SQLite → Postgres, add multi-tenant auth, read-only by default, approval actions on stages they own
- **SFMC bidirectional sync**: pull deployment metrics (opens, clicks) into encyclopedia, push journey config from Brief Deck → SFMC
- **Airtable sync**: Strategy team currently updates Airtable; make this app source of truth, sync to Airtable during transition period, then deprecate
- **Jira integration**: auto-create epic + tickets on Creative Kickoff stage
- **Teams deeper integration**: auto-create Teams channel per campaign (currently just notification delivery)

---

## Architecture rules for Claude Code

- **Never write directly to `WorkflowCampaign.currentStage`** — always go through `planTransition()` in `lib/workflow/index.ts`
- **Stages are config** in `lib/workflow/stages.ts` — adding/reordering stages requires no schema changes
- **All AI calls** go through `lib/ai/` and log to `AiRun` table
- **New integrations** go in `lib/integrations/{service}/` — typed client + typed sync function
- **Existing CampaignSpec is untouched** — the spec form flow, existing routes, existing components are read-only unless explicitly scoped
- **Design tokens**: use existing navy shadcn tokens, no new component libraries
- **Server actions over API routes** where possible (Next.js 15)
- **SQLite compat**: no native enums in Prisma, use String + Zod validation; no array columns, use JSON
- **Tests**: maintain 20+ passing, add tests for any new lib/ functions
- **Update this STATUS.md** at the end of every session

---

## Open questions (answer before implementing that phase)

- **Phase 3**: Who registers the Azure AD app — Jonah or an OM IT admin? What tenant?
- **Phase 3**: Are Ford Pro contacts (client-side emails) in the OneMagnify tenant or external?
- **Phase 2a**: Does the Brief Deck pptx use the same navy template as the Q1 reporting deck?
- **Phase 4**: Is the Figma workspace on a plan that supports webhooks?
- **Phase 5**: Is full-text search via SQLite FTS5 acceptable, or do we need external search (Algolia/pg_vector)?
- **General**: How are users provisioned? Microsoft SSO or manual invite?
- **General**: Approval signoff — logged click only, or does it need a digital signature?
