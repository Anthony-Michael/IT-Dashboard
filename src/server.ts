import dotenv from "dotenv";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { pool, testDbConnection } from "./db";
import { sendEmail } from "./email/sender";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const ALLOWED_APPROVAL_STATUS = new Set(["pending_approval", "approved", "denied"]);
const ALLOWED_QUEUE = new Set(["it", "operations"]);
const ALLOWED_TICKET_STATUS = new Set([
  "new",
  "triage",
  "in_progress",
  "waiting_on_requester",
  "resolved",
  "closed"
]);
const DEFAULT_INTERNAL_NOTE_AUTHOR_USER_ID = "11111111-1111-4111-8111-111111111111";
// Keep CORS explicit per environment so internal APIs are not broadly exposed.
const ALLOWED_CORS_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

type ApiErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

function sendError(res: Response, status: number, message: string, code: ApiErrorCode) {
  return res.status(status).json({
    ok: false,
    error: {
      code,
      message
    }
  });
}

app.use(
  cors({
    origin: ALLOWED_CORS_ORIGINS,
    methods: ["GET", "POST", "PATCH", "OPTIONS"]
  })
);
app.use(express.json());
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
  });
  next();
});

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

app.get("/health", async (_req, res) => {
  try {
    await testDbConnection();
    res.status(200).json({ ok: true, db: "up" });
  } catch (error) {
    sendError(res, 500, `Database health check failed: ${(error as Error).message}`, "INTERNAL_ERROR");
  }
});

