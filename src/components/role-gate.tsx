import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";

import { SplashScreen } from "@/components/splash-screen";
import { ROLE_HOME, type AppRole } from "@/lib/accounts";
import { useAuth } from "@/lib/auth";

/** Keeps each role inside its own part of the app. */
export function RoleGate({ role, children }: { role: AppRole; children: ReactNode }) {
  const { role: current } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (current && current !== role) navigate({ to: ROLE_HOME[current], replace: true });
  }, [current, role, navigate]);

  if (current !== role) return <SplashScreen animated={false} />;
  return <>{children}</>;
}
