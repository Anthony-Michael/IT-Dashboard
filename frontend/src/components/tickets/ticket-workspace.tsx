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
    setNotesLoading(true);
    try {
      const refreshed = await fetchTicketNotes(ticketId);
      setNotes(refreshed);
    } catch {
      // non-fatal — composer shows its own error
    } finally {
      setNotesLoading(false);
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
