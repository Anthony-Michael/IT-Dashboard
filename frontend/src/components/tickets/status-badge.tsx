import { ApprovalStatus, Queue, TicketStatus } from "../../lib/api";

type BadgeVariant = ApprovalStatus | Queue | TicketStatus;

const CLASS_BY_VARIANT: Record<BadgeVariant, string> = {
  pending_approval: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  denied: "bg-rose-100 text-rose-800",
  it: "bg-sky-100 text-sky-800",
  operations: "bg-violet-100 text-violet-800",
  new: "bg-slate-100 text-slate-800",
  triage: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  waiting_on_requester: "bg-orange-100 text-orange-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-zinc-200 text-zinc-700"
};

function toLabel(value: string): string {
  return value.replaceAll("_", " ");
}

export function StatusBadge({ value }: { value: BadgeVariant }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${CLASS_BY_VARIANT[value]}`}>
      {toLabel(value)}
    </span>
  );
}
