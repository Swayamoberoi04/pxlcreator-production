# PXL Creator — Operations Runbook

Phase 5 operational documentation. Covers architecture, deployment,
monitoring, incident response, backup/recovery, and maintenance.

---

## 1. Architecture at a glance

| Layer | Tech | Notes |
|---|---|---|
| App | Next.js 16 (App Router), React 19, TS5 | `src/proxy.ts` guards `/admin/*` |
| Data | Supabase (Postgres + Storage) | service-role server-side only; RLS on all AI tables |
| Auth | Firebase Auth (users) + HMAC cookie (admin) | admin cookie httpOnly/secure/sameSite=lax |
| Payments | Razorpay | HMAC timing-safe verification |
| AI Studio | Gemini Vision + Sharp + Preset Intelligence + Preview Engine | see `src/lib/ai/README.md` |
| AI Preview pipeline | async job worker + QA gate + multi-level cache | migration 020 tables |
| Observability | `src/lib/observability/*` | logger, metrics, alerts |

The AI preview engine **degrades to the deterministic Sharp preview**
whenever generation is unavailable — this is the load-bearing
reliability property. A missing `GEMINI_API_KEY`, a 429, a provider
outage, a QA rejection, or a worker crash all end at the Sharp preview
with no user-visible error.

---

## 2. Environment variables

Validated at startup by `src/lib/env.ts` (`validateServerEnv()` in
`src/instrumentation.ts`). **Required** (build/boot fails without them in
prod): Supabase (3), Firebase client (6), Firebase Admin (3), Razorpay
(3), Admin panel (2).

**Optional** (feature-gated, degrade gracefully):
`GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_IMAGE_MODEL`, `PREVIEW_ENGINE`
(`off` to disable generation), `PREVIEW_DAILY_COST_CEILING` (default 50),
`QA_GATE` (`off` to bypass), `PREVIEW_STORE` (`memory` for tests only),
`ALERT_WEBHOOK_URL` (Slack/Discord/PagerDuty), `OPENAI_API_KEY`,
`YOUTUBE_API_KEY`, `NEXT_PUBLIC_APP_VERSION`.

Secrets live only in the hosting platform's env store — never committed
(`.env.local` is git-ignored). Rotating a key = update the platform env
+ redeploy; no code change.

---

## 3. Deployment

1. `npm run build` must pass clean (TS + compile).
2. Run all test suites (see §7).
3. Apply any new SQL migration in `supabase/migrations/` via the
   Supabase SQL editor (see `docs/AI_PREVIEW_ENGINE_BLUEPRINT.md` §11
   and the migration-020 precedent). Migrations are idempotent
   (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).
4. Deploy (Vercel or equivalent Node runtime — **not** Edge; Sharp +
   the worker need Node).
5. Post-deploy smoke: `GET /api/health` → `ok`; `GET /api/health/ready`
   → `ready`; open `/studio`, run one edit, confirm the Sharp preview
   renders.

**Rollback:** redeploy the previous build (immutable deployments on
Vercel). No destructive migrations have been shipped — every AI
migration is additive, so an older app version runs against the newer
schema without error. Cache keys embed version constants, so a rollback
simply stops matching newer-version cache entries (they age out via
TTL) — no poisoned cache.

**Versioning:** `src/lib/version.ts` resolves the commit SHA
(`VERCEL_GIT_COMMIT_SHA`) or package version; surfaced by `/api/health`
and structured logs for correlating incidents to releases.

---

## 4. Monitoring

| Endpoint | Purpose | Auth |
|---|---|---|
| `GET /api/health` | Liveness — process up, no deps touched | public |
| `GET /api/health/ready` | Readiness — DB + storage probes; 503 if a hard dep is down | public |
| `GET /api/admin/metrics?hours=24` | Full platform report + active alerts | admin |
| `GET /api/admin/ai-cache` | Cache/cost intelligence | admin |

Point the uptime monitor at `/api/health` (liveness) and the load
balancer's readiness gate at `/api/health/ready`. A readiness poll also
opportunistically evaluates alert rules (self-rate-limited to 1/min), so
regular polling doubles as the monitoring heartbeat.

