# IT Dashboard MVP

Internal ticket dashboard for IT + Operations teams.  
Phase 1 scope includes ticket list/detail, triage updates, internal notes, public replies, approval status updates, category management, and Smartsheet -> local DB sync.

## What the app does

- Reads ticket intake data from Smartsheet (read-only against Smartsheet)
- Stores tickets in local PostgreSQL
- Provides internal dashboard UI for:
  - ticket list + filters + pagination
  - ticket detail and triage
  - internal notes
  - public requester replies (email + log-only fallback)
  - approval status updates
  - category management

## Project structure

- `src/` - backend API + integrations
- `scripts/` - sync and seed scripts
- `db/schema.sql` - MVP schema
- `frontend/` - Next.js App Router frontend

## Local setup

1. Copy env files:
   - backend: copy `.env.example` -> `.env`
   - frontend: copy `frontend/.env.example` -> `frontend/.env.local`
2. Install dependencies:
   - backend: `npm install`
   - frontend: `cd frontend && npm install`
3. Start PostgreSQL (Docker commands below)
4. Apply schema in your DB (`db/schema.sql`)
5. Seed baseline data (users/categories)

## Backend run steps

From repo root:

```bash
npm install
npm run dev
```

Backend default URL: `http://localhost:3001`

## Frontend run steps

From `frontend`:

```bash
npm install
npm run dev
```

Frontend default URL: `http://localhost:3000`

## Docker PostgreSQL steps

Start local Postgres:

```bash
docker run --name it-dashboard-postgres ^
  -e POSTGRES_PASSWORD=postgres ^
  -e POSTGRES_USER=postgres ^
  -e POSTGRES_DB=postgres ^
  -p 5432:5432 ^
  -d postgres:16
```

Stop/start:

```bash
docker stop it-dashboard-postgres
docker start it-dashboard-postgres
```

## Smartsheet env setup

Required backend vars:

- `SMARTSHEET_API_TOKEN`
- `SMARTSHEET_SHEET_ID`

Safety rule:

- Sync is read-only against Smartsheet (no writeback calls in current implementation).

## Email env setup

Optional email vars:

- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_LOG_ONLY` (default: `true`)
- `EMAIL_ALLOW_SEND_IN_DEV` (default: `false`)

`EMAIL_LOG_ONLY=true` behavior:

- Public replies are saved to DB
- Email payload is logged to server output
- No outbound SMTP send occurs

## Seed commands

From repo root:

```bash
npm run seed:users
npm run seed:categories
npm run seed:ticket
```

## Sync commands

From repo root:

```bash
npm run sync:preview
npm run sync:run
```

- `sync:preview` - prints column/row mapping preview (no DB writes)
- `sync:run` - reads Smartsheet rows and upserts local `tickets`

## Database migration notes

If your DB predates latest schema changes, apply notes in:

- `DB_MIGRATION_NOTES.md`

## Known MVP limitations

- No authentication/RBAC
- No inbound email handling/threading
- No attachments/rich text
- No SLA automation/escalation
- No employee-facing portal
- Smartsheet remains intake source-of-truth in Phase 1
