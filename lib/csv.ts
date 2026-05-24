function escapeCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s =
    typeof v === "object" && v !== null
      ? JSON.stringify(v)
      : String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const headers = new Set<string>();
  for (const row of rows) {
    for (const k of Object.keys(row)) headers.add(k);
  }
  const cols = [...headers];
  const lines = [cols.join(",")];
  for (const row of rows) {
    lines.push(cols.map((c) => escapeCell(row[c])).join(","));
  }
  // Excel-friendly UTF-8 with BOM
  return lines.join("\n");
}

export function csvFilename(table: string): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `phynance-${table}-${stamp}.csv`;
}

export function jsonFilename(): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
  return `phynance-export-${stamp}.json`;
}
