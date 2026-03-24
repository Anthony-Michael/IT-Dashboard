export type SmartsheetCellValue = string | number | boolean | null;

export interface SmartsheetColumn {
  id: number;
  title: string;
  type?: string;
}

export interface SmartsheetCell {
  columnId: number;
  value?: SmartsheetCellValue;
  displayValue?: string;
}

export interface SmartsheetRow {
  id: number;
  cells: SmartsheetCell[];
}

export interface SmartsheetSheetResponse {
  id: number;
  name: string;
  columns: SmartsheetColumn[];
  rows: SmartsheetRow[];
}

export interface MappedTicketInput {
  // This mirrors the minimum fields required for local ticket upsert in sync.ts.
  smartsheet_row_id: string;
  subject: string;
  description: string;
  requester_name: string;
  requester_email: string;
  approval_status: "pending_approval" | "approved" | "denied";
  queue: "it" | "operations";
}

