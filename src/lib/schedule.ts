function getMexicoCityTime() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const mexicoOffsetHours = -6;
  const mexicoTime = new Date(utcMs + mexicoOffsetHours * 3600000);

  const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  return {
    day: dayNames[mexicoTime.getUTCDay()],
    hours: mexicoTime.getUTCHours(),
    minutes: mexicoTime.getUTCMinutes(),
    nowMinutes: mexicoTime.getUTCHours() * 60 + mexicoTime.getUTCMinutes(),
    date: mexicoTime,
  };
}

export function isStoreOpen(schedule: {
  openTime: string | null;
  closeTime: string | null;
  scheduleDays: string[];
}): boolean {
  if (!schedule.openTime || !schedule.closeTime) return true;
  if (schedule.scheduleDays.length === 0) return false;

  const { day, nowMinutes } = getMexicoCityTime();
  if (!schedule.scheduleDays.includes(day)) return false;

  const [openH, openM] = schedule.openTime.split(":").map(Number);
  const [closeH, closeM] = schedule.closeTime.split(":").map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  if (closeMinutes <= openMinutes) {
    return nowMinutes >= openMinutes || nowMinutes < closeMinutes;
  }

  return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
}

export function getMexicoTimeString() {
  const { day, hours, minutes } = getMexicoCityTime();
  return `${day} ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}
