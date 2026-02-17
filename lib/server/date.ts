const DEFAULT_TIME_ZONE = "UTC";

function formatDateKeyForTimeZone(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error("Unable to format date key.");
  }
  return `${year}-${month}-${day}`;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function resolveTimeZone(timeZone: string | null | undefined): string {
  const candidate = timeZone?.trim();
  if (candidate && isValidTimeZone(candidate)) {
    return candidate;
  }
  return DEFAULT_TIME_ZONE;
}

export function getDateKey(date = new Date()): string {
  return formatDateKeyForTimeZone(date, DEFAULT_TIME_ZONE);
}

export function getDateKeyForTimeZone(timeZone: string | null | undefined, date = new Date()): string {
  return formatDateKeyForTimeZone(date, resolveTimeZone(timeZone));
}
