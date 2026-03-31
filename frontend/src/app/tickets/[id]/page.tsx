"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  addTicketNote,
  ApprovalStatus,
  Category,
  fetchCategories,
  fetchTicketById,
  fetchTicketNotes,
  sendTicketReply,
  Ticket,
  TicketNote,
  TicketStatus,
  updateTicket,
  updateTicketApproval
} from "../../../lib/api";
import { StatusBadge } from "../../../components/tickets/status-badge";
import { AppShell } from "../../../components/layout/app-shell";

const TICKET_STATUS_OPTIONS: TicketStatus[] = [
  "new",
  "triage",
  "in_progress",
  "waiting_on_requester",
  "resolved",
  "closed"
];

const ASSIGNEE_OPTIONS = [
  // MVP shortcut: static assignee list seeded in scripts/seed-internal-users.ts.
  { label: "Unassigned", value: "" },
  { label: "Tyler (IT)", value: "11111111-1111-4111-8111-111111111111" },
  { label: "Dee (Operations)", value: "22222222-2222-4222-8222-222222222222" },
  { label: "James (Director)", value: "33333333-3333-4333-8333-333333333333" }
];

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params?.id;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [ticketStatus, setTicketStatus] = useState<TicketStatus>("new");
  const [assigneeUserId, setAssigneeUserId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [newNoteBody, setNewNoteBody] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replySaving, setReplySaving] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [approvalSaving, setApprovalSaving] = useState(false);

  useEffect(() => {
    if (!ticketId) return;
    let active = true;

    async function loadTicket() {
      setLoading(true);
      setError("");
      setSaveMessage("");
      setReplyMessage("");
      setNotesLoading(true);

      try {
        const [data, noteData, categoryData] = await Promise.all([
          fetchTicketById(ticketId),
          fetchTicketNotes(ticketId),
          fetchCategories()
        ]);
        if (!active) return;
        setTicket(data);
        setTicketStatus(data.ticket_status);
        setAssigneeUserId(data.assignee_user_id || "");
        setCategoryId(data.category_id || "");
        setNotes(noteData);
        setCategories(categoryData);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load ticket");
      } finally {
        if (active) {
          setLoading(false);
          setNotesLoading(false);
        }
      }
    }

    loadTicket();
    return () => {
      active = false;
    };
  }, [ticketId]);

  async function handleSave() {
    if (!ticketId) return;

    setSaving(true);
    setError("");
    setSaveMessage("");
    setReplyMessage("");

    try {
      const updated = await updateTicket(ticketId, {
        ticket_status: ticketStatus,
        assignee_user_id: assigneeUserId || null,
        category_id: categoryId || null
      });
      setTicket(updated);
      setTicketStatus(updated.ticket_status);
      setAssigneeUserId(updated.assignee_user_id || "");
      setCategoryId(updated.category_id || "");
      setSaveMessage("Ticket updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update ticket");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendReply() {
    if (!ticketId) return;
    const trimmedBody = replyBody.trim();
    if (!trimmedBody) return;

    setReplySaving(true);
    setError("");
    setSaveMessage("");
    setReplyMessage("");

    try {
      const result = await sendTicketReply(ticketId, trimmedBody);
      // Re-read notes instead of optimistic append to keep ordering/source-of-truth from API.
      const refreshedNotes = await fetchTicketNotes(ticketId);
      setNotes(refreshedNotes);
      setReplyBody("");
      setReplyMessage(
        result.email.mode === "smtp"
          ? "Reply sent to requester."
          : "Reply recorded. Email is in log-only mode."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setReplySaving(false);
    }
  }

  async function handleApprovalUpdate(nextStatus: ApprovalStatus) {
    if (!ticketId) return;

    setApprovalSaving(true);
    setError("");
    setSaveMessage("");
    setReplyMessage("");

    try {
      const updated = await updateTicketApproval(ticketId, nextStatus);
      setTicket(updated);
      setSaveMessage(`Approval status updated to ${nextStatus.replaceAll("_", " ")}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update approval status");
    } finally {
      setApprovalSaving(false);
    }
  }

  async function handleAddNote() {
    if (!ticketId) return;
    const trimmedBody = newNoteBody.trim();
    if (!trimmedBody) return;

    setNoteSaving(true);
    setError("");
    setSaveMessage("");

    try {
      await addTicketNote(ticketId, trimmedBody);
      const refreshedNotes = await fetchTicketNotes(ticketId);
      setNotes(refreshedNotes);
      setNewNoteBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setNoteSaving(false);
    }
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-4xl p-4 md:p-6">
      <div className="mb-4">
        <Link href="/" className="text-sm text-slate-600 hover:text-slate-900 hover:underline">
          Back to tickets
        </Link>
      </div>

      {loading ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading ticket...</div>
      ) : !ticket ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600">Ticket not found.</div>
      ) : (
        <div className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4 md:p-5">
            <h1 className="mb-2 text-xl font-semibold text-slate-900">{ticket.subject}</h1>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{ticket.description || "No description provided."}</p>
          </section>

          <section className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2 md:p-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Requester Name</p>
              <p className="text-sm text-slate-800">{ticket.requester_name || "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Requester Email</p>
              <p className="text-sm text-slate-800">{ticket.requester_email || "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Queue</p>
              <div className="pt-1">
                <StatusBadge value={ticket.queue} />
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Approval Status</p>
              <div className="pt-1">
                <StatusBadge value={ticket.approval_status} />
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Priority</p>
              <p className="text-sm text-slate-800">{ticket.priority}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Submitted At</p>
              <p className="text-sm text-slate-800">
                {ticket.submitted_at ? formatDate(ticket.submitted_at) : formatDate(ticket.created_at)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Record Created At</p>
              <p className="text-sm text-slate-800">{formatDate(ticket.created_at)}</p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2 md:p-5">
            <label className="text-sm">
              <span className="mb-1 block text-slate-700">Ticket Status</span>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={ticketStatus}
                onChange={(e) => setTicketStatus(e.target.value as TicketStatus)}
              >
                {TICKET_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-slate-700">Assignee</span>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={assigneeUserId}
                onChange={(e) => setAssigneeUserId(e.target.value)}
              >
                {ASSIGNEE_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-slate-700">Category</span>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">None</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 md:p-5">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Approval</h2>
            <div className="mb-3">
              <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Current Approval Status</p>
              <StatusBadge value={ticket.approval_status} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleApprovalUpdate("approved")}
                disabled={approvalSaving || ticket.approval_status === "approved"}
                className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {approvalSaving && ticket.approval_status !== "approved" ? "Updating..." : "Approve"}
              </button>
              <button
                type="button"
                onClick={() => handleApprovalUpdate("denied")}
                disabled={approvalSaving || ticket.approval_status === "denied"}
                className="rounded-md bg-rose-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {approvalSaving && ticket.approval_status !== "denied" ? "Updating..." : "Deny"}
              </button>
            </div>
          </section>

          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
          ) : null}
          {saveMessage ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {saveMessage}
            </div>
          ) : null}

          <section className="rounded-lg border border-slate-200 bg-white p-4 md:p-5">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Ticket Activity</h2>

            {notesLoading ? (
              <p className="mb-4 text-sm text-slate-600">Loading activity...</p>
            ) : notes.length === 0 ? (
              <p className="mb-4 text-sm text-slate-600">No messages yet.</p>
            ) : (
              <div className="mb-4 space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className={`rounded-md border p-3 ${
                      note.message_type === "public_reply"
                        ? "border-blue-200 bg-blue-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`rounded px-2 py-0.5 font-medium ${
                          note.message_type === "public_reply"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {note.message_type === "public_reply" ? "Sent to requester" : "Internal note"}
                      </span>
                      <span className="text-slate-600">{note.author_name || "Internal User"}</span>
                      <span className="text-slate-400">|</span>
                      <span className="text-slate-600">{formatDate(note.created_at)}</span>
                    </div>
                    {note.message_type === "public_reply" && note.to_email ? (
                      <p className="mb-2 text-xs text-blue-700">To: {note.to_email}</p>
                    ) : null}
                    <p className="whitespace-pre-wrap text-sm text-slate-800">{note.body}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <textarea
                className="min-h-[100px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Add an internal note..."
                value={newNoteBody}
                onChange={(e) => setNewNoteBody(e.target.value)}
              />
              <button
                type="button"
                onClick={handleAddNote}
                disabled={noteSaving || newNoteBody.trim().length === 0}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {noteSaving ? "Adding..." : "Add Note"}
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 md:p-5">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Reply to Requester</h2>
            <div className="space-y-2">
              <textarea
                className="min-h-[120px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Write a public reply to send to the requester..."
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
              />
              <button
                type="button"
                onClick={handleSendReply}
                disabled={replySaving || replyBody.trim().length === 0}
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {replySaving ? "Sending..." : "Send Reply"}
              </button>
              {replyMessage ? (
                <p className="text-sm text-emerald-700">{replyMessage}</p>
              ) : null}
            </div>
          </section>
        </div>
      )}
      </main>
    </AppShell>
  );
}
