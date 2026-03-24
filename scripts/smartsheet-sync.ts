import dotenv from "dotenv";
import { pool } from "../src/db";
import { syncSmartsheetRowsToDb } from "../src/integrations/smartsheet/sync";

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main(): Promise<void> {
  try {
    requireEnv("SMARTSHEET_API_TOKEN");
    requireEnv("SMARTSHEET_SHEET_ID");

    console.log("Starting Smartsheet -> local DB sync...");
    const result = await syncSmartsheetRowsToDb();

    console.log("Sync complete.");
    console.log(`Processed: ${result.processed}`);
    console.log(`Inserted: ${result.inserted}`);
    console.log(`Updated: ${result.updated}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Sync failed.");
    console.error(message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
