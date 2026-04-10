# Zendesk-Style Layout Redesign — Phase 1

**Date:** 2026-04-10  
**Status:** Approved  
**Scope:** Frontend layout restructure only. No backend changes, no schema changes, no email threading.

---

## Problem

The current dashboard uses a two-column layout (views sidebar + ticket list) where clicking a ticket navigates to a separate full-page route (`/tickets/[id]`). This makes triage slow — you lose your queue context every time you open a ticket, and there's no quick way to switch between tickets. The goal is a Zendesk-like workspace where the queue and ticket are part of one coherent flow.

---

## What We're Building

A two-state navigation model that mirrors Zendesk's core UX:

- **State 1 (List View):** Browse and filter tickets in the queue.
- **State 2 (Ticket Workspace):** Click a ticket → the list is replaced by the full ticket workspace. A back button returns to the list.

---

## Layout Architecture

### Persistent Shell

A narrow **icon rail** (44px) sits on the far left at all times, providing top-level navigation (Tickets, Categories). This replaces the current top-nav-only shell.

### State 1 — List View

```
[ Icon Rail (44px) | Views Sidebar (160px) | Ticket List (flex) ]
```

- **Icon rail:** Icon buttons for Tickets and Categories. Active section highlighted.
- **Views sidebar:** Grouped navigation — Views (All, My Tickets, Unassigned), Queues (IT Queue with count badge, Operations with count badge), Status shortcuts (Pending Approval, In Progress, Waiting on Requester, Resolved, Denied).
- **Ticket list:** Compact rows showing subject, requester name, priority badge, status badge, assignee badge, time ago. Clicking a row transitions to State 2.

### State 2 — Ticket Workspace

```
[ Icon Rail (44px) | Properties Panel (170px) | Conversation Thread (flex) ]
```

The views sidebar and ticket list are **replaced** entirely by the ticket workspace.

- **Properties panel (left):** "← Back to [Queue Name]" link at top. Editable fields below: Requester (read-only name + email), Assignee (dropdown), Status (dropdown), Priority (dropdown), Queue (dropdown), Category (dropdown), Submitted date (read-only). Each dropdown saves on change via existing `PATCH /tickets/:id`.
- **Conversation thread (center):** Ticket subject + requester info in header. Chronological message thread below — requester messages (white), agent replies (blue tint), internal notes (green tint with lock icon). Reply composer pinned to bottom.
- **Reply composer:** Toggle between "Reply" (sends email to requester via `POST /tickets/:id/reply`) and "Internal Note" (saves to DB via `POST /tickets/:id/notes`). Send button + "Sending from support@company.com" label in footer.

---

## Navigation Behavior

- Clicking a ticket row in State 1 sets `selectedTicketId` in component state and transitions to State 2. No page navigation — this is a state change within the same page.
- The URL updates to `/tickets/[id]` using `router.push` (or `router.replace`) so deep links and browser back still work.
- The "← Back to [Queue Name]" link clears `selectedTicketId` and returns to State 1, restoring the previous view/filter context.
- The existing `/tickets/[id]` page route remains intact for direct URL access but is no longer the primary path into a ticket.

---

## Components

### New / Heavily Modified

| Component | Location | Purpose |
|---|---|---|
| `AppShell` | `components/layout/app-shell.tsx` | Add icon rail, restructure shell |
| `IconRail` | `components/layout/icon-rail.tsx` | Already exists — wire to navigation |
| `ViewsSidebar` | `components/layout/views-sidebar.tsx` | Already exists — minor style updates |
| `TicketListPanel` | `components/tickets/ticket-list-panel.tsx` | Extract ticket list from `page.tsx` into its own component |
| `TicketWorkspace` | `components/tickets/ticket-workspace.tsx` | New — wraps PropertiesPanel + ConversationThread |
| `PropertiesPanel` | `components/tickets/properties-panel.tsx` | New — left column of State 2, editable dropdowns |
| `ConversationThread` | `components/tickets/conversation-thread.tsx` | New — message list + reply composer |
| `ReplyComposer` | `components/tickets/reply-composer.tsx` | New — reply/note toggle + send |

### Unchanged

- `StatusBadge` — reused as-is
- All backend API routes — no changes
- Database schema — no changes
- Smartsheet sync — no changes

---

## Data Flow

State 2 loads two things when a ticket is selected:

1. `GET /tickets/:id` — ticket metadata (subject, requester, assignee, status, priority, queue, category, submitted_at)
2. `GET /tickets/:id/notes` — combined activity feed (notes + replies, already returned together)

Both calls are made in parallel when `selectedTicketId` is set. Loading state shown in the conversation area while fetching.

Property changes (assignee, status, priority, queue, category) call `PATCH /tickets/:id` immediately on dropdown change. No save button — same pattern as current ticket detail page.

After sending a reply or note, the activity feed is refreshed by re-fetching `GET /tickets/:id/notes`.

---

## Page Structure Change

Current `frontend/src/app/page.tsx` is a large single-file component (~300 lines) that handles filtering, pagination, list rendering, and sidebar. This redesign splits it:

- `page.tsx` — orchestrator only. Holds `selectedTicketId`, active sidebar view, and filter state. Renders `<ViewsSidebar>` + either `<TicketListPanel>` or `<TicketWorkspace>` based on `selectedTicketId`.
- `TicketListPanel` — receives filter state and callbacks as props. Owns pagination and ticket row rendering.
- `TicketWorkspace` — owns ticket data fetching, property editing, conversation.

**Why filter state lives in `page.tsx`:** `TicketListPanel` is conditionally rendered (hidden during State 2). If filter state lived inside it, navigating into a ticket and back would reset all filters. Lifting filter state to the orchestrator keeps it alive across the State 1 → State 2 → State 1 round trip.

---

## Out of Scope (Phase 1)

- Inbound email threading (requester replies appearing in the ticket) — Phase 2
- Real authentication / login — Phase 3
- Auto-routing rules — Phase 4
- Mobile layout changes beyond what the restructure naturally provides
- Any new backend endpoints
