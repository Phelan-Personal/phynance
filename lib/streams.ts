import type { IncomeStream } from "@/types";

export function todayMonthIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function isStreamCurrentlyActive(s: IncomeStream): boolean {
  const today = todayMonthIso();
  if (s.start_month && today < s.start_month) return false;
  if (s.end_month && today > s.end_month) return false;
  return true;
}

export function isStreamEnded(s: IncomeStream): boolean {
  if (!s.end_month) return false;
  return todayMonthIso() > s.end_month;
}

export function monthsBetween(startIso: string, endIso: string): number {
  const [ya, ma] = startIso.slice(0, 7).split("-").map(Number);
  const [yb, mb] = endIso.slice(0, 7).split("-").map(Number);
  return Math.max(0, (yb - ya) * 12 + (mb - ma) + 1); // inclusive of both ends
}

export function fmtMonthIso(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m] = iso.slice(0, 7).split("-").map(Number);
  if (!y || !m) return "";
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function contractDurationLabel(s: IncomeStream): string | null {
  if (!s.start_month && !s.end_month) return null;
  if (s.start_month && s.end_month) {
    const mo = monthsBetween(s.start_month, s.end_month);
    const years = Math.floor(mo / 12);
    const rem = mo % 12;
    const length =
      years > 0
        ? rem > 0
          ? `${years}y ${rem}mo`
          : `${years}y`
        : `${mo} mo`;
    return `${fmtMonthIso(s.start_month)} — ${fmtMonthIso(s.end_month)} · ${length}`;
  }
  if (s.start_month) {
    return `Since ${fmtMonthIso(s.start_month)}`;
  }
  // end_month only
  return `Ends ${fmtMonthIso(s.end_month)}`;
}

/** Sum of avg_monthly for streams currently active today. */
export function activeGrossMonthly(streams: IncomeStream[]): number {
  return streams.reduce(
    (a, s) =>
      isStreamCurrentlyActive(s) ? a + Number(s.avg_monthly || 0) : a,
    0
  );
}
