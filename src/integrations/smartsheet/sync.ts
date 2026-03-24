import { fetchSheetRows } from "./client";
import { mapSmartsheetRowToTicket } from "./mappers";
import { MappedTicketInput, SmartsheetColumn, SmartsheetRow } from "./types";
import { pool } from "../../db";

export interface SyncPreviewOptions {
  rowLimit?: number;
}

export interface SyncRunResult {
  processed: number;
  inserted: number;
  updated: number;
}

const DEFAULT_PREVIEW_ROW_LIMIT = 5;

function isCellPopulated(value: unknown, displayValue: unknown): boolean {
  const hasRaw = value !== null && value !== undefined && value !== "";
  const hasDisplay = displayValue !== null && displayValue !== undefined && displayValue !== "";
  return hasRaw || hasDisplay;
}

function printColumnDefinitions(columns: SmartsheetColumn[]): void {
  console.log("\n=== Column Definitions ===");
  for (const column of columns) {
    console.log(`- id=${column.id} | title="${column.title}" | type="${column.type ?? "unknown"}"`);
  }
}

function printRawRowPreview(rows: SmartsheetRow[], columnsById: Map<number, SmartsheetColumn>): void {
  console.log("\n=== Raw Row Preview ===");

  for (const row of rows) {
    console.log(`\nRow id: ${row.id}`);

    const populatedCells = row.cells.filter((cell) => isCellPopulated(cell.value, cell.displayValue));
    if (populatedCells.length === 0) {
      console.log("  (no populated cells)");
      continue;
    }

    for (const cell of populatedCells) {
      const column = columnsById.get(cell.columnId);
      const columnTitle = column?.title ?? `Unknown column (${cell.columnId})`;
      const rawValue = cell.value === undefined ? "undefined" : JSON.stringify(cell.value);
      const displayValue = cell.displayValue ?? "";

      if (displayValue) {
        console.log(`  - ${columnTitle}: raw=${rawValue} | display="${displayValue}"`);
      } else {
        console.log(`  - ${columnTitle}: raw=${rawValue}`);
      }
    }
  }
}

function printMappedPreview(mappedRows: MappedTicketInput[]): void {
  console.log("\n=== Mapped Ticket Preview ===");
  for (const mapped of mappedRows) {
    console.log(mapped);
  }
}

export async function syncSmartsheetRowsPreview(options: SyncPreviewOptions = {}): Promise<MappedTicketInput[]> {
  const rowLimit = options.rowLimit ?? DEFAULT_PREVIEW_ROW_LIMIT;
  console.log("Smartsheet sync mode: READ-ONLY (no writeback)");
  const sheet = await fetchSheetRows();
  const previewRows = sheet.rows.slice(0, rowLimit);

  const columnsById = new Map<number, SmartsheetColumn>();
  for (const column of sheet.columns) {
    columnsById.set(column.id, column);
  }

  const mappedRows = previewRows.map((row) => mapSmartsheetRowToTicket(row, sheet.columns));

  console.log(`Smartsheet sync preview: fetched ${sheet.rows.length} rows from "${sheet.name}"`);
  console.log(`Preview limit: first ${previewRows.length} row(s).`);
  printColumnDefinitions(sheet.columns);
  printRawRowPreview(previewRows, columnsById);
  printMappedPreview(mappedRows);

  return mappedRows;
}

export async function syncSmartsheetRowsToDb(): Promise<SyncRunResult> {
  console.log("Smartsheet sync mode: READ-ONLY against Smartsheet, local DB upserts only.");

  const sheet = await fetchSheetRows();
  const mappedRows = sheet.rows.map((row) => mapSmartsheetRowToTicket(row, sheet.columns));

  let inserted = 0;
  let updated = 0;

  for (const ticket of mappedRows) {
    const updateResult = await pool.query(
      `UPDATE tickets
       SET
         subject = $2,
         description = $3,
         requester_name = $4,
         requester_email = $5,
         approval_status = $6::approval_status,
         queue = $7::queue,
         updated_at = NOW()
       WHERE smartsheet_row_id = $1
       RETURNING id`,
      [
        ticket.smartsheet_row_id,
        ticket.subject,
        ticket.description,
        ticket.requester_name,
        ticket.requester_email,
        ticket.approval_status,
        ticket.queue
      ]
    );

    if (updateResult.rowCount && updateResult.rowCount > 0) {
      updated += 1;
      continue;
    }

    await pool.query(
      `INSERT INTO tickets (
         smartsheet_row_id,
         requester_name,
         requester_email,
         subject,
         description,
         queue,
         approval_status
       ) VALUES ($1, $2, $3, $4, $5, $6::queue, $7::approval_status)`,
      [
        ticket.smartsheet_row_id,
        ticket.requester_name,
        ticket.requester_email,
        ticket.subject,
        ticket.description,
        ticket.queue,
        ticket.approval_status
      ]
    );

    inserted += 1;
  }

  const result: SyncRunResult = {
    processed: mappedRows.length,
    inserted,
    updated
  };

  console.log(`Sync processed: ${result.processed}`);
  console.log(`Inserted: ${result.inserted}`);
  console.log(`Updated: ${result.updated}`);

  return result;
}

