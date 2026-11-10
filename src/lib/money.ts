/** Largest amount storable in a Postgres INT column of cents: $21,474,836.47. */
export const MAX_AMOUNT_CENTS = 2_147_483_647;

/**
 * Parse a user-typed dollar amount ("1,234.56", "$950", " 12 ") into integer cents.
 * Returns null for empty input, and NaN for anything invalid (negative, more than
 * two decimals, non-numeric, or above MAX_AMOUNT_CENTS). Never uses float math on
 * the fractional part, so "0.29" is exactly 29 cents.
 */
export function parseDollarsToCents(input: string | null | undefined): number | null {
  const raw = (input ?? "").trim();
  if (raw === "") return null;
  const cleaned = raw.replace(/^\$/, "").replace(/,/g, "");
  const m = cleaned.match(/^(\d{1,9})(?:\.(\d{1,2}))?$/);
  if (!m || !m[1]) return Number.NaN;
  const cents = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  return cents > MAX_AMOUNT_CENTS ? Number.NaN : cents;
}
