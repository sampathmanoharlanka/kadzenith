import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { AppRole } from "./accounts";

export type Profile = Tables<"profiles">;

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  /** True until we know whether someone is signed in (and who they are). */
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSessionReady(true);
    });

    supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current);
      setSessionReady(true);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  const loadProfile = useCallback(async (id: string) => {
    const [profileResult, roleResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", id).maybeSingle(),
    ]);
    setProfile(profileResult.data ?? null);
    setRole((roleResult.data?.role as AppRole | undefined) ?? null);
    setProfileReady(true);
  }, []);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setRole(null);
      setProfileReady(true);
      return;
    }
    setProfileReady(false);
    // Defer so we never query from inside the auth callback.
    const timer = setTimeout(() => void loadProfile(userId), 0);
    return () => clearTimeout(timer);
  }, [userId, loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (userId) await loadProfile(userId);
  }, [userId, loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      role,
      loading: !sessionReady || !profileReady,
      refreshProfile,
      signOut,
    }),
    [session, profile, role, sessionReady, profileReady, refreshProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

/** For pages behind the auth guard, where a profile always exists. */
export function useProfile() {
  const { profile } = useAuth();
  if (!profile) throw new Error("useProfile called without a signed-in profile");
  return profile;
}

export async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
