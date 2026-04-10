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
                <span className="text-sm font-semibold leading-snug text-slate-900">
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
