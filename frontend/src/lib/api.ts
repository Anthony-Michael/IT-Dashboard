export type ApprovalStatus = "pending_approval" | "approved" | "denied";
export type Queue = "it" | "operations";
export type TicketStatus =
  | "new"
  | "triage"
  | "in_progress"
  | "waiting_on_requester"
  | "resolved"
  | "closed";

export interface Ticket {
  id: string;
  smartsheet_row_id: string;
  requester_name: string;
  requester_email: string;
  subject: string;
  description: string;
  submitted_at?: string | null;
  queue: Queue;
  approval_status: ApprovalStatus;
  ticket_status: TicketStatus;
  priority: string;
  assignee_user_id?: string | null;
  assignee_name?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  submitted_at?: string | null;
  created_at: string;
}

export interface TicketsResponse {
  data: Ticket[];
  page: number;
  limit: number;
  total: number;
}

export interface TicketNote {
  id: string;
  ticket_id: string;
  author_user_id: string | null;
  author_name: string | null;
  message_type: "internal_note" | "public_reply";
  to_email?: string | null;
  body: string;
  created_at: string;
}

export interface TicketQuery {
  approval_status?: ApprovalStatus | "";
  queue?: Queue | "";
  ticket_status?: TicketStatus | "";
  category_id?: string | "";
  page?: number;
  limit?: number;
}

export interface Category {
  id: string;
  name: string;
  queue: Queue;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

async function readErrorMessage(response: Response): Promise<string> {
  try {
    // Backend sends { error: { message } }; fallback keeps client robust to non-JSON failures.
    const data = (await response.json()) as { error?: { message?: string } };
    if (data?.error?.message) return data.error.message;
  } catch {
    // ignore parse failure and fall back to status text
  }

  return `Request failed with status ${response.status}`;
}

export async function fetchTickets(query: TicketQuery): Promise<TicketsResponse> {
  const params = new URLSearchParams();
  if (query.approval_status) params.set("approval_status", query.approval_status);
  if (query.queue) params.set("queue", query.queue);
  if (query.ticket_status) params.set("ticket_status", query.ticket_status);
  if (query.category_id) params.set("category_id", query.category_id);
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 10));

  // no-store avoids stale triage state in this internal dashboard workflow.
  const response = await fetch(`${API_BASE_URL}/tickets?${params.toString()}`, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as TicketsResponse;
}

export async function fetchTicketById(id: string): Promise<Ticket> {
  const response = await fetch(`${API_BASE_URL}/tickets/${id}`, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as Ticket;
}

export async function updateTicket(
  id: string,
  payload: {
    ticket_status?: TicketStatus;
    approval_status?: ApprovalStatus;
    assignee_user_id?: string | null;
    category_id?: string | null;
  }
): Promise<Ticket> {
  // This endpoint is intentionally shared by status, assignee, category, and approval updates.
  const response = await fetch(`${API_BASE_URL}/tickets/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as Ticket;
}

export async function updateTicketApproval(id: string, approvalStatus: ApprovalStatus): Promise<Ticket> {
  return updateTicket(id, { approval_status: approvalStatus });
}

export async function fetchCategories(includeInactive = false): Promise<Category[]> {
  const params = new URLSearchParams();
  if (includeInactive) params.set("include_inactive", "true");

  const response = await fetch(`${API_BASE_URL}/categories?${params.toString()}`, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as Category[];
}

export async function createCategory(payload: { name: string; queue: Queue }): Promise<Category> {
  const response = await fetch(`${API_BASE_URL}/categories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as Category;
}

export async function updateCategory(
  id: string,
  payload: { name?: string; queue?: Queue; is_active?: boolean }
): Promise<Category> {
  const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as Category;
}

export async function fetchTicketNotes(ticketId: string): Promise<TicketNote[]> {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/notes`, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as TicketNote[];
}

export async function addTicketNote(ticketId: string, body: string): Promise<TicketNote> {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ body })
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as TicketNote;
}

export async function sendTicketReply(
  ticketId: string,
  body: string
): Promise<{ ok: boolean; message: TicketNote; email: { sent: boolean; mode: "smtp" | "log_only" } }> {
  // Caller should inspect email.mode to message users correctly in log-only environments.
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ body })
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as { ok: boolean; message: TicketNote; email: { sent: boolean; mode: "smtp" | "log_only" } };
}
