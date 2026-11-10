/** Time zone for entering and showing times. Configurable; defaults to US Central. */
export const APP_TIME_ZONE = process.env.JARVIS_TIME_ZONE || "America/Chicago";

function offsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - utcMs;
}

/**
 * Convert a wall-clock time typed in a form ("2026-11-12T09:30", no zone) in
 * `timeZone` to a real instant. Returns null for malformed input.
 */
export function zonedLocalToUtc(local: string, timeZone: string = APP_TIME_ZONE): Date | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number) as [number, number, number, number, number, number];
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  if (Number.isNaN(wall) || new Date(wall).getUTCDate() !== d || new Date(wall).getUTCHours() !== h)
    return null;
  // Two passes handle DST boundaries.
  let utc = wall - offsetMs(wall, timeZone);
  utc = wall - offsetMs(utc, timeZone);
  return new Date(utc);
}

export const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
