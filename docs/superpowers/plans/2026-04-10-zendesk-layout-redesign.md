# Zendesk-Style Layout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the IT Dashboard frontend from a two-column layout with full-page ticket navigation into a Zendesk-style two-state workspace: a ticket list view that replaces itself with a ticket workspace (properties panel + conversation thread) when a ticket is opened.

**Architecture:** `page.tsx` becomes an orchestrator holding `selectedTicketId`, filter state, and sidebar state. When no ticket is selected it renders `ViewsSidebar` + `TicketListPanel`; when a ticket is selected it renders `ViewsSidebar` + `TicketWorkspace`. The ticket workspace is a horizontal split: `PropertiesPanel` (170px, editable dropdowns that save on change) on the left and `ConversationThread` (flex, scrollable messages + pinned `ReplyComposer`) on the right.

**Tech Stack:** Next.js 15, React 18, TypeScript, Tailwind CSS. No test runner is configured — verification steps use `npm run dev` and manual browser checks.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `frontend/src/components/tickets/reply-composer.tsx` | Reply/note toggle + textarea + send button |
| Create | `frontend/src/components/tickets/conversation-thread.tsx` | Scrollable message thread + ReplyComposer pinned at bottom |
| Create | `frontend/src/components/tickets/properties-panel.tsx` | Back button + editable ticket fields (save on change) |
| Create | `frontend/src/components/tickets/ticket-workspace.tsx` | Loads ticket data, assembles PropertiesPanel + ConversationThread |
| Create | `frontend/src/components/tickets/ticket-list-panel.tsx` | Compact ticket rows + filter bar + pagination |
| Modify | `frontend/src/app/page.tsx` | Orchestrator: lifted state, two-state rendering, URL sync |
| Keep | `frontend/src/app/tickets/[id]/page.tsx` | Untouched — remains for direct URL access |
| Keep | `frontend/src/components/layout/views-sidebar.tsx` | Untouched |
| Keep | `frontend/src/components/layout/app-shell.tsx` | Untouched |
| Keep | `frontend/src/components/layout/icon-rail.tsx` | Untouched |
| Keep | `frontend/src/components/tickets/status-badge.tsx` | Untouched |
| Keep | `frontend/src/lib/api.ts` | Untouched — all needed functions already exist |

---

## Task 1: Create `ReplyComposer`

**Files:**
- Create: `frontend/src/components/tickets/reply-composer.tsx`

The standalone composer used at the bottom of the conversation thread. Has a Reply / Internal Note mode toggle, a textarea, and a send button. Calls the existing API functions `sendTicketReply` and `addTicketNote`. Calls `onSent()` after a successful send so the parent can refresh the activity feed.

- [ ] **Step 1: Create the file**

```tsx
// frontend/src/components/tickets/reply-composer.tsx
"use client";

import { useState } from "react";
import { addTicketNote, sendTicketReply } from "../../lib/api";

type Mode = "reply" | "note";

export function ReplyComposer({
  ticketId,
  onSent,
}: {
  ticketId: string;
  onSent: () => void;
}) {
  const [mode, setMode] = useState<Mode>("reply");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) return;

    setSaving(true);
    setError("");
    setStatusMsg("");

    try {
      if (mode === "reply") {
        const result = await sendTicketReply(ticketId, trimmed);
        setStatusMsg(
          result.email.mode === "smtp"
            ? "Reply sent to requester."
            : "Reply recorded (email log-only mode)."
        );
      } else {
        await addTicketNote(ticketId, trimmed);
        setStatusMsg("Note added.");
      }
      setBody("");
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-shrink-0 border-t border-slate-200 bg-white">
      <div className="flex border-b border-slate-100">
        <button
          type="button"
          onClick={() => setMode("reply")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            mode === "reply"
              ? "bg-blue-600 text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Reply
        </button>
        <button
          type="button"
          onClick={() => setMode("note")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            mode === "note"
              ? "bg-emerald-600 text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Internal Note
        </button>
      </div>

      <textarea
        className="w-full resize-none border-0 px-4 py-3 text-sm focus:outline-none"
        rows={3}
        placeholder={
          mode === "reply"
            ? "Type your reply to the requester..."
            : "Add an internal note (not visible to requester)..."
        }
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={saving}
      />

      {error ? (
        <p className="px-4 pb-1 text-xs text-rose-600">{error}</p>
      ) : statusMsg ? (
        <p className="px-4 pb-1 text-xs text-emerald-700">{statusMsg}</p>
      ) : null}

      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2">
        <span className="text-xs text-slate-400">
          {mode === "reply"
            ? "Sending from support@company.com"
            : "Internal only — not sent to requester"}
        </span>
        <button
          type="button"
          onClick={handleSend}
          disabled={saving || body.trim().length === 0}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Sending..." : mode === "reply" ? "Send Reply" : "Add Note"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Start dev server and verify the file compiles**

```bash
cd frontend && npm run dev
```

Expected: server starts, no TypeScript errors in terminal. You don't need to test ReplyComposer in isolation yet — just confirm no import errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/tickets/reply-composer.tsx
git commit -m "feat: add ReplyComposer component with reply/note toggle"
```

