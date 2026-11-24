/**
 * Strictly validates a YYYY-MM-DD deal date string and converts it to a UTC ISO string.
 * Rejects malformed strings and non-existent calendar dates (e.g., 2026-02-31) without
 * throwing RangeError or silently rolling over to an arbitrary date.
 */
export function parseValidDealDateIso(dateStr: string): string | null {
  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1) {
    return null;
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}
