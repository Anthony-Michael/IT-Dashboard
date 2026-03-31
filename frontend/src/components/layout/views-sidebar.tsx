"use client";

type SidebarItemId =
  | "all_tickets"
  | "pending_approval"
  | "unassigned"
  | "recently_updated"
  | "queue_it"
  | "queue_operations"
  | "status_new"
  | "status_in_progress"
  | "status_waiting_on_requester"
  | "status_resolved";

type SidebarItem = {
  id: SidebarItemId;
  label: string;
  disabled?: boolean;
};

type SidebarSection = {
  title: string;
  items: SidebarItem[];
};

const SECTIONS: SidebarSection[] = [
  {
    title: "Views",
    items: [
      { id: "all_tickets", label: "All Tickets" },
      { id: "pending_approval", label: "Pending Approval" },
      { id: "unassigned", label: "Unassigned" },
      { id: "recently_updated", label: "Recently Updated", disabled: true }
    ]
  },
  {
    title: "Queues",
    items: [
      { id: "queue_it", label: "IT Queue" },
      { id: "queue_operations", label: "Operations Queue" }
    ]
  },
  {
    title: "Status",
    items: [
      { id: "status_new", label: "New" },
      { id: "status_in_progress", label: "In Progress" },
      { id: "status_waiting_on_requester", label: "Waiting on Requester" },
      { id: "status_resolved", label: "Resolved" }
    ]
  }
];

export type { SidebarItemId };

export function ViewsSidebar({
  activeItem,
  onSelect
}: {
  activeItem: SidebarItemId | null;
  onSelect: (itemId: SidebarItemId) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      {SECTIONS.map((section) => (
        <section key={section.title} className="mb-4 last:mb-0">
          <h3 className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-slate-500">{section.title}</h3>
          <div className="space-y-1">
            {section.items.map((item) => {
              const isActive = activeItem === item.id;

              if (item.disabled) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled
                    className="w-full rounded-md px-2 py-2 text-left text-sm text-slate-400"
                    title={`${item.label} (coming soon)`}
                  >
                    {item.label}
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={`w-full rounded-md px-2 py-2 text-left text-sm transition-colors ${
                    isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