---

## Task 2: Create `ConversationThread`

**Files:**
- Create: `frontend/src/components/tickets/conversation-thread.tsx`

Scrollable message list with the original ticket description at the top (from `ticket.description`), then all `TicketNote[]` entries styled by type: requester messages neutral/white, public replies blue, internal notes green with lock icon. `ReplyComposer` is pinned at the bottom.

- [ ] **Step 1: Create the file**

```tsx
// frontend/src/components/tickets/conversation-thread.tsx
"use client";

import { Ticket, TicketNote } from "../../lib/api";
import { ReplyComposer } from "./reply-composer";

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ConversationThread({
  ticket,
  notes,
  loading,
  onActivityRefresh,
}: {
  ticket: Ticket;
  notes: TicketNote[];
  loading: boolean;
  onActivityRefresh: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Ticket header */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-white px-5 py-3">
        <h1 className="text-base font-semibold text-slate-900">{ticket.subject}</h1>
        <p className="text-xs text-slate-500">
          {ticket.requester_name} &bull; {ticket.requester_email}
        </p>
      </div>

      {/* Scrollable message thread */}
      <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-5 py-4">
        {/* Original request — always first */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-1 flex items-baseline gap-2">
            <span className="text-sm font-semibold text-slate-800">
              {ticket.requester_name}
            </span>
            <span className="text-xs text-slate-400">
              {formatDate(ticket.submitted_at ?? ticket.created_at)}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-slate-700">
            {ticket.description || "(No description provided)"}
          </p>
        </div>

        {/* Activity feed */}
        {loading ? (
          <p className="text-sm text-slate-500">Loading activity...</p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className={`rounded-lg border p-4 ${
                note.message_type === "public_reply"
                  ? "border-blue-200 bg-blue-50"
                  : "border-l-4 border-emerald-400 border-emerald-200 bg-emerald-50"
              }`}
            >
              <div className="mb-1 flex items-baseline gap-2">
                {note.message_type === "internal_note" ? (
                  <span className="text-xs font-semibold text-emerald-700">
                    🔒 Internal note
                  </span>
                ) : null}
                <span className="text-sm font-semibold text-slate-800">
                  {note.author_name || "Internal User"}
                </span>
                <span className="text-xs text-slate-400">
                  {formatDate(note.created_at)}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{note.body}</p>
            </div>
          ))
        )}
      </div>

      {/* Reply composer — pinned at bottom */}
      <ReplyComposer ticketId={ticket.id} onSent={onActivityRefresh} />
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Check the running `npm run dev` terminal for TypeScript errors. There should be none.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/tickets/conversation-thread.tsx
git commit -m "feat: add ConversationThread component with message feed and composer"
```

---

## Task 3: Create `PropertiesPanel`

**Files:**
- Create: `frontend/src/components/tickets/properties-panel.tsx`

