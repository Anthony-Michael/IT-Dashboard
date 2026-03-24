import fs from "fs";
import path from "path";
import { pool } from "../src/db";

async function run() {
  try {
    console.log("Running schema...");

    const schemaPath = path.join(__dirname, "../db/schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf-8");

    await pool.query(sql);

    console.log("Schema applied");

    console.log("Seeding users...");
    await import("./seed-internal-users");

    console.log("Seeding categories...");
    await import("./seed-categories");

    console.log("Setup complete");
    process.exit(0);
  } catch (err) {
    console.error("Setup failed:", err);
    process.exit(1);
  }
}

run();