# MAINTENANCE GUIDE

Operational guide for safe changes and faster debugging.

## Folder Map

- `src/server.ts`: all API routes and request validation.
- `src/db/index.ts`: shared Postgres pool.
- `src/integrations/smartsheet/`: Smartsheet client, row mapping, and sync upsert logic.
- `src/email/sender.ts`: SMTP + log-only decision logic.
- `scripts/`: DB setup, seed scripts, sync script entry points.
- `db/schema.sql`: source-of-truth schema.
- `frontend/src/app/`: list/detail/categories pages.
- `frontend/src/lib/api.ts`: frontend API contracts and calls.

## Module Responsibilities

### Backend

- `src/server.ts`
  - `GET /tickets`, `GET /tickets/:id`, `PATCH /tickets/:id`
  - `GET/POST/PATCH /categories`
  - `GET/POST /tickets/:id/notes`
  - `POST /tickets/:id/reply`
- `src/integrations/smartsheet/mappers.ts`
  - Converts Smartsheet row text into local enum-compatible ticket fields.
- `src/integrations/smartsheet/sync.ts`
  - Upserts tickets by `smartsheet_row_id`.
- `src/email/sender.ts`
  - Prevents accidental sends by default (log-only unless explicitly configured).

### Frontend

- `frontend/src/app/page.tsx`: list filters + pagination.
- `frontend/src/app/tickets/[id]/page.tsx`: detail updates, approval actions, notes, public replies.
- `frontend/src/app/categories/page.tsx`: category create/update/deactivate.
- `frontend/src/lib/api.ts`: typed fetch wrappers and error parsing.

## Database Tables (What They Are For)

- `tickets`: primary ticket records (synced + triage fields).
- `ticket_messages`: internal notes + public replies.
- `ticket_categories`: queue-specific category catalog.
- `users`: assignable internal users and note/reply author identities.
- `ticket_audit_log`, `integration_sync_log`: reserved tables (not written by current server/sync code).

## Change Runbooks

### Add a new ticket list filter

1. Add query param parsing/validation in `GET /tickets` (`src/server.ts`).
2. Add SQL clause + param binding in the same route.
3. Add filter state and request param in `frontend/src/app/page.tsx`.
4. Add type + query serialization in `frontend/src/lib/api.ts`.
5. Verify with a direct API call and UI filter behavior.

### Change Smartsheet field mapping

1. Update mapping in `src/integrations/smartsheet/mappers.ts`.
2. Run `npm run sync:preview` and inspect mapped rows.
3. Run `npm run sync:run` against test data only.
4. Verify list/detail UI reflects expected values.

### Change ticket update behavior

1. Edit `PATCH /tickets/:id` in `src/server.ts`.
2. Keep enum checks and UUID/FK validation intact.
3. Confirm `frontend/src/lib/api.ts` payload matches server expectation.
4. Verify ticket detail page save flow in `frontend/src/app/tickets/[id]/page.tsx`.

### Change email behavior

1. Edit `src/email/sender.ts` only.
2. Test with `EMAIL_LOG_ONLY=true` first.
3. Confirm `POST /tickets/:id/reply` still stores history in `ticket_messages`.
4. Enable SMTP send only after staging verification.

## How Core Behaviors Work

- **Sync**
  - Pulls rows from Smartsheet.
  - Maps to local fields.
  - Updates existing tickets by `smartsheet_row_id`, inserts otherwise.
- **Categories**
  - Unique by `(name, queue)`.
  - Inactive categories are hidden unless requested with `include_inactive=true`.
- **Approval**
  - Stored in `tickets.approval_status`.
  - Can be changed from UI, but next Smartsheet sync may overwrite it.
- **Email mode**
  - Reply endpoint always writes a `public_reply` message.
  - Sender returns `mode=log_only` when blocked/misconfigured, `mode=smtp` when sent.

## Risky Areas (Failure Mode -> Guardrail)

- `src/integrations/smartsheet/mappers.ts`
  - **Failure mode:** renamed Smartsheet column maps to empty string/defaults.
  - **Guardrail:** run `npm run sync:preview` after every mapping change.
- `src/integrations/smartsheet/sync.ts`
  - **Failure mode:** wrong upsert key creates duplicate tickets.
  - **Guardrail:** keep `smartsheet_row_id` as the lookup key; do not change unique index.
- `src/server.ts` dynamic SQL
  - **Failure mode:** placeholder index mismatch returns wrong results or runtime SQL errors.
  - **Guardrail:** keep param push order aligned with clause order; test with multiple combined filters.
- `src/email/sender.ts`
  - **Failure mode:** unintended outbound email from dev/staging.
  - **Guardrail:** keep `EMAIL_LOG_ONLY=true` outside controlled SMTP tests.
- `frontend/src/app/tickets/[id]/page.tsx`
  - **Failure mode:** async state races hide errors or stale activity history.
  - **Guardrail:** preserve post-action refresh of notes and avoid optimistic writes unless fully tested.
