import { MappedTicketInput, SmartsheetCell, SmartsheetColumn, SmartsheetRow } from "./types";

function getCellText(row: SmartsheetRow, columnsByTitle: Map<string, SmartsheetColumn>, title: string): string {
  // Mapping is title-based for readability; Smartsheet column renames can break sync silently.
  const column = columnsByTitle.get(title.toLowerCase());
  if (!column) {
    return "";
  }

  const cell = row.cells.find((c: SmartsheetCell) => c.columnId === column.id);
  const rawValue = cell?.displayValue ?? cell?.value;
  return rawValue === null || rawValue === undefined ? "" : String(rawValue).trim();
}

function mapApprovalStatus(rawValue: string): MappedTicketInput["approval_status"] {
  const normalized = rawValue.toLowerCase();
  if (normalized.includes("approved")) {
    return "approved";
  }
  if (normalized.includes("denied")) {
    return "denied";
  }
  return "pending_approval";
}

function mapQueue(rawValue: string): MappedTicketInput["queue"] {
  const normalized = rawValue.toLowerCase();
  return normalized.includes("operation") ? "operations" : "it";
}

export function mapSmartsheetRowToTicket(row: SmartsheetRow, columns: SmartsheetColumn[]): MappedTicketInput {
  const columnsByTitle = new Map<string, SmartsheetColumn>();
  for (const column of columns) {
    columnsByTitle.set(column.title.toLowerCase(), column);
  }

  // These column titles reflect the current intake sheet and are the main integration contract.
  const requesterName =
    getCellText(row, columnsByTitle, "Name of Person Generating the Request") || "";
  const requesterEmail =
    getCellText(row, columnsByTitle, "Email of Person Generating the Request") || "";
  const subject = getCellText(row, columnsByTitle, "Maintenance Type") || "Maintenance Request";
  const description = getCellText(row, columnsByTitle, "Detailed Notes of the Maintenance Issue") || "";

  // Keep fallback conservative: unknown values stay pending_approval for manual review.
  const approvalRaw = getCellText(row, columnsByTitle, "Approval").toLowerCase();
  let approvalStatus: MappedTicketInput["approval_status"] = "pending_approval";
  if (approvalRaw === "approved") {
    approvalStatus = "approved";
  } else if (approvalRaw === "denied") {
    approvalStatus = "denied";
  } else if (approvalRaw === "submitted") {
    approvalStatus = "pending_approval";
  }

  // Queue mapping defaults to operations when department text does not explicitly include "it".
  const departmentRaw = getCellText(row, columnsByTitle, "Department").toLowerCase();
  const queue: MappedTicketInput["queue"] = departmentRaw.includes("it") ? "it" : "operations";

  return {
    smartsheet_row_id: String(row.id),
    subject,
    description,
    requester_name: requesterName,
    requester_email: requesterEmail,
    approval_status: approvalStatus,
    queue
  };
}