app.get("/tickets", async (req, res) => {
  try {
    const approvalStatus = req.query.approval_status as string | undefined;
    const queue = req.query.queue as string | undefined;
    const ticketStatus = req.query.ticket_status as string | undefined;
    const requesterEmail = req.query.requester_email as string | undefined;
    const categoryId = req.query.category_id as string | undefined;

    if (approvalStatus && !ALLOWED_APPROVAL_STATUS.has(approvalStatus)) {
      return sendError(res, 400, "Invalid approval_status", "BAD_REQUEST");
    }
    if (queue && !ALLOWED_QUEUE.has(queue)) {
      return sendError(res, 400, "Invalid queue", "BAD_REQUEST");
    }
    if (ticketStatus && !ALLOWED_TICKET_STATUS.has(ticketStatus)) {
      return sendError(res, 400, "Invalid ticket_status", "BAD_REQUEST");
    }
    if (categoryId && !isUuid(categoryId)) {
      return sendError(res, 400, "Invalid category_id", "BAD_REQUEST");
    }

    const page = parsePositiveInt(req.query.page as string | undefined, DEFAULT_PAGE);
    const requestedLimit = parsePositiveInt(req.query.limit as string | undefined, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const offset = (page - 1) * limit;

    // Dynamic query keeps one endpoint for all list filters; be careful to preserve param order.
    const whereClauses: string[] = [];
    const params: Array<string | number> = [];

    if (approvalStatus) {
      params.push(approvalStatus);
      whereClauses.push(`t.approval_status = $${params.length}::approval_status`);
    }
    if (queue) {
      params.push(queue);
      whereClauses.push(`t.queue = $${params.length}::queue`);
    }
    if (ticketStatus) {
      params.push(ticketStatus);
      whereClauses.push(`t.ticket_status = $${params.length}::ticket_status`);
    }
    if (requesterEmail) {
      params.push(requesterEmail);
      whereClauses.push(`LOWER(t.requester_email) = LOWER($${params.length})`);
    }
    if (categoryId) {
      params.push(categoryId);
      whereClauses.push(`t.category_id = $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const listParams = [...params, limit, offset];
    const result = await pool.query(
      `SELECT
         t.id,
         t.smartsheet_row_id,
         t.requester_name,
         t.requester_email,
         t.subject,
         t.description,
         t.queue,
         t.approval_status,
         t.ticket_status,
         t.priority,
         t.assignee_user_id,
         u.full_name AS assignee_name,
         t.category_id,
         c.name AS category_name,
         t.created_at,
         t.updated_at
       FROM tickets t
       LEFT JOIN users u ON u.id = t.assignee_user_id
       LEFT JOIN ticket_categories c ON c.id = t.category_id
       ${whereSql}
       ORDER BY t.created_at DESC
       LIMIT $${params.length + 1}
       OFFSET $${params.length + 2}`,
      listParams
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM tickets t
       ${whereSql}`,
      params
    );

    return res.status(200).json({
      data: result.rows,
      page,
      limit,
      total: countResult.rows[0]?.total ?? 0
    });
  } catch (error) {
    return sendError(res, 500, (error as Error).message, "INTERNAL_ERROR");
  }
});

app.get("/tickets/:id", async (req, res) => {
  const ticketId = req.params.id;

  if (!isUuid(ticketId)) {
    return sendError(res, 400, "Invalid ticket id", "BAD_REQUEST");
  }

  try {
    const result = await pool.query(
      `SELECT
         t.id,
         t.smartsheet_row_id,
         t.requester_name,
         t.requester_email,
         t.subject,
         t.description,
         t.queue,
         t.approval_status,
         t.ticket_status,
         t.priority,
         t.assignee_user_id,
         u.full_name AS assignee_name,
         t.category_id,
         c.name AS category_name,
         t.created_at,
         t.updated_at
       FROM tickets t
       LEFT JOIN users u ON u.id = t.assignee_user_id
       LEFT JOIN ticket_categories c ON c.id = t.category_id
       WHERE t.id = $1`,
      [ticketId]
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, "Ticket not found", "NOT_FOUND");
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return sendError(res, 500, (error as Error).message, "INTERNAL_ERROR");
  }
});

app.patch("/tickets/:id", async (req, res) => {
  const ticketId = req.params.id;

  if (!isUuid(ticketId)) {
    return sendError(res, 400, "Invalid ticket id", "BAD_REQUEST");
  }

  const ticketStatus = req.body?.ticket_status as string | undefined;
  const approvalStatus = req.body?.approval_status as string | undefined;
  const assigneeUserIdInput = req.body?.assignee_user_id as string | null | undefined;
  const categoryIdInput = req.body?.category_id as string | null | undefined;

  if (ticketStatus && !ALLOWED_TICKET_STATUS.has(ticketStatus)) {
    return sendError(res, 400, "Invalid ticket_status", "BAD_REQUEST");
  }
  if (approvalStatus && !ALLOWED_APPROVAL_STATUS.has(approvalStatus)) {
    return sendError(res, 400, "Invalid approval_status", "BAD_REQUEST");
  }

  if (assigneeUserIdInput !== undefined && assigneeUserIdInput !== null && assigneeUserIdInput !== "" && !isUuid(assigneeUserIdInput)) {
    return sendError(res, 400, "Invalid assignee_user_id", "BAD_REQUEST");
  }
  if (categoryIdInput !== undefined && categoryIdInput !== null && categoryIdInput !== "" && !isUuid(categoryIdInput)) {
    return sendError(res, 400, "Invalid category_id", "BAD_REQUEST");
  }

  const assigneeUserId =
    assigneeUserIdInput === undefined || assigneeUserIdInput === "" ? undefined : assigneeUserIdInput;
  const categoryId = categoryIdInput === undefined || categoryIdInput === "" ? undefined : categoryIdInput;

  // Undefined means "leave unchanged"; null means "explicitly clear field" for FK columns.
  const updates: string[] = [];
  const params: Array<string | null> = [];

  if (ticketStatus !== undefined) {
    params.push(ticketStatus);
    updates.push(`ticket_status = $${params.length}::ticket_status`);
  }
  if (approvalStatus !== undefined) {
    params.push(approvalStatus);
    updates.push(`approval_status = $${params.length}::approval_status`);
  }

  if (assigneeUserId !== undefined) {
    params.push(assigneeUserId);
    updates.push(`assignee_user_id = $${params.length}`);
  }
  if (categoryId !== undefined) {
    params.push(categoryId);
    updates.push(`category_id = $${params.length}`);
  }

  if (updates.length === 0) {
    return sendError(res, 400, "No updatable fields provided", "BAD_REQUEST");
  }

  params.push(ticketId);

  try {
    if (assigneeUserId !== undefined && assigneeUserId !== null) {
      const assigneeExists = await pool.query("SELECT 1 FROM users WHERE id = $1", [assigneeUserId]);
      if (assigneeExists.rowCount === 0) {
        return sendError(res, 400, "assignee_user_id does not exist", "BAD_REQUEST");
      }
    }
    if (categoryId !== undefined && categoryId !== null) {
      const categoryExists = await pool.query("SELECT 1 FROM ticket_categories WHERE id = $1", [categoryId]);
      if (categoryExists.rowCount === 0) {
        return sendError(res, 400, "category_id does not exist", "BAD_REQUEST");
      }
    }

    const result = await pool.query(
      `UPDATE tickets t
       SET ${updates.join(", ")}, updated_at = NOW()
       WHERE t.id = $${params.length}
       RETURNING
         t.id,
         t.smartsheet_row_id,
         t.requester_name,
         t.requester_email,
         t.subject,
         t.description,
         t.queue,
         t.approval_status,
         t.ticket_status,
         t.priority,
         t.assignee_user_id,
         t.category_id,
         t.created_at,
         t.updated_at`,
      params
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, "Ticket not found", "NOT_FOUND");
    }

    const ticket = result.rows[0];
    const hydrated = await pool.query(
      `SELECT
         t.id,
         t.smartsheet_row_id,
         t.requester_name,
         t.requester_email,
         t.subject,
         t.description,
         t.queue,
         t.approval_status,
         t.ticket_status,
         t.priority,
         t.assignee_user_id,
         u.full_name AS assignee_name,
         t.category_id,
         c.name AS category_name,
         t.created_at,
         t.updated_at
       FROM tickets t
       LEFT JOIN users u ON u.id = t.assignee_user_id
       LEFT JOIN ticket_categories c ON c.id = t.category_id
       WHERE t.id = $1`,
      [ticket.id]
    );

    return res.status(200).json(hydrated.rows[0]);
  } catch (error) {
    return sendError(res, 500, (error as Error).message, "INTERNAL_ERROR");
  }
});

app.get("/categories", async (req, res) => {
  const includeInactive = (req.query.include_inactive as string | undefined) === "true";

  try {
    const result = await pool.query(
      `SELECT id, name, queue, is_active, created_at, updated_at
       FROM ticket_categories
       WHERE ($1::boolean = TRUE OR is_active = TRUE)
       ORDER BY name ASC`,
      [includeInactive]
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    return sendError(res, 500, (error as Error).message, "INTERNAL_ERROR");
  }
});

app.post("/categories", async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const queue = req.body?.queue as string | undefined;

  if (!name) {
    return sendError(res, 400, "name is required", "BAD_REQUEST");
  }
  if (!queue || !ALLOWED_QUEUE.has(queue)) {
    return sendError(res, 400, "queue is required and must be valid", "BAD_REQUEST");
  }

  try {
    const result = await pool.query(
      `INSERT INTO ticket_categories (name, queue, is_active)
       VALUES ($1, $2::queue, TRUE)
       RETURNING id, name, queue, is_active, created_at, updated_at`,
      [name, queue]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return sendError(res, 500, (error as Error).message, "INTERNAL_ERROR");
  }
});

app.patch("/categories/:id", async (req, res) => {
  const categoryId = req.params.id;

  if (!isUuid(categoryId)) {
    return sendError(res, 400, "Invalid category id", "BAD_REQUEST");
  }

  const name = typeof req.body?.name === "string" ? req.body.name.trim() : undefined;
  const queue = req.body?.queue as string | undefined;
  const isActive = typeof req.body?.is_active === "boolean" ? req.body.is_active : undefined;

  if (queue !== undefined && !ALLOWED_QUEUE.has(queue)) {
    return sendError(res, 400, "Invalid queue", "BAD_REQUEST");
  }

  const updates: string[] = [];
  const params: Array<string | boolean> = [];

  if (name !== undefined) {
    if (!name) {
      return sendError(res, 400, "name cannot be empty", "BAD_REQUEST");
    }
    params.push(name);
    updates.push(`name = $${params.length}`);
  }

  if (queue !== undefined) {
    params.push(queue);
    updates.push(`queue = $${params.length}::queue`);
  }

  if (isActive !== undefined) {
    params.push(isActive);
    updates.push(`is_active = $${params.length}`);
  }

  if (updates.length === 0) {
    return sendError(res, 400, "No updatable fields provided", "BAD_REQUEST");
  }

  params.push(categoryId);

  try {
    const result = await pool.query(
      `UPDATE ticket_categories
       SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = $${params.length}
       RETURNING id, name, queue, is_active, created_at, updated_at`,
      params
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, "Category not found", "NOT_FOUND");
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return sendError(res, 500, (error as Error).message, "INTERNAL_ERROR");
  }
});

app.get("/tickets/:id/notes", async (req, res) => {
  const ticketId = req.params.id;

  if (!isUuid(ticketId)) {
    return sendError(res, 400, "Invalid ticket id", "BAD_REQUEST");
  }

  try {
    const result = await pool.query(
      `SELECT
         tm.id,
         tm.ticket_id,
         tm.sender_user_id AS author_user_id,
         u.full_name AS author_name,
         tm.message_type,
         tm.to_email,
         tm.body,
         tm.created_at
       FROM ticket_messages tm
       LEFT JOIN users u ON u.id = tm.sender_user_id
       WHERE tm.ticket_id = $1
         AND tm.message_type IN ('internal_note', 'public_reply')
       ORDER BY tm.created_at ASC`,
      [ticketId]
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    return sendError(res, 500, (error as Error).message, "INTERNAL_ERROR");
  }
});

app.post("/tickets/:id/notes", async (req, res) => {
  const ticketId = req.params.id;

  if (!isUuid(ticketId)) {
    return sendError(res, 400, "Invalid ticket id", "BAD_REQUEST");
  }

  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  if (!body) {
    return sendError(res, 400, "body is required", "BAD_REQUEST");
  }

  try {
    // MVP uses a configured default author until auth/user context is wired into requests.
    const authorUserId = process.env.INTERNAL_NOTE_AUTHOR_USER_ID || DEFAULT_INTERNAL_NOTE_AUTHOR_USER_ID;

    const authorExists = await pool.query("SELECT 1 FROM users WHERE id = $1", [authorUserId]);
    const safeAuthorUserId = authorExists.rowCount > 0 ? authorUserId : null;

    const result = await pool.query(
      `INSERT INTO ticket_messages (
         ticket_id,
         message_type,
         body,
         sender_user_id
       )
       VALUES ($1, 'internal_note', $2, $3)
       RETURNING
         id,
         ticket_id,
         sender_user_id AS author_user_id,
         message_type,
         to_email,
         body,
         created_at`,
      [ticketId, body, safeAuthorUserId]
    );

    const note = result.rows[0];
    const authorNameResult =
      note.author_user_id !== null
        ? await pool.query("SELECT full_name FROM users WHERE id = $1", [note.author_user_id])
        : { rows: [] as Array<{ full_name: string }> };

    return res.status(201).json({
      ...note,
      author_name: authorNameResult.rows[0]?.full_name ?? null
    });
  } catch (error) {
    return sendError(res, 500, (error as Error).message, "INTERNAL_ERROR");
  }
});

app.post("/tickets/:id/reply", async (req, res) => {
  const ticketId = req.params.id;

  if (!isUuid(ticketId)) {
    return sendError(res, 400, "Invalid ticket id", "BAD_REQUEST");
  }

  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  if (!body) {
    return sendError(res, 400, "body is required", "BAD_REQUEST");
  }

  try {
    const ticketResult = await pool.query(
      `SELECT id, subject, requester_email
       FROM tickets
       WHERE id = $1`,
      [ticketId]
    );

    if (ticketResult.rowCount === 0) {
      return sendError(res, 404, "Ticket not found", "NOT_FOUND");
    }

    const ticket = ticketResult.rows[0] as { id: string; subject: string; requester_email: string | null };
    if (!ticket.requester_email) {
      return sendError(res, 400, "Ticket has no requester_email", "BAD_REQUEST");
    }

    const emailResult = await sendEmail({
      to: ticket.requester_email,
      subject: `Update on your request: ${ticket.subject}`,
      text: body
    });

    const authorUserId = process.env.INTERNAL_NOTE_AUTHOR_USER_ID || DEFAULT_INTERNAL_NOTE_AUTHOR_USER_ID;
    const authorExists = await pool.query("SELECT 1 FROM users WHERE id = $1", [authorUserId]);
    const safeAuthorUserId = authorExists.rowCount > 0 ? authorUserId : null;

    const insertResult = await pool.query(
      `INSERT INTO ticket_messages (
         ticket_id,
         message_type,
         body,
         sender_user_id,
         to_email
       )
       VALUES ($1, 'public_reply', $2, $3, $4)
       RETURNING
         id,
         ticket_id,
         sender_user_id AS author_user_id,
         message_type,
         to_email,
         body,
         created_at`,
      [ticketId, body, safeAuthorUserId, ticket.requester_email]
    );

    const replyMessage = insertResult.rows[0];
    const authorNameResult =
      replyMessage.author_user_id !== null
        ? await pool.query("SELECT full_name FROM users WHERE id = $1", [replyMessage.author_user_id])
        : { rows: [] as Array<{ full_name: string }> };

    return res.status(201).json({
      ok: true,
      message: {
        ...replyMessage,
        author_name: authorNameResult.rows[0]?.full_name ?? null
      },
      email: emailResult
    });
  } catch (error) {
    return sendError(res, 500, (error as Error).message, "INTERNAL_ERROR");
  }
});

app.use((_req, res) => {
  return sendError(res, 404, "Route not found", "NOT_FOUND");
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Unexpected server error";
  return sendError(res, 500, message, "INTERNAL_ERROR");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

