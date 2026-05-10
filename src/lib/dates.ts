const TIMEZONE = "America/Mexico_City";
const LOCALE = "es-MX";

export function formatDateInMexico(
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(LOCALE, { timeZone: TIMEZONE, ...options });
}

export function formatDateTimeInMexico(
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(LOCALE, { timeZone: TIMEZONE, ...options });
}
