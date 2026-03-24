# PHASE 1 TASK BREAKDOWN

## Principles
- Keep MVP scope strict.
- Do not introduce new features.
- Optimize for a small internal system (3 users, 10-15 tickets/day).
- Keep implementation simple and reliable.

## Epics and Tasks

### 1) Project Setup
Set up a minimal, production-usable baseline for Next.js, Node.js, and PostgreSQL.

- [ ] Initialize monorepo/app structure for frontend and backend (or single repo with clear folders).  
  **Expected outcome:** Buildable project with `frontend` and `backend` directories and working local start scripts.
- [ ] Configure environment variables for DB, Smartsheet credentials, and shared support mailbox settings.  
  **Expected outcome:** `.env.example` exists and app fails clearly when required vars are missing.
- [ ] Add database connection setup and health-check endpoint in backend.  
  **Expected outcome:** `GET /health` returns app and DB connection status.
- [ ] Add basic auth gate for 3 internal users (hardcoded allowlist for Phase 1).  
  **Expected outcome:** Only `IT Coordinator`, `Operations Manager`, `Director of Operations` accounts can access app routes.

### 2) Database
Implement only schema required by `MVP_SCOPE.md`.

- [ ] Create `tickets` table with minimum required fields and timestamps.  
  **Expected outcome:** DB migration creates all required ticket columns and indexes on queue/status fields.
- [ ] Create `categories` table with active flag and sort order.  
  **Expected outcome:** Categories can be created, reordered, and deactivated/reactivated.
- [ ] Create `ticket_notes` table for internal notes.  
  **Expected outcome:** Notes can be stored and retrieved per ticket.
- [ ] Create `ticket_messages` table for inbound/outbound communication history.  
  **Expected outcome:** Full message history persists with sender metadata and direction.
- [ ] Add enums or constrained values for approval and working status.  
  **Expected outcome:** Only allowed states can be saved.

### 3) Smartsheet Integration
Ingest submissions and approval outcomes from Smartsheet into dashboard tickets.

- [ ] Implement Smartsheet client wrapper with auth and error handling.  
  **Expected outcome:** Backend can read target Smartsheet rows in local test call.
- [ ] Implement ticket import job to create ticket record on new Smartsheet submission.  
  **Expected outcome:** New Smartsheet row creates dashboard ticket with approval status `Pending Approval`.
- [ ] Implement approval status sync job from Smartsheet fields/workflow output.  
  **Expected outcome:** Ticket approval status updates to `Approved` or `Denied` when source changes.
- [ ] Add idempotency logic for imports and updates using Smartsheet row ID mapping.  
  **Expected outcome:** Re-running sync does not create duplicate tickets.
- [ ] Add sync logging for success/failure events.  
  **Expected outcome:** Developers can trace ingest/update failures from logs.

### 4) Backend API
Expose only endpoints needed for Phase 1 UI and actions.

- [ ] Build ticket list endpoint with filters: queue, status, assignee, category, priority, approval status.  
  **Expected outcome:** API returns filtered tickets for all required views.
- [ ] Build ticket detail endpoint including notes and message history.  
  **Expected outcome:** UI can load full ticket context from one request.
- [ ] Build ticket update endpoint for assignee, queue, priority, category, and working status.  
  **Expected outcome:** Approved tickets can be triaged via API with validation.
- [ ] Enforce state rule: working status changes blocked unless approval status is `Approved`.  
  **Expected outcome:** API rejects invalid status update attempts with clear error response.
- [ ] Build category CRUD + reorder endpoints.  
  **Expected outcome:** Categories are manageable in-app per MVP requirements.

### 5) Frontend (Core UI)
Deliver core shell and ticket list/detail experience.

- [ ] Create app layout with navigation for `Pending Approval`, `IT Queue`, `Operations Queue`, `Denied Tickets`.  
  **Expected outcome:** User can switch between all required views.
- [ ] Build ticket table/list component with shared filter bar.  
  **Expected outcome:** Filters update list results using backend query params.
- [ ] Build ticket detail panel/page showing required fields and full history sections.  
  **Expected outcome:** User can view ticket metadata, notes, and message history together.
- [ ] Implement responsive layout for desktop and mobile widths.  
  **Expected outcome:** Core list/detail actions remain usable on small screens.

### 6) Triage Features
Implement day-to-day queue management operations.

- [ ] Add assignee update UI and API wiring.  
  **Expected outcome:** User can assign/reassign ticket owner.
- [ ] Add priority update UI and API wiring.  
  **Expected outcome:** User can set/update ticket priority.
- [ ] Add category update UI and API wiring.  
  **Expected outcome:** User can set/update ticket category.
- [ ] Add working status update UI and API wiring.  
  **Expected outcome:** User can move approved tickets through working statuses.
- [ ] Add queue move control between IT and Operations.  
  **Expected outcome:** Ticket can be moved to correct queue and appears in the correct view.

### 7) Communication (Internal Notes + Email Replies)
Support internal collaboration and employee reply workflow from dashboard.

- [ ] Implement internal note creation endpoint and UI.  
  **Expected outcome:** Users can add notes that remain internal-only.
- [ ] Implement outbound email service using shared support mailbox credentials.  
  **Expected outcome:** Reply API sends email to requester successfully.
