import { describe, expect, it } from "vitest";
import { toCsv, type CsvColumn } from "./csv";

type Row = { name: string; staked: string; apr: number };

const columns: CsvColumn<Row>[] = [
  { header: "Pool", value: (r) => r.name },
  { header: "Staked", value: (r) => r.staked },
  { header: "APR", value: (r) => r.apr },
];

describe("toCsv (#777)", () => {
  it("writes a header row and one CRLF-terminated line per row", () => {
    expect(toCsv([{ name: "XLM Pool", staked: "32000", apr: 13.8 }], columns)).toBe(
      "Pool,Staked,APR\r\nXLM Pool,32000,13.8\r\n",
    );
  });

  it("quotes fields containing commas, quotes or newlines", () => {
    const csv = toCsv([{ name: 'A "big", pool\nhere', staked: "45,000", apr: 1 }], columns);
    expect(csv).toBe('Pool,Staked,APR\r\n"A ""big"", pool\nhere","45,000",1\r\n');
  });

  it("neutralises values a spreadsheet would run as a formula", () => {
    const csv = toCsv([{ name: "=HYPERLINK(\"x\")", staked: "@SUM(A1)", apr: -2 }], columns);
    const [, line] = csv.split("\r\n");
    expect(line.startsWith("\"'=HYPERLINK(\"\"x\"\")\"")).toBe(true);
    expect(line).toContain(",'@SUM(A1),");
    // Numbers are data, not formulas: a negative number stays a number.
    expect(line.endsWith(",-2")).toBe(true);
  });

  it("writes only the header for no rows", () => {
    expect(toCsv([], columns)).toBe("Pool,Staked,APR\r\n");
  });
});
