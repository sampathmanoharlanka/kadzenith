import type { Tables } from "@/integrations/supabase/types";

export type Booking = Tables<"bookings">;
export type BookingStatus = "requested" | "accepted" | "in_progress" | "completed" | "cancelled";
export type WorkType = Tables<"work_types">;

export const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: "Finding labour",
  accepted: "Labour on the way",
  in_progress: "Work in progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const STATUS_STEPS: BookingStatus[] = ["requested", "accepted", "in_progress", "completed"];

export const MIN_HOURS = 1;
export const MAX_HOURS = 12;

/** Start times offered in the booking sheet: 6 AM to 4 PM every half hour. */
export const START_TIMES = Array.from({ length: 21 }, (_, i) => {
  const minutes = 6 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

export function clampHours(hours: number) {
  return Math.min(MAX_HOURS, Math.max(MIN_HOURS, Math.round(hours)));
}

/** Same formula the database uses, so the farmer sees the real price up front. */
export function bookingTotal(ratePerHour: number, hours: number) {
  return Math.round(ratePerHour * clampHours(hours) * 100) / 100;
}

export function isActive(status: string) {
  return status === "requested" || status === "accepted" || status === "in_progress";
}