**Alerts** (`src/lib/observability/alerts.ts`) fire on: provider failure
rate ≥80%, worker retry storm ≥50%, QA rejection rate ≥50%, AI latency
>15s, preview p95 >5s, queue >100 jobs, DB/storage probe failure, heap
>900MB. Each has a 15-min cooldown. Dispatch: JSON POST to
`ALERT_WEBHOOK_URL` (Slack-compatible `text` field), else structured
logs (`[alerts] alert_triggered`).

---

## 5. Incident response

| Symptom | First checks | Likely cause | Action |
|---|---|---|---|
| `/api/health/ready` 503 | `checks.database`, `checks.storage` detail | Supabase outage / bad key | verify Supabase status; the studio's core edit still works from static preset data |
| AI previews all degrade | `/api/admin/metrics` → `ledger.aiEdits.failures`; logs for `429` | Gemini quota/billing or key | expected while billing off; enable billing OR set `PREVIEW_ENGINE=off` to skip generation attempts entirely |
| Queue congestion alert | `ledger.workerRuns`, queued count | traffic spike / provider stall | worker recovery re-queues hung jobs automatically; raise `maxJobsPerTick` if sustained |
| High spend | `/api/admin/ai-cache` savings vs spend | cache miss storm | `PREVIEW_DAILY_COST_CEILING` caps daily spend; check cache hit ratio |
| White screen | browser console; `[app:error]` logs w/ digest | uncaught render error | `error.tsx`/`global-error.tsx` catch it; correlate by digest |

The studio, checkout, and preset catalogue do **not** depend on the AI
preview engine — an AI outage never takes down commerce.

---

## 6. Backup & recovery

- **Database:** Supabase automated daily backups (Pro plan) + PITR.
  Verify the backup schedule in the Supabase dashboard before launch.
- **Storage:** the `ai-previews` bucket holds only regenerable previews
  and transient payloads (24h TTL) — not a backup target. Preset media
  in `public/` is in git.
- **Recovery drills:** restoring a DB snapshot is non-destructive to the
  app (additive schema). Preview jobs lost in a restore simply
  regenerate on next request (or serve the Sharp preview).
- **Payloads / job recovery:** the worker's durable payload store
  (bucket `pending/`) + restart-recovery sweep re-claim in-flight jobs
  after a deploy or crash (Phase 4D).

---

## 7. Maintenance

**Test suites** (all hermetic, no paid AI):
```
npx tsx scripts/test-gemini-provider.ts --synthetic   # Phase 2 vision
npx tsx scripts/test-preset-intelligence.ts           # Phase 3
npx tsx scripts/test-preview-engine.ts                # Phase 4B
npx tsx scripts/test-qa-engine.ts                     # Phase 4C
npx tsx scripts/test-worker-system.ts                 # Phase 4D
npx tsx scripts/test-cache-engine.ts                  # Phase 4E
npx tsx scripts/test-observability.ts                 # Phase 5
```

**Scheduled maintenance** (call from a platform cron):
- `POST /api/admin/ai-cache {action:"optimize-storage"}` — compress /
  dedupe / remove orphaned bucket objects (weekly).
- Cache warming + cleanup run opportunistically from worker ticks;
  force via the cache admin endpoint if needed.

**Config versions** to bump when semantics change (they trigger passive
cache invalidation): `PROMPT_VERSION`, `QA_CONFIG_VERSION`,
`ENGINE_VERSION`, `WORKER_CONFIG_VERSION`, `CACHE_CONFIG_VERSION`.

---

## 8. Known launch blockers

1. **Gemini Flash Image billing** — the only thing between "degrades to
   Sharp" and "renders AI previews." Enable billing on the API key; no
   code change. Until then the studio is fully functional on Sharp
   previews.
2. **Verify Supabase daily backups + PITR are enabled** on the
   production project (operational, not code).
3. **Firebase Authorized Domains** must include the production domain +
   deploy URL (from the May 2026 audit; confirm before launch).
