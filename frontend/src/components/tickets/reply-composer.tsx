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
