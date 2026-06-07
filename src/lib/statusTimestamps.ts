export function appendStatusTimestamp(
  current: Record<string, string> | null | undefined,
  status: string,
): Record<string, string> {
  return { ...(current || {}), [status]: new Date().toISOString() };
}
