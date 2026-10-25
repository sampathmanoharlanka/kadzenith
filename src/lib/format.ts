import { format, isToday, isTomorrow, parseISO } from "date-fns";

/** 21/10/26 — the short date farmers see on the weather list. */
export function shortDate(date: string | Date) {
  return format(typeof date === "string" ? parseISO(date) : date, "dd/MM/yy");
}

export function friendlyDay(date: string | Date) {
  const value = typeof date === "string" ? parseISO(date) : date;
  if (isToday(value)) return "Today";
  if (isTomorrow(value)) return "Tomorrow";
  return format(value, "EEE, d MMM");
}

/** "06:30:00" → "6:30 AM" */
export function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatRupees(amount: number) {
  return rupees.format(amount);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