Left panel in the ticket workspace. Shows a back button at the top, then editable fields: Assignee, Status, Category (each dropdown saves to the API on change — no save button). Queue and Priority are shown read-only because the `updateTicket` API client doesn't accept those fields and they are set by Smartsheet routing. Requester and Submitted date are always read-only.

- [ ] **Step 1: Create the file**

```tsx
// frontend/src/components/tickets/properties-panel.tsx
"use client";

import { useState } from "react";
import { Category, Ticket, TicketStatus, updateTicket } from "../../lib/api";

const TICKET_STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "triage", label: "Triage" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_on_requester", label: "Waiting on Requester" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const ASSIGNEE_OPTIONS = [
  { label: "Unassigned", value: "" },
  { label: "Anthony (IT)", value: "11111111-1111-4111-8111-111111111111" },
  { label: "Dee (Operations)", value: "22222222-2222-4222-8222-222222222222" },
  { label: "James (Director)", value: "33333333-3333-4333-8333-333333333333" },
];

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PropertiesPanel({
  ticket,
  categories,
  backLabel,
  onBack,
  onTicketUpdate,
}: {
  ticket: Ticket;
  categories: Category[];
  backLabel: string;
  onBack: () => void;
  onTicketUpdate: (updated: Ticket) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function patch(payload: Parameters<typeof updateTicket>[1]) {
    setSaving(true);
    setError("");
    try {
      const updated = await updateTicket(ticket.id, payload);
      onTicketUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex w-[170px] flex-shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white">
      {/* Back button */}
      <div className="flex-shrink-0 border-b border-slate-100 px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-blue-600 hover:underline"
        >
          ← {backLabel}
        </button>
      </div>

      {/* Scrollable properties */}
      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {/* Requester — read only */}
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            Requester
          </p>
          <p className="text-sm font-medium text-slate-800">
            {ticket.requester_name || "—"}
          </p>
          <p className="text-xs text-slate-500">{ticket.requester_email || "—"}</p>
        </div>

        {/* Assignee */}
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
            Assignee
          </label>
          <select
            className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-800 disabled:opacity-50"
            value={ticket.assignee_user_id || ""}
            disabled={saving}
            onChange={(e) =>
              patch({ assignee_user_id: e.target.value || null })
            }
          >
            {ASSIGNEE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
            Status
          </label>
          <select
            className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-800 disabled:opacity-50"
            value={ticket.ticket_status}
            disabled={saving}
            onChange={(e) =>
              patch({ ticket_status: e.target.value as TicketStatus })
            }
          >
            {TICKET_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Priority — read only (set by Smartsheet) */}
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            Priority
          </p>
          <p className="text-sm text-slate-700">{ticket.priority || "—"}</p>
        </div>

        {/* Queue — read only (set by Smartsheet routing) */}
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            Queue
          </p>
          <p className="text-sm text-slate-700">
            {ticket.queue === "it" ? "IT" : "Operations"}
          </p>
        </div>

        {/* Category */}
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
            Category
          </label>
          <select
            className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-800 disabled:opacity-50"
            value={ticket.category_id || ""}
            disabled={saving}
            onChange={(e) =>
              patch({ category_id: e.target.value || null })
            }
          >
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Submitted — read only */}
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            Submitted
          </p>
          <p className="text-xs text-slate-600">
            {formatDate(ticket.submitted_at ?? ticket.created_at)}
          </p>
        </div>

        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Check the running `npm run dev` terminal. No TypeScript errors expected.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/tickets/properties-panel.tsx
git commit -m "feat: add PropertiesPanel with save-on-change dropdowns"
```

---

## Task 4: Create `TicketWorkspace`

**Files:**
- Create: `frontend/src/components/tickets/ticket-workspace.tsx`

Fetches ticket data and notes in parallel when `ticketId` changes. Assembles `PropertiesPanel` + `ConversationThread` side by side. Passes `onTicketUpdate` to `PropertiesPanel` so local ticket state stays in sync when dropdowns save. Passes `onActivityRefresh` to `ConversationThread` so notes reload after a send.

