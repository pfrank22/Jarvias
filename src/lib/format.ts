const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Format integer cents as whole US dollars, e.g. 1234500 -> "$12,345". */
export function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  return usd.format(Math.round(cents / 100));
}

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function formatDate(date: Date | null | undefined): string {
  return date ? dateFmt.format(date) : "—";
}

/** Percent of budget used, clamped to [0, 999]. Zero budget -> 0. */
export function budgetUsedPercent(spentCents: number, budgetCents: number): number {
  if (budgetCents <= 0) return 0;
  return Math.min(999, Math.max(0, Math.round((spentCents / budgetCents) * 100)));
}

/** Whole days from `now` until `date` (negative when overdue). */
export function daysUntil(date: Date, now: Date = new Date()): number {
  const ms = date.getTime() - now.getTime();
  return Math.ceil(ms / 86_400_000);
}

export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
