import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Booking } from "@/lib/booking";

/**
 * Listens for booking changes (new requests, accepts, status updates) and
 * refreshes any booking lists on screen. Optional filter, e.g. `id=eq.<uuid>`.
 */
export function useBookingsRealtime(
  filter?: string,
  onEvent?: (payload: RealtimePostgresChangesPayload<Booking>) => void,
) {
  const queryClient = useQueryClient();
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const channel = supabase
      .channel(`bookings-${filter ?? "all"}-${Math.random().toString(36).slice(2)}`)
      .on<Booking>(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", ...(filter ? { filter } : {}) },
        (payload) => {
          void queryClient.invalidateQueries({ queryKey: ["bookings"] });
          onEventRef.current?.(payload);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [filter, queryClient]);
}
