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
