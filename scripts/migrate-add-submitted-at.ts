import { pool } from "../src/db";

async function run(): Promise<void> {
  try {
    console.log("Running migration: add submitted_at to tickets...");

    await pool.query(`
      ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
    `);

    console.log("Migration succeeded: submitted_at column is present.");
  } catch (error) {
    console.error("Migration failed: could not add submitted_at.");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
