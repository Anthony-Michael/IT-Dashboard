# ARCHITECTURE OVERVIEW

## Components

- **Smartsheet:** intake and approval source.
- **Sync scripts (`scripts/smartsheet-sync*.ts`):** fetch rows and upsert local tickets.
- **API (`src/server.ts`):** ticket/category/message endpoints.
- **Postgres (`db/schema.sql`):** tickets, categories, users, message history.
- **Frontend (`frontend/src/app/*`):** operator UI.
- **Email sender (`src/email/sender.ts`):** SMTP send or log-only fallback.

## Request/Data Flow

1. Frontend calls API through `frontend/src/lib/api.ts`.
2. API validates input and executes SQL.
3. API returns JSON; frontend updates local state.

## Smartsheet -> DB -> API -> Frontend

1. Run `sync:preview` or `sync:run`.
2. Smartsheet rows are fetched via GET API call.
3. Row data is mapped by column title.
4. Tickets are upserted by `smartsheet_row_id`.
5. Frontend reads the synced records via `/tickets` endpoints.

Constraint:
- Mapping depends on Smartsheet column titles staying stable.

## Ticket Actions Flow

- **List/filter:** `GET /tickets`
- **Detail:** `GET /tickets/:id`
- **Update:** `PATCH /tickets/:id` (`ticket_status`, `approval_status`, `assignee_user_id`, `category_id`)
- **Categories:** `GET/POST/PATCH /categories`
- **Activity feed:** `GET /tickets/:id/notes`

## Email Reply Flow

1. UI sends `POST /tickets/:id/reply`.
2. API loads requester email from `tickets`.
3. `sendEmail` chooses SMTP or log-only mode.
4. Reply is always persisted in `ticket_messages` as `public_reply`.
5. UI refreshes activity feed and displays send mode result.

## Deployment Architecture

```text
Smartsheet (test/live) -> Backend API (Render) -> Postgres (Render) -> Frontend (Vercel)
```

- Keep backend and DB in same region.
- Set frontend `NEXT_PUBLIC_API_BASE_URL` to backend URL.
- Set backend `CORS_ALLOWED_ORIGINS` to frontend URL(s).

## Staging vs Production

- Use separate Smartsheet credentials and DBs.
- Staging uses test Smartsheet sheet only.
- Production uses live Smartsheet sheet only.
- Keep `EMAIL_LOG_ONLY=true` in staging by default.
- Promote only after staging sync + ticket lifecycle + reply flow validation.
