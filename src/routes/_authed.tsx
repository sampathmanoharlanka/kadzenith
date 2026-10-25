import { useEffect } from "react";
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";

import { SplashScreen } from "@/components/splash-screen";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authed")({
  component: AuthedLayout,
});

function AuthedLayout() {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const signedIn = Boolean(session && profile);

  useEffect(() => {
    if (!loading && !signedIn) navigate({ to: "/login", replace: true });
  }, [loading, signedIn, navigate]);

  if (loading || !signedIn) return <SplashScreen animated={false} />;
  return <Outlet />;
}
