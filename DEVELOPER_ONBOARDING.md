# DEVELOPER ONBOARDING

Use this as a first-day guide for working safely in the IT Dashboard codebase.

## 1) What to Read First

Read in this order:

1. `README.md`
   - Project purpose, local setup, env vars, and MVP limits.
2. `ARCHITECTURE_OVERVIEW.md`
   - End-to-end flow: Smartsheet -> DB -> API -> Frontend.
3. `MAINTENANCE_GUIDE.md`
   - Change runbooks, risky areas, and guardrails.
4. `db/schema.sql`
   - Core data model and enum values.
5. `src/server.ts`
   - API behavior and request validation.
6. `frontend/src/lib/api.ts`
   - Frontend/backend contract used by pages.

## 2) How to Run Locally

### Prereqs

- Node.js 20+ recommended
- Docker (for local Postgres)

### Setup

1. Copy env files:
   - `.env.example` -> `.env`
   - `frontend/.env.example` -> `frontend/.env.local`
2. Start Postgres:

```bash
docker run --name it-dashboard-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=postgres \
  -p 5432:5432 \
  -d postgres:16
```

3. Install dependencies:

```bash
npm install
cd frontend && npm install
```

4. Initialize schema + baseline seed data (from repo root):

```bash
npm run setup:db
```

5. Run backend (repo root):

```bash
npm run dev
```

6. Run frontend (`frontend/`):

```bash
npm run dev
```

Defaults:
- API: `http://localhost:3001`
- Frontend: `http://localhost:3000`

## 3) How to Sync Smartsheet Test Data

Only use test Smartsheet credentials when onboarding.

1. Set in `.env`:
   - `SMARTSHEET_API_TOKEN` (test token)
   - `SMARTSHEET_SHEET_ID` (test sheet)
2. Preview mapping first (safe, no DB writes):

```bash
npm run sync:preview
```

3. Verify preview output looks correct:
   - expected requester name/email fields
   - expected queue (`it` / `operations`)
   - expected approval mapping (`pending_approval` / `approved` / `denied`)
4. Run actual sync:

```bash
npm run sync:run
```

5. Open `http://localhost:3000` and confirm synced tickets appear.

## 4) How to Validate Main Flows

Use this checklist after setup and after any non-trivial change.

- **Ticket list**
  - Load `/`
  - Confirm pagination works.
  - Confirm filters (approval, queue, status, category) change results.
- **Ticket detail update**
  - Open a ticket from list.
  - Change status, assignee, category; click Save.
  - Refresh page and confirm values persisted.
- **Approval flow**
  - Approve or deny from ticket detail.
  - Confirm badge updates and status persists on refresh.
- **Internal notes**
  - Add internal note.
  - Confirm it appears in activity feed after refresh.
- **Public reply**
  - Send reply from ticket detail.
  - Confirm activity feed includes `public_reply`.
  - In default local config, expect log-only behavior (no real send).
- **Categories**
  - Go to `/categories`.
  - Create, rename, and deactivate a category.
  - Confirm category list and ticket detail dropdown behavior.

## 5) How to Avoid Breaking Production

- Always develop/test against **staging/test Smartsheet**, never live credentials.
- Keep `EMAIL_LOG_ONLY=true` until explicitly testing SMTP in controlled environment.
- Run `npm run sync:preview` before `sync:run` whenever mapping changes.
- Treat `src/integrations/smartsheet/mappers.ts` as high risk:
  - column title changes can silently remap data.
- Do not change `smartsheet_row_id` upsert behavior in `src/integrations/smartsheet/sync.ts` without a migration plan.
- When editing `GET /tickets` filters in `src/server.ts`, verify SQL params and placeholder ordering with multiple combined filters.
- Deploy order for non-trivial changes:
  1. staging deploy
  2. sync test in staging
  3. ticket lifecycle + reply checks
  4. production deploy

## 6) First Safe Tasks for a New Developer

Start with low-risk changes that teach the system.

1. Add small README/guide clarifications for setup pain points.
2. Improve error text in frontend (`frontend/src/lib/api.ts` + page error displays).
3. Add a new read-only filter to ticket list (follow maintenance runbook).
4. Add/adjust `StatusBadge` styling labels in `frontend/src/components/tickets/status-badge.tsx`.
5. Add small defensive validation in API routes without changing DB schema.
6. Add a script under `scripts/` for local diagnostics (e.g., quick row counts by status).

Before opening a PR:
- Re-run the main flow checklist above.
- Include a short test plan with exact UI/API checks performed.
