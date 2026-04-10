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

// MVP shortcut: static assignee list seeded in scripts/seed-internal-users.ts.
// Keep in sync with frontend/src/app/tickets/[id]/page.tsx until a /users API exists.
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
      <div className={`flex-1 space-y-4 overflow-y-auto px-3 py-4 transition-opacity ${saving ? "opacity-60" : "opacity-100"}`}>
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

        {saving ? (
          <p className="text-xs text-slate-400">Saving...</p>
        ) : null}
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      </div>
    </div>
  );
}
