import dotenv from "dotenv";
import { SmartsheetSheetResponse } from "./types";

dotenv.config();

const SMARTSHEET_BASE_URL = "https://api.smartsheet.com/2.0";
// MVP guardrail: integration only reads Smartsheet data; no writeback supported here.
const READ_ONLY_MODE = true;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getSmartsheetConfig(): { apiToken: string; sheetId: string } {
  return {
    apiToken: requireEnv("SMARTSHEET_API_TOKEN"),
    sheetId: requireEnv("SMARTSHEET_SHEET_ID")
  };
}

export async function fetchSheetRows(): Promise<SmartsheetSheetResponse> {
  if (!READ_ONLY_MODE) {
    throw new Error("Smartsheet client is not in read-only mode.");
  }

  const { apiToken, sheetId } = getSmartsheetConfig();

  // Fetching full sheet keeps mapping logic simple for MVP; revisit if row volume grows.
  const response = await fetch(`${SMARTSHEET_BASE_URL}/sheets/${sheetId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Smartsheet API request failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as SmartsheetSheetResponse;
}

