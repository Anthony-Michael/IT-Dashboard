# WEEK 1 IMPLEMENTATION SPRINT

## Objective
By end of Week 1, the following must be working:
- Smartsheet -> DB sync working (new submissions appear as tickets with `Pending Approval`).
- Basic backend API working (health, ticket list, ticket detail).
- Basic UI showing tickets from the API.

This is a vertical slice only. Do not attempt full Phase 1 completion in Week 1.

## Day 1: Foundation (Backend + DB)

### Tasks
- [ ] Initialize project structure for `frontend` and `backend` with local run scripts.  
  **Expected outcome:** Both apps start locally from one repo.
- [ ] Add `.env.example` with DB and Smartsheet variables.  
  **Expected outcome:** Required config is documented and validated at startup.
- [ ] Set up PostgreSQL connection in backend and add `GET /health`.  
  **Expected outcome:** Health endpoint confirms API + DB connectivity.
- [ ] Create initial migration for `tickets` table (minimum fields only) and status constraints.  
  **Expected outcome:** Tickets schema exists and enforces allowed approval/working statuses.
- [ ] Add `smartsheet_row_id` unique mapping field on tickets.  
  **Expected outcome:** Data model supports idempotent Smartsheet sync.

### Expected outcome
A running backend connected to PostgreSQL, with migrations and a health endpoint ready for integration work.

### Suggested AI prompts to use
- "Generate a minimal Node.js backend skeleton with PostgreSQL connection and `/health` endpoint."
- "Create SQL migration for a `tickets` table using this exact MVP field list and status constraints."
- "Review this startup config code and add strict environment variable validation with clear error messages."

## Day 2: Smartsheet Sync

### Tasks
- [ ] Implement Smartsheet client wrapper (auth + read rows from target sheet).  
  **Expected outcome:** Local command/test can fetch rows from Smartsheet.
- [ ] Implement import job: create ticket from Smartsheet row if not already mapped.  
  **Expected outcome:** New row creates one ticket with approval status `Pending Approval`.
- [ ] Implement update job: sync approval state (`Pending Approval` / `Approved` / `Denied`).  
  **Expected outcome:** Approval status changes in Smartsheet update ticket in DB.
- [ ] Add idempotency checks using `smartsheet_row_id`.  
  **Expected outcome:** Re-running sync does not duplicate tickets.
- [ ] Add sync logs (row processed, created, updated, skipped, failed).  
  **Expected outcome:** Debuggable sync behavior from logs.

### Expected outcome
Smartsheet -> DB ingestion works for new tickets and approval status updates.

### Suggested AI prompts to use
- "Write a Smartsheet client module in Node.js with retryable read operations and typed response mapping."
- "Implement idempotent upsert logic for syncing Smartsheet rows into a `tickets` table keyed by `smartsheet_row_id`."
- "Given this Smartsheet row payload, map fields into our ticket schema without adding new fields."

## Day 3: Backend API

### Tasks
- [ ] Build `GET /tickets` endpoint with filters: queue, approval_status, working_status, assignee, category, priority.  
  **Expected outcome:** API returns filtered list for all required views.
- [ ] Build `GET /tickets/:id` endpoint.  
  **Expected outcome:** Ticket detail endpoint returns full ticket data.
- [ ] Add strict query validation for filter params.  
  **Expected outcome:** Invalid filters return clear 4xx errors.
- [ ] Add basic integration tests for `/health`, `/tickets`, `/tickets/:id`.  
  **Expected outcome:** Core endpoints are regression-safe.
- [ ] Seed local DB with sample tickets covering all approval statuses for frontend use.  
  **Expected outcome:** Frontend can be built/tested without waiting on live Smartsheet.

### Expected outcome
Stable read API exists for ticket list/detail and supports the required filter model.

### Suggested AI prompts to use
- "Create an Express route for `GET /tickets` with composable SQL filters for these exact fields."
- "Add request validation middleware for ticket query params using an allowlist."
- "Generate integration tests for list/detail endpoints using a test database."