- [ ] Build reply composer in ticket detail view.  
  **Expected outcome:** User can draft/send email reply from ticket context.
- [ ] Persist outbound email in `ticket_messages` with sender identity and timestamp.  
  **Expected outcome:** Sent replies appear in ticket message history.
- [ ] Add optional sender attribution in reply signature (toggle/config value).  
  **Expected outcome:** Emails can include sender name while still sending from shared support mailbox.

### 8) Sync Back to Smartsheet
Implement limited, optional write-back only for approved fields.

- [ ] Add backend setting flag to enable/disable Smartsheet write-back.  
  **Expected outcome:** Write-back behavior can be turned on/off without code changes.
- [ ] Implement write-back mapping for `owner`, `priority`, `working status`, `category`.  
  **Expected outcome:** Dashboard updates propagate to mapped Smartsheet columns.
- [ ] Add retry and error logging for write-back failures.  
  **Expected outcome:** Failed writes are visible and retried safely.
- [ ] Prevent write-back of fields outside approved list.  
  **Expected outcome:** No accidental schema drift or out-of-scope sync.

### 9) Views & Filtering
Finalize view behavior and visibility rules.

- [ ] Implement query logic for `Pending Approval` view (`approval_status = Pending Approval`).  
  **Expected outcome:** Only pending tickets appear in this view.
- [ ] Implement query logic for active queue views (`approval_status = Approved` + queue filter).  
  **Expected outcome:** IT/Operations views show approved tickets only.
- [ ] Implement query logic for denied view (`approval_status = Denied`).  
  **Expected outcome:** Denied tickets are visible for audit/history and excluded from active queues.
- [ ] Validate combined filters across all views.  
  **Expected outcome:** Queue/status/assignee/category/priority filters work consistently.

### 10) Deployment & QA
Prepare minimal production deployment and execute manual validation.

- [ ] Create production environment config and secrets checklist.  
  **Expected outcome:** Deployment has all required environment values documented.
- [ ] Configure database migrations to run in deploy pipeline/startup.  
  **Expected outcome:** Schema applies consistently across environments.
- [ ] Run full manual QA checklist (see section below) and log issues.  
  **Expected outcome:** MVP behavior validated against scope before release.
- [ ] Fix critical/blocking defects found in QA.  
  **Expected outcome:** All Phase 1 acceptance criteria pass.

## Execution Order
Implement in this exact order:

1. Project Setup  
2. Database  
3. Smartsheet Integration (read/sync in)  
4. Backend API  
5. Frontend (Core UI)  
6. Views & Filtering  
7. Triage Features  
8. Communication (Internal Notes + Email Replies)  
9. Sync Back to Smartsheet  
10. Deployment & QA

Dependencies:
- Database must be complete before API and sync jobs.
- Smartsheet ingest must exist before meaningful frontend ticket testing.
- Backend API must be stable before frontend wiring.
- Views/filtering depends on ticket list API and status model.
- Triage and communication depend on ticket detail/update APIs.
- Write-back depends on triage update flows and Smartsheet client.
- QA runs after all MVP features are integrated.

## Definition of Done (MVP)
Phase 1 is done only when all conditions are met:

- New Smartsheet submissions create dashboard tickets automatically with approval status `Pending Approval`.
- Approval outcomes sync to dashboard and correctly route visibility:
  - `Approved` -> `IT Queue` or `Operations Queue`
  - `Denied` -> `Denied Tickets` only
- Internal users can assign owner, update priority/category/queue, and update working status on approved tickets.
- Category list can be created, edited, reordered, deactivated/reactivated in dashboard.
- Internal notes can be added and viewed per ticket.
- Email replies send from shared support mailbox and are stored in ticket message history with sender identity.
- Required views and filters function as defined in `MVP_SCOPE.md`.
- Access is restricted to the 3 Phase 1 internal users.

## QA Checklist
Manual test checklist for Phase 1 validation:

1. Submit a new ticket through existing Smartsheet process.
2. Confirm ticket appears in dashboard without manual action.
3. Confirm initial approval status is `Pending Approval`.
4. Confirm ticket appears in `Pending Approval` view and not in active queues.
5. Trigger Smartsheet approval and confirm dashboard updates to `Approved`.
6. Confirm approved ticket appears in correct active queue (`IT` or `Operations`).
7. Trigger Smartsheet denial for another ticket and confirm dashboard updates to `Denied`.
8. Confirm denied ticket appears only in `Denied Tickets` and not in active queues.
9. Open an approved ticket and assign/reassign owner.
10. Change priority and confirm list/detail reflect updated value.
11. Change category and confirm list/detail reflect updated value.
12. Move queue between IT and Operations and confirm ticket moves views correctly.
13. Attempt working status update before approval (negative test); confirm API/UI blocks action.
14. Update working status on approved ticket through all needed transitions.
15. Add internal note and confirm it is saved and visible on reload.
16. Send reply to requester from ticket; confirm outbound email is sent from shared support email.
17. Confirm outbound message is stored in ticket history with sender identity and timestamp.
18. If write-back enabled: update owner/priority/status/category and confirm mapped fields sync to Smartsheet.
19. Apply filters (queue, status, assignee, category, priority) and confirm expected ticket subsets.
20. Validate same core flows on mobile-responsive viewport.
