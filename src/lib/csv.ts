/**
 * Minimal CSV export helpers (#777).
 *
 * Fields are quoted per RFC 4180 when they contain a comma, quote or newline.
 * A field that a spreadsheet would treat as a formula (leading =, +, -, @,
 * tab or CR) is prefixed with a single quote, so an exported value can never
 * execute as a formula when the file is opened in Excel or Sheets.
 */

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function escapeField(raw: string | number): string {
  let value = String(raw);
  if (typeof raw === "string" && FORMULA_PREFIX.test(value)) value = `'${value}`;
  if (/[",\r\n]/.test(value)) value = `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [
    columns.map((c) => escapeField(c.header)).join(","),
    ...rows.map((row) => columns.map((c) => escapeField(c.value(row))).join(",")),
  ];
  return `${lines.join("\r\n")}\r\n`;
}

/** Triggers a browser download of `csv` as `filename`. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
