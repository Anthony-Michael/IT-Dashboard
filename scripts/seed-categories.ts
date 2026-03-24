import { pool } from "../src/db";

const CATEGORIES = [
  { name: "POS Software", queue: "it" },
  { name: "Password Reset", queue: "it" },
  { name: "Internet / Phone", queue: "it" },
  { name: "Plumbing", queue: "operations" },
  { name: "Electrical", queue: "operations" },
  { name: "HVAC", queue: "operations" },
  { name: "Locks / Security", queue: "operations" }
];

async function main(): Promise<void> {
  try {
    for (const category of CATEGORIES) {
      await pool.query(
        `INSERT INTO ticket_categories (name, queue, is_active)
         VALUES ($1, $2::queue, TRUE)
         ON CONFLICT (name, queue)
         DO UPDATE SET
           is_active = TRUE,
           updated_at = NOW()`,
        [category.name, category.queue]
      );
    }

    console.log(`Seeded ${CATEGORIES.length} categories.`);
  } catch (error) {
    console.error("Failed to seed categories.");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
