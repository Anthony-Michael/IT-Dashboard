## Phase 1 Build Contract: Internal Ticket Dashboard

### 1) Objective
Deliver a web dashboard for 3 internal users to operate tickets from Smartsheet intake without changing the existing Smartsheet email approval/deny process.

### 2) Users (Phase 1 Only)
- `IT Coordinator`
- `Operations Manager`
- `Director of Operations`

No other dashboard users are allowed in Phase 1.

### 3) Required Scope

#### A. Smartsheet Integration
- Create dashboard ticket record immediately when a new Smartsheet submission is created.
- Set initial approval status to `Pending Approval`.
- Sync approval result from Smartsheet workflow:
  - `Approved`
  - `Denied`
- Optional write-back fields to Smartsheet (if enabled at launch):
  - owner
  - priority
  - working status
  - category

#### B. Views
Implement exactly these views:
- `Pending Approval`
- `IT Queue`
- `Operations Queue`
- `Denied Tickets`

Implement filters in list views:
- queue
- approval/working status
- assignee
- category
- priority

#### C. Ticket Operations
For approved tickets, users must be able to:
- assign/reassign owner
- set/update priority
- set/update category
- set/update working status
- move ticket between IT and Operations queues
- add internal notes
- send email reply to requester from shared support mailbox

Store full message history (inbound/outbound) on ticket.

#### D. Category Management
Dashboard users must be able to:
- create category
- edit category
- reorder category list
- deactivate/reactivate category

### 4) Ticket States

#### Approval Status (Smartsheet-controlled)
- `Pending Approval`
- `Approved`
- `Denied`

#### Working Status (Dashboard-controlled)
- `New`
- `Triage`
- `In Progress`
- `Waiting on Requester`
- `Resolved`
- `Closed`

### 5) Required State Behavior
- Every new ticket enters dashboard as `Pending Approval`.
- `Pending Approval` tickets appear only in `Pending Approval`.
- `Approved` tickets appear in active queue views (`IT Queue` or `Operations Queue`).
- `Denied` tickets appear only in `Denied Tickets`.
- Working status changes are allowed only after approval.

### 6) Minimum Ticket Data Model
Each ticket must store:
- ticket ID
- requester name/email
- subject
- description
- queue (`IT` or `Operations`)
- assignee
- priority
- category
- approval status
- working status
- created timestamp
- updated timestamp

### 7) Non-Functional Requirements
- Stack: `Next.js/React` frontend, `Node.js` backend, `PostgreSQL` database.
- App type: web only, mobile-responsive.
- Volume target: 10-15 tickets/day.
- Access control: authenticated access restricted to the 3 Phase 1 users.

### 8) Explicit Out of Scope (Do Not Build)
- Employee dashboard login or self-service portal.
- Any replacement or redesign of Smartsheet approval/deny emails.
- SLA automation/escalation engine.
- Advanced RBAC beyond 3 named internal users.
- Full migration away from Smartsheet.
- Native mobile app.

### 9) Phase 1 Acceptance Criteria
Phase 1 is complete only if all are true:
1. New Smartsheet submissions appear in dashboard automatically as `Pending Approval`.
2. Approval decisions sync and route tickets correctly (`Approved` to active queue, `Denied` to denied view only).
3. Internal users can complete triage and status updates on approved tickets.
4. Internal notes and outbound requester replies work from shared support mailbox.
5. Full ticket message history is persisted and visible.
6. Required views and filters are implemented exactly as listed above.