- [ ] **Step 1: Create the file**

```tsx
// frontend/src/components/tickets/ticket-workspace.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Category,
  fetchTicketById,
  fetchTicketNotes,
  Ticket,
  TicketNote,
} from "../../lib/api";
import { PropertiesPanel } from "./properties-panel";
import { ConversationThread } from "./conversation-thread";

export function TicketWorkspace({
  ticketId,
  categories,
  backLabel,
  onBack,
}: {
  ticketId: string;
  categories: Category[];
  backLabel: string;
  onBack: () => void;
}) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotesLoading(true);
    setError("");
    setTicket(null);
    setNotes([]);

    Promise.all([fetchTicketById(ticketId), fetchTicketNotes(ticketId)])
      .then(([ticketData, notesData]) => {
        if (!active) return;
        setTicket(ticketData);
        setNotes(notesData);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load ticket");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setNotesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [ticketId]);

  async function refreshNotes() {
    try {
      const refreshed = await fetchTicketNotes(ticketId);
      setNotes(refreshed);
    } catch {
      // non-fatal — composer shows its own error
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
        Loading ticket...
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-sm text-rose-600">{error || "Ticket not found."}</p>
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-blue-600 hover:underline"
        >
          ← {backLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <PropertiesPanel
        ticket={ticket}
        categories={categories}
        backLabel={backLabel}
        onBack={onBack}
        onTicketUpdate={setTicket}
      />
      <ConversationThread
        ticket={ticket}
        notes={notes}
        loading={notesLoading}
        onActivityRefresh={refreshNotes}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Check the running `npm run dev` terminal for errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/tickets/ticket-workspace.tsx
git commit -m "feat: add TicketWorkspace — assembles properties panel and conversation thread"
```

---

## Task 5: Create `TicketListPanel`

**Files:**
- Create: `frontend/src/components/tickets/ticket-list-panel.tsx`

Extracts the ticket list, filter bar, and pagination from the current `page.tsx`. Receives filter state and `activeSidebarItem` as props (filter state lives in `page.tsx` so it survives navigation to/from a ticket). Each ticket row is a button that calls `onTicketSelect` instead of navigating to `/tickets/[id]`.

The `Filters` type is exported from this file and imported by `page.tsx`.

- [ ] **Step 1: Create the file**

