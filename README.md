# IT Dashboard MVP

Internal ticket dashboard for IT + Operations teams. Smartsheet remains intake source-of-truth; this app provides triage workflows, activity history, and requester replies on top of a local Postgres copy.

## Purpose

- Centralize ticket operations in one UI.
- Keep Smartsheet intake and approval states.
- Support triage, category management, internal notes, and requester replies.

## Architecture (At a Glance)

- **Frontend:** Next.js app in `frontend/`
- **API:** Express server in `src/server.ts`
- **DB:** PostgreSQL schema in `db/schema.sql`
- **Sync:** Smartsheet pull/upsert in `src/integrations/smartsheet/`
- **Email:** SMTP or log-only sender in `src/email/sender.ts`

For deeper system flow, use `ARCHITECTURE_OVERVIEW.md`.
For change runbooks and risk guidance, use `MAINTENANCE_GUIDE.md`.

## Core Workflows

- **Smartsheet sync**
  - Run `npm run sync:preview` to inspect mappings (no DB writes).
  - Run `npm run sync:run` to upsert tickets by `smartsheet_row_id`.
  - Sync updates intake fields only (`subject`, `description`, requester fields, `approval_status`, `queue`).
- **Ticket lifecycle**
  - Approval: `pending_approval` -> `approved` or `denied`
  - Working status: `new`, `triage`, `in_progress`, `waiting_on_requester`, `resolved`, `closed`
- **Messages**
  - Internal note: `POST /tickets/:id/notes` (DB only)
  - Public reply: `POST /tickets/:id/reply` (DB + email sender)
  - Both appear in the ticket activity timeline.

## Local Development

### 1) Configure env files

- Copy `.env.example` -> `.env`
- Copy `frontend/.env.example` -> `frontend/.env.local`

### 2) Start Postgres

```bash
docker run --name it-dashboard-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=postgres \
  -p 5432:5432 \
  -d postgres:16
```

### 3) Install deps

```bash
npm install
cd frontend && npm install
```

### 4) Initialize DB + seed baseline data

```bash
npm run setup:db
```

### 5) Run services

Backend (repo root):

```bash
npm run dev
```

Frontend (`frontend/`):

```bash
npm run dev
```

Defaults:
- API: `http://localhost:3001`
- UI: `http://localhost:3000`

## Deployment Overview

- Recommended: frontend on Vercel, API + Postgres on Render.
- Keep separate staging and production env configs.
- Staging must use test Smartsheet credentials; production must use live credentials.

## Important Environment Variables

- **Backend core:** `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `CORS_ALLOWED_ORIGINS`
- **Smartsheet:** `SMARTSHEET_API_TOKEN`, `SMARTSHEET_SHEET_ID`
- **Message author fallback:** `INTERNAL_NOTE_AUTHOR_USER_ID`
- **Email:** `EMAIL_LOG_ONLY`, `EMAIL_ALLOW_SEND_IN_DEV`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- **Frontend:** `NEXT_PUBLIC_API_BASE_URL`

## Known MVP Limitations

- No auth/RBAC in API or UI.
- No inbound email ingestion/threading.
- No attachments or rich text.
- No SLA/escalation automation.
- `ticket_audit_log` and `integration_sync_log` tables are not written by current code.
- Sync is manual/script-driven (no scheduler in repo).
