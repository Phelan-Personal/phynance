export function toIsoDate(input: string | undefined | null): string {
  if (!input) return todayIso();
  const s = String(input).trim();
  if (!s) return todayIso();

  // ISO-ish: 2026-05-23, 2026-05-23T00:00:00Z
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  // US slash: 5/23/2026 or 05/23/2026
  const slashMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (slashMatch) {
    let [, mo, da, yr] = slashMatch;
    if (yr.length === 2) yr = (Number(yr) > 50 ? "19" : "20") + yr;
    const m = mo.padStart(2, "0");
    const d = da.padStart(2, "0");
    return `${yr}-${m}-${d}`;
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return todayIso();
}

export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7); // YYYY-MM
}

export function monthLabel(isoMonth: string): string {
  // isoMonth = YYYY-MM
  const [y, m] = isoMonth.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

export function lastNMonthKeys(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    out.push(`${d.getFullYear()}-${m}`);
  }
  return out;
}
