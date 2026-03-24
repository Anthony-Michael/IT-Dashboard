import dotenv from "dotenv";
import { syncSmartsheetRowsPreview } from "../src/integrations/smartsheet/sync";

dotenv.config();
const PREVIEW_ROW_LIMIT = 5;

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

    console.log(`Starting Smartsheet sync preview (row limit: ${PREVIEW_ROW_LIMIT})...`);
    const mappedRows = await syncSmartsheetRowsPreview({ rowLimit: PREVIEW_ROW_LIMIT });
    console.log(`\nSync preview completed successfully. Mapped preview rows: ${mappedRows.length}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("SMARTSHEET_API_TOKEN")) {
      console.error("Sync preview failed: SMARTSHEET_API_TOKEN is missing in .env.");
    } else if (message.includes("SMARTSHEET_SHEET_ID")) {
      console.error("Sync preview failed: SMARTSHEET_SHEET_ID is missing in .env.");
    } else {
      console.error("Sync preview failed: could not fetch rows from Smartsheet.");
    }

    console.error(message);
    process.exitCode = 1;
  }
}

main();
