// Single source of truth for currency and date display formatting.
// Previously each page re-implemented these locally, and the same ISO
// datetime bug (appending "T00:00:00" onto a string that already had a
// time component, producing an unparseable date) had to be fixed
// independently in 5 different files. Centralizing here means that class
// of bug can only exist in one place.

export function fmtCurrency(val: number | string | null | undefined): string {
  if (val == null) return "—";
  return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

// Accepts either a bare "YYYY-MM-DD" or a full ISO datetime string — the
// API returns DateTime fields as full ISO strings, so this always takes
// just the date portion before constructing a local-midnight Date, rather
// than blindly appending "T00:00:00" onto whatever it was given.
export function fmtDate(
  isoDate: string | null | undefined,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS,
): string {
  if (!isoDate) return "—";
  const dateOnly = isoDate.slice(0, 10);
  return new Date(`${dateOnly}T00:00:00`).toLocaleDateString("en-IN", options);
}

// "Today" / "Tomorrow" relative label, falling back to fmtDate's normal
// formatting for any other date. Used by schedule-shortcut UI (e.g. the
// Driver app's job list) — kept separate from fmtDate since it's a
// distinct relative-labeling behavior, not just another date format.
export function fmtDateRelative(
  isoDate: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!isoDate) return "—";
  const dateOnly = isoDate.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  if (dateOnly === today) return "Today";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateOnly === tomorrow.toISOString().slice(0, 10)) return "Tomorrow";
  return fmtDate(dateOnly, options);
}
