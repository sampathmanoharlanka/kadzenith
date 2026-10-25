import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }) {
  if (error) throw new Error(error.message);
  return data as T;
}

export const workTypesQuery = queryOptions({
  queryKey: ["work-types"],
  queryFn: async () =>
    unwrap(await supabase.from("work_types").select("*").order("sort_order")),
  staleTime: 5 * 60 * 1000,
});

export const farmerBookingsQuery = (farmerId: string) =>
  queryOptions({
    queryKey: ["bookings", "farmer", farmerId],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("bookings")
          .select("*")
          .eq("farmer_id", farmerId)
          .order("created_at", { ascending: false })
          .limit(30),
      ),
  });

export const bookingQuery = (bookingId: string) =>
  queryOptions({
    queryKey: ["bookings", "detail", bookingId],
    queryFn: async () =>
      unwrap(await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle()),
  });

export const labourJobsQuery = (labourId: string) =>
  queryOptions({
    queryKey: ["bookings", "labour", labourId],
    queryFn: async () => {
      const [open, mine] = await Promise.all([
        supabase
          .from("bookings")
          .select("*")
          .eq("status", "requested")
          .is("labour_id", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("bookings")
          .select("*")
          .eq("labour_id", labourId)
          .order("work_date", { ascending: false })
          .limit(40),
      ]);
      return { open: unwrap(open), mine: unwrap(mine) };
    },
  });

export const soilTestsQuery = (farmerId: string) =>
  queryOptions({
    queryKey: ["soil-tests", farmerId],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("soil_tests")
          .select("*")
          .eq("farmer_id", farmerId)
          .order("tested_on", { ascending: false }),
      ),
  });

export const lccReadingsQuery = (farmerId: string) =>
  queryOptions({
    queryKey: ["lcc", farmerId],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("lcc_readings")
          .select("*")
          .eq("farmer_id", farmerId)
          .order("tested_on", { ascending: false }),
      ),
  });

/** A farmer's schedule = items made just for them + items for every farmer. */
export const farmerSchedulesQuery = (farmerId: string) =>
  queryOptions({
    queryKey: ["schedules", "farmer", farmerId],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("schedules")
          .select("*")
          .or(`farmer_id.eq.${farmerId},farmer_id.is.null`)
          .order("scheduled_on")
          .order("scheduled_time"),
      ),
  });

export const commonSchedulesQuery = queryOptions({
  queryKey: ["schedules", "common"],
  queryFn: async () =>
    unwrap(
      await supabase
        .from("schedules")
        .select("*")
        .is("farmer_id", null)
        .order("scheduled_on")
        .order("scheduled_time"),
    ),
});

export const farmersQuery = queryOptions({
  queryKey: ["farmers"],
  queryFn: async () => {
    const { data: roles, error } = await supabase.from("user_roles").select("user_id").eq("role", "farmer");
    if (error) throw new Error(error.message);
    const ids = (roles ?? []).map((row) => row.user_id);
    if (!ids.length) return [];
    return unwrap(
      await supabase.from("profiles").select("*").in("id", ids).order("full_name"),
    );
  },
});

export const profileQuery = (id: string) =>
  queryOptions({
    queryKey: ["profile", id],
    queryFn: async () =>
      unwrap(await supabase.from("profiles").select("*").eq("id", id).maybeSingle()),
  });
