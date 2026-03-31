"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ApprovalStatus,
  Category,
  fetchCategories,
  fetchTickets,
  Queue,
  Ticket,
  TicketStatus
} from "../lib/api";
import { StatusBadge } from "../components/tickets/status-badge";
import { AppShell } from "../components/layout/app-shell";

const PAGE_SIZE = 10;

type Filters = {
  approval_status: ApprovalStatus | "";
  queue: Queue | "";
  ticket_status: TicketStatus | "";
  category_id: string | "";
};

const initialFilters: Filters = {
  approval_status: "",
  queue: "",
  ticket_status: "",
  category_id: ""
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function getDisplaySubmittedAt(ticket: Ticket): string {
  return ticket.submitted_at || ticket.created_at;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadCategories(): Promise<void> {
      try {
        const data = await fetchCategories();
        if (!active) return;
        setCategories(data);
      } catch {
        if (!active) return;
        setCategories([]);
      }
    }

    loadCategories();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function load(): Promise<void> {
      setLoading(true);
      setError("");

      try {
        const result = await fetchTickets({ ...filters, page, limit: PAGE_SIZE });
        if (!active) return;

        setTickets(result.data);
        setTotal(result.total);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load tickets");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [filters, page, refreshKey]);

  const totalPages = useMemo(() => {
    if (total <= 0) return 1;
    return Math.ceil(total / PAGE_SIZE);
  }, [total]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    // Reset page when filters change to avoid requesting empty pages from prior pagination state.
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl p-4 md:p-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-slate-900">Tickets</h1>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Phase 1 ticket list with filters and pagination.</p>
          <Link href="/categories" className="text-sm text-slate-700 underline-offset-2 hover:underline">
            Manage Categories
          </Link>
        </div>
      </header>

      <section className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1 block text-slate-700">Approval Status</span>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={filters.approval_status}
            onChange={(e) => updateFilter("approval_status", e.target.value as Filters["approval_status"])}
          >
            <option value="">All</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-slate-700">Queue</span>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={filters.queue}
            onChange={(e) => updateFilter("queue", e.target.value as Filters["queue"])}
          >
            <option value="">All</option>
            <option value="it">IT</option>
            <option value="operations">Operations</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-slate-700">Ticket Status</span>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={filters.ticket_status}
            onChange={(e) => updateFilter("ticket_status", e.target.value as Filters["ticket_status"])}
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

        <label className="text-sm">
          <span className="mb-1 block text-slate-700">Category</span>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={filters.category_id}
            onChange={(e) => updateFilter("category_id", e.target.value)}
          >
            <option value="">All</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error ? (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <p className="mb-2">{error}</p>
          <button
            type="button"
            onClick={() => setRefreshKey((prev) => prev + 1)}
            className="rounded-md border border-rose-300 bg-white px-3 py-1 text-xs text-rose-700"
          >
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600">No tickets found.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-600">
                  <th className="px-3 py-2">Subject</th>
                  <th className="px-3 py-2">Requester Name</th>
                  <th className="px-3 py-2">Requester Email</th>
                  <th className="px-3 py-2">Assignee</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Queue</th>
                  <th className="px-3 py-2">Approval</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2">Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-slate-100 align-top hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-900">
                      <Link href={`/tickets/${ticket.id}`} className="underline-offset-2 hover:underline">
                        {ticket.subject}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{ticket.requester_name}</td>
                    <td className="px-3 py-2 text-slate-700">{ticket.requester_email}</td>
                    <td className="px-3 py-2 text-slate-700">{ticket.assignee_name || "Unassigned"}</td>
                    <td className="px-3 py-2 text-slate-700">{ticket.category_name || ""}</td>
                    <td className="px-3 py-2">
                      <StatusBadge value={ticket.queue} />
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge value={ticket.approval_status} />
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge value={ticket.ticket_status} />
                    </td>
                    <td className="px-3 py-2 text-slate-700">{ticket.priority}</td>
                    <td className="px-3 py-2 text-slate-700">{formatDate(getDisplaySubmittedAt(ticket))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Page {page} of {totalPages} ({total} total)
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setPage((prev) => prev - 1)}
                disabled={!canGoPrevious}
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={!canGoNext}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
      </main>
    </AppShell>
  );
}
