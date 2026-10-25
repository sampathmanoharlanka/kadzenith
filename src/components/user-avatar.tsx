import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Photos live in a private bucket, so we ask for a short-lived link. */
export function useAvatarUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["avatar", path],
    enabled: Boolean(path),
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  }).data;
}

export function UserAvatar({
  name,
  path,
  className,
}: {
  name: string;
  path?: string | null;
  className?: string;
}) {
  const url = useAvatarUrl(path);

  return (
    <span
      className={cn(
        "relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-leaf-soft font-display text-sm font-bold text-primary",
        className,
      )}
    >
      {url ? (
        <img src={url} alt={name} className="size-full object-cover" />
      ) : (
        <span aria-hidden="true">{initials(name) || "?"}</span>
      )}
    </span>
  );
}