## Day 4: Basic Frontend

### Tasks
- [ ] Create Next.js app shell with nav items: `Pending Approval`, `IT Queue`, `Operations Queue`, `Denied Tickets`.  
  **Expected outcome:** User can switch between required views.
- [ ] Build ticket list page connected to `GET /tickets`.  
  **Expected outcome:** Tickets render from real backend data.
- [ ] Add filter controls (queue, approval/working status, assignee, category, priority) wired to query params.  
  **Expected outcome:** Changing filters updates the list correctly.
- [ ] Build basic ticket detail view using `GET /tickets/:id`.  
  **Expected outcome:** Clicking a ticket opens its detail.
- [ ] Make layout mobile-responsive enough for list/detail use.  
  **Expected outcome:** Core flow is usable on a narrow viewport.

### Expected outcome
A usable UI that displays synced tickets and supports required view/filter behavior.

### Suggested AI prompts to use
- "Build a simple Next.js page with tab navigation for four ticket views and URL-based state."
- "Create a reusable React filter bar that maps controls to API query parameters."
- "Review this component and simplify it for MVP readability and maintainability."

## Day 5: Integration + First End-to-End Flow

### Tasks
- [ ] Wire scheduled/manual sync trigger to run Smartsheet import + approval update.  
  **Expected outcome:** One command/job performs full inbound sync cycle.
- [ ] Validate view routing logic:
  - `Pending Approval` -> pending only
  - IT/Operations queues -> approved only + queue match
  - `Denied Tickets` -> denied only  
  **Expected outcome:** No ticket appears in the wrong view.
- [ ] Run full vertical-slice manual test: submit in Smartsheet -> appears in UI -> approval/deny reflected.  
  **Expected outcome:** End-to-end path works with live or staged Smartsheet data.
- [ ] Fix critical defects found during test pass.  
  **Expected outcome:** Demo flow is reliable.
- [ ] Record known gaps intentionally deferred to Week 2+ (triage updates, notes, replies, categories management).  
  **Expected outcome:** Clear boundary on what is done vs not done.

### Expected outcome
First working vertical slice is demo-ready: Smartsheet intake and approval status are visible in the dashboard UI through backend APIs.

### Suggested AI prompts to use
- "Create a manual sync runner command that executes import then approval update with structured logs."
- "Given these view rules, review my filtering logic and identify any cases where tickets could leak into wrong views."
- "Turn this bug list into a priority order for same-day fixes focused on demo reliability."

## End of Week Demo Definition
Demo is successful only if all are true:

1. A new Smartsheet submission creates a dashboard ticket in DB with approval status `Pending Approval`.
2. The ticket is visible in the UI under `Pending Approval`.
3. After approval status changes in Smartsheet:
   - `Approved` ticket appears in `IT Queue` or `Operations Queue` (based on queue value).
   - `Denied` ticket appears only in `Denied Tickets`.
4. `GET /tickets` and `GET /tickets/:id` are functional and used by frontend.
5. Required list filters work in the UI and call backend correctly.
6. App runs locally end-to-end with documented setup commands.

## Risks / Blockers
- **Smartsheet API auth/config issues**  
  Mitigation: validate credentials on Day 1, create a standalone Smartsheet connectivity script.
- **Unclear Smartsheet column mapping**  
  Mitigation: lock mapping document before Day 2 coding; do not infer new fields.
- **Approval status source ambiguity in Smartsheet data**  
  Mitigation: identify exact source column/workflow output early; test with real sample rows.
- **Duplicate ticket creation during sync**  
  Mitigation: enforce unique `smartsheet_row_id` and idempotent upsert logic.
- **Frontend blocked by unstable API**  
  Mitigation: freeze API response shape at start of Day 4; use seeded test data.
- **Scope creep into non-Week-1 features**  
  Mitigation: explicitly defer triage write actions, notes/replies, and write-back until after vertical slice is proven.