```tsx
// frontend/src/components/tickets/ticket-list-panel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApprovalStatus,
  Category,
  fetchTickets,
  Queue,
  Ticket,
  TicketStatus,
} from "../../lib/api";
import { SidebarItemId } from "../layout/views-sidebar";

const PAGE_SIZE = 10;
const CURRENT_USER = "Anthony";
const CURRENT_USER_ID = "11111111-1111-4111-8111-111111111111";

export type Filters = {
  approval_status: ApprovalStatus | "";
  queue: Queue | "";
  ticket_status: TicketStatus | "";
  category_id: string | "";
};

function isAssignedToCurrentUser(ticket: Ticket): boolean {
  const name = (ticket.assignee_name || "").trim().toLowerCase();
  if (name && name === CURRENT_USER.toLowerCase()) return true;
  return ticket.assignee_user_id === CURRENT_USER_ID;
}

function formatTimeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function priorityClass(priority: string): string {
  const p = (priority || "").toLowerCase();
  if (p === "high") return "bg-rose-100 text-rose-700";
  if (p === "medium" || p === "med") return "bg-amber-100 text-amber-700";
  if (p === "low") return "bg-green-100 text-green-700";
  return "bg-slate-100 text-slate-600";
}

function getSidebarLabel(
  activeItem: SidebarItemId | null,
  filters: Filters
): string {
  if (activeItem === "all_tickets") return "All Tickets";
  if (activeItem === "my_tickets") return "My Tickets";
  if (activeItem === "unassigned") return "Unassigned";
  if (activeItem === "pending_approval") return "Pending Approval";
  if (activeItem === "queue_it") return "IT Queue";
  if (activeItem === "queue_operations") return "Operations Queue";
  if (activeItem === "status_new") return "New";
  if (activeItem === "status_in_progress") return "In Progress";
  if (activeItem === "status_waiting_on_requester") return "Waiting on Requester";
  if (activeItem === "status_resolved") return "Resolved";
  if (filters.queue === "it") return "IT Queue";
  if (filters.queue === "operations") return "Operations Queue";
  return "Tickets";
}

export function TicketListPanel({
  filters,
  activeSidebarItem,
  categories,
  onTicketSelect,
  onFilterChange,
}: {
  filters: Filters;
  activeSidebarItem: SidebarItemId | null;
  categories: Category[];
  onTicketSelect: (ticketId: string, backLabel: string) => void;
  onFilterChange: (key: keyof Filters, value: Filters[keyof Filters]) => void;
}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    fetchTickets({ ...filters, page, limit: PAGE_SIZE })
      .then((result) => {
        if (!active) return;
        setTickets(result.data);
        setTotal(result.total);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load tickets");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters, page, refreshKey]);

  const displayedTickets = useMemo(() => {
    if (activeSidebarItem === "my_tickets")
      return tickets.filter(isAssignedToCurrentUser);
    if (activeSidebarItem === "unassigned")
      return tickets.filter((t) => !t.assignee_user_id);
    return tickets;
  }, [activeSidebarItem, tickets]);

  const isClientSideView =
    activeSidebarItem === "unassigned" || activeSidebarItem === "my_tickets";
  const displayedTotal = isClientSideView ? displayedTickets.length : total;
  const totalPages = isClientSideView
    ? 1
    : Math.max(1, Math.ceil(total / PAGE_SIZE));

  function handleFilterChange(
    key: keyof Filters,
    value: Filters[keyof Filters]
  ) {
    setPage(1);
    onFilterChange(key, value);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Filter bar */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <label className="text-xs">
            <span className="mb-1 block text-slate-600">Approval Status</span>
            <select
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
              value={filters.approval_status}
              onChange={(e) =>
                handleFilterChange(
                  "approval_status",
                  e.target.value as Filters["approval_status"]
                )
              }
            >
              <option value="">All</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
            </select>
          </label>

          <label className="text-xs">
            <span className="mb-1 block text-slate-600">Queue</span>
            <select
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
              value={filters.queue}
              onChange={(e) =>
                handleFilterChange(
                  "queue",
                  e.target.value as Filters["queue"]
                )
              }
            >
              <option value="">All</option>
              <option value="it">IT</option>
              <option value="operations">Operations</option>
            </select>
          </label>

          <label className="text-xs">
            <span className="mb-1 block text-slate-600">Ticket Status</span>
            <select
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
              value={filters.ticket_status}
              onChange={(e) =>
                handleFilterChange(
                  "ticket_status",
                  e.target.value as Filters["ticket_status"]
                )
              }
            >
              <option value="">All</option>
              <option value="new">New</option>
              <option value="triage">Triage</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_on_requester">Waiting on Requester</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </label>

          <label className="text-xs">
            <span className="mb-1 block text-slate-600">Category</span>
            <select
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
              value={filters.category_id}
              onChange={(e) =>
                handleFilterChange("category_id", e.target.value)
              }
            >
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Ticket rows */}
      <div className="flex-1 overflow-y-auto">
        {error ? (
          <div className="m-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <p className="mb-2">{error}</p>
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="rounded border border-rose-300 bg-white px-3 py-1 text-xs text-rose-700"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <p className="p-4 text-sm text-slate-500">Loading tickets...</p>
        ) : displayedTickets.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">
            {activeSidebarItem === "my_tickets"
              ? `No tickets assigned to ${CURRENT_USER}.`
              : "No tickets found."}
          </p>
        ) : (
          displayedTickets.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              onClick={() =>
                onTicketSelect(
                  ticket.id,
                  getSidebarLabel(activeSidebarItem, filters)
                )
              }
              className="w-full border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900 leading-snug">
                  {ticket.subject}
                </span>
                <span className="flex-shrink-0 text-xs text-slate-400">
                  {formatTimeAgo(ticket.created_at)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {ticket.requester_name}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {ticket.priority ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityClass(ticket.priority)}`}
                  >
                    {ticket.priority}
                  </span>
                ) : null}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {ticket.ticket_status.replaceAll("_", " ")}
                </span>
                {ticket.assignee_name ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {ticket.assignee_name}
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                    Unassigned
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Pagination */}
      {!isClientSideView && totalPages > 1 ? (
        <div className="flex flex-shrink-0 items-center justify-between border-t border-slate-200 bg-white px-4 py-2">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages} ({displayedTotal} total)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded border border-slate-300 px-3 py-1 text-xs disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-slate-300 px-3 py-1 text-xs disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Check `npm run dev` terminal. No TypeScript errors expected.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/tickets/ticket-list-panel.tsx
git commit -m "feat: add TicketListPanel extracted from page.tsx"
```

---

## Task 6: Refactor `page.tsx`

**Files:**
- Modify: `frontend/src/app/page.tsx`

Replace the entire contents of `page.tsx` with the orchestrator. This is a full rewrite — the old code is superseded by `TicketListPanel`. Key responsibilities: load categories once on mount (shared by list and workspace), hold `filters`, `activeSidebarItem`, and `selectedTicketId` in state, apply sidebar selections to filters, pass `onTicketSelect` and `onBack` to the panels, update the URL with `router.replace` when entering/leaving a ticket.

The `h-screen overflow-hidden` on the content div gives the workspace a fixed height so the conversation thread can scroll internally while the reply composer stays pinned.

- [ ] **Step 1: Replace `page.tsx` with the orchestrator**

```tsx
// frontend/src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Category, fetchCategories } from "../lib/api";
import { AppShell } from "../components/layout/app-shell";
import { SidebarItemId, ViewsSidebar } from "../components/layout/views-sidebar";
import { Filters, TicketListPanel } from "../components/tickets/ticket-list-panel";
import { TicketWorkspace } from "../components/tickets/ticket-workspace";

const initialFilters: Filters = {
  approval_status: "",
  queue: "",
  ticket_status: "",
  category_id: "",
};

function filtersForSidebarItem(itemId: SidebarItemId): Filters {
  const next: Filters = {
    approval_status: "",
    queue: "",
    ticket_status: "",
    category_id: "",
  };
  if (itemId === "pending_approval") next.approval_status = "pending_approval";
  else if (itemId === "queue_it") next.queue = "it";
  else if (itemId === "queue_operations") next.queue = "operations";
  else if (itemId === "status_new") next.ticket_status = "new";
  else if (itemId === "status_in_progress") next.ticket_status = "in_progress";
  else if (itemId === "status_waiting_on_requester")
    next.ticket_status = "waiting_on_requester";
  else if (itemId === "status_resolved") next.ticket_status = "resolved";
  return next;
}

export default function TicketsPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [activeSidebarItem, setActiveSidebarItem] =
    useState<SidebarItemId | null>("all_tickets");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [backLabel, setBackLabel] = useState("Tickets");

  useEffect(() => {
    let active = true;
    fetchCategories()
      .then((data) => {
        if (active) setCategories(data);
      })
      .catch(() => {
        if (active) setCategories([]);
      });
    return () => {
      active = false;
    };
  }, []);

  function handleSidebarSelect(itemId: SidebarItemId) {
    setActiveSidebarItem(itemId);
    setFilters(filtersForSidebarItem(itemId));
  }

  function handleFilterChange(
    key: keyof Filters,
    value: Filters[keyof Filters]
  ) {
    setActiveSidebarItem(null);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleTicketSelect(ticketId: string, label: string) {
    setSelectedTicketId(ticketId);
    setBackLabel(label);
    router.replace(`/?ticket=${ticketId}`, { scroll: false });
  }

  function handleBack() {
    setSelectedTicketId(null);
    router.replace("/", { scroll: false });
  }

  return (
    <AppShell>
      <div className="flex h-screen overflow-hidden">
        {/* Views sidebar */}
        <aside className="hidden w-[220px] flex-shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-3 lg:block">
          <ViewsSidebar
            activeItem={activeSidebarItem}
            onSelect={handleSidebarSelect}
          />
        </aside>

        {/* Main content area — list or workspace */}
        <div className="flex flex-1 overflow-hidden">
          {selectedTicketId ? (
            <TicketWorkspace
              ticketId={selectedTicketId}
              categories={categories}
              backLabel={backLabel}
              onBack={handleBack}
            />
          ) : (
            <TicketListPanel
              filters={filters}
              activeSidebarItem={activeSidebarItem}
              categories={categories}
              onTicketSelect={handleTicketSelect}
              onFilterChange={handleFilterChange}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Verify the rewrite compiles and runs**

The `npm run dev` terminal should show no TypeScript errors. Open http://localhost:3000 in a browser and confirm:
- The three-column layout renders (icon rail, views sidebar, ticket list)
- Clicking a sidebar item (e.g., "IT Queue") updates the ticket list
- The filter bar dropdowns update the list

- [ ] **Step 3: Verify ticket workspace**

Click any ticket row. Confirm:
- The ticket list is replaced by the workspace (properties panel on left, conversation on right)
- The ticket subject and requester appear in the conversation header
- The original description appears as the first message
- Any existing notes/replies appear below in the correct color (blue for replies, green for internal notes)
- The Reply / Internal Note toggle works
- The "← [Queue Name]" back button returns to the ticket list with filters intact

- [ ] **Step 4: Verify property saves**

With a ticket open:
- Change the Assignee dropdown — confirm no console error and the dropdown retains the new value
- Change the Status dropdown — same check
- Change the Category dropdown — same check

- [ ] **Step 5: Verify reply and note send**

With a ticket open:
- Switch to "Internal Note" mode, type a note, click "Add Note"
- Confirm the note appears in the thread above the composer
- Switch to "Reply" mode, type a reply, click "Send Reply"
- Confirm the reply appears in the thread

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "refactor: rebuild page.tsx as Zendesk-style two-state workspace orchestrator"
```

---

## Task 7: Final cleanup and verification

**Files:**
- No code changes — verification and wrap-up commit

- [ ] **Step 1: Check the existing ticket detail page still works**

Navigate directly to `/tickets/<any-valid-id>` in the browser. Confirm the existing full-page ticket detail view (`frontend/src/app/tickets/[id]/page.tsx`) still loads correctly. This page is untouched and serves as the fallback for direct URL access.

- [ ] **Step 2: Check the categories page still works**

Navigate to `/categories`. Confirm it loads and is unaffected.

- [ ] **Step 3: Check mobile layout**

Resize the browser window to a narrow viewport (< 1024px). Confirm:
- The views sidebar hides (`lg:block` means it's hidden below the `lg` breakpoint)
- The ticket list and workspace still render and are usable

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: Zendesk layout redesign Phase 1 complete"
```

---

## Implementation Notes

- **`submitted_at` field:** The `Ticket` type in `api.ts` has a duplicate `submitted_at` declaration (a pre-existing bug). Both refer to the same field. Use `ticket.submitted_at ?? ticket.created_at` throughout.
- **Priority field:** Priority values come from Smartsheet as strings (e.g. "High", "Medium", "Low"). They are not a controlled enum, so they're displayed as text rather than through `StatusBadge`.
- **Queue updates:** The `updateTicket` API client does not accept a `queue` field. Queue is set by Smartsheet routing and is shown read-only in `PropertiesPanel`. This is intentional for Phase 1.
- **No Suspense for URL params:** `useSearchParams` requires a Suspense boundary in Next.js 13+. To avoid that complexity, this plan does not restore selected ticket from URL on mount. The URL is still updated on navigate (browser back works), but a hard refresh on `/?ticket=<id>` will show the list view.
