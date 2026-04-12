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
