type DaySchedule = { active: boolean; start: string; end: string };
type StoreScheduleDetails = {
  mode: "weekly" | "daily";
  days: Partial<Record<string, DaySchedule>>;
};

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

export function isStoreOpen(store: {
  openTime: string | null;
  closeTime: string | null;
  scheduleDays: string[];
  scheduleDetails?: unknown;
}): boolean {
  const details = store.scheduleDetails as StoreScheduleDetails | null;
  if (details && details.days && Object.keys(details.days).length > 0) {
    const { day, nowMinutes } = getMexicoCityTime();
    const daySchedule = details.days[day];
    if (!daySchedule || !daySchedule.active) return false;
    if (!daySchedule.start || !daySchedule.end) return true;

    const [openH, openM] = daySchedule.start.split(":").map(Number);
    const [closeH, closeM] = daySchedule.end.split(":").map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    if (closeMinutes <= openMinutes) {
      return nowMinutes >= openMinutes || nowMinutes < closeMinutes;
    }
    return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
  }

  if (!store.openTime || !store.closeTime) return true;
  if (store.scheduleDays.length === 0) return false;

  const { day, nowMinutes } = getMexicoCityTime();
  if (!store.scheduleDays.includes(day)) return false;

  const [openH, openM] = store.openTime.split(":").map(Number);
  const [closeH, closeM] = store.closeTime.split(":").map(Number);
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
