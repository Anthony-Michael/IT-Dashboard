import { pool } from "../src/db";

async function main(): Promise<void> {
  const smartsheetRowId = `test-row-${Date.now()}`;

  try {
    const result = await pool.query(
      `INSERT INTO tickets (
        smartsheet_row_id,
        requester_name,
        requester_email,
        subject,
        description,
        queue,
        approval_status,
        ticket_status,
        priority
      ) VALUES ($1, $2, $3, $4, $5, $6::queue, $7::approval_status, $8::ticket_status, $9::priority)
      RETURNING id, smartsheet_row_id, subject, queue, approval_status, ticket_status, priority, created_at`,
      [
        smartsheetRowId,
        "Test Employee",
        "employee@example.com",
        "Test ticket from seed script",
        "Created by scripts/insert-test-ticket.ts",
        "it",
        "pending_approval",
        "new",
        "medium"
      ]
    );

    console.log("Inserted test ticket:");
    console.log(result.rows[0]);
  } catch (error) {
    console.error("Failed to insert test ticket.");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
