import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { SplashScreen } from "@/components/splash-screen";
import { ROLE_HOME } from "@/lib/accounts";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KAD — Natural farming companion for farmers, labour & CRPs" },
      {
        name: "description",
        content:
          "Book farm labour like a ride, see your soil and leaf colour test results, follow natural farming schedules and ask KAD Mitra in Telugu or English.",
      },
      { property: "og:title", content: "KAD — Natural farming companion" },
      {
        property: "og:description",
        content: "Labour booking, soil & LCC results, natural farming schedules and a voice AI farming expert.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Splash,
});

const SPLASH_MS = 2400;

function Splash() {
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();
  const [animationDone, setAnimationDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimationDone(true), SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!animationDone || loading) return;
    if (session && role) navigate({ to: ROLE_HOME[role], replace: true });
    else navigate({ to: "/login", replace: true });
  }, [animationDone, loading, session, role, navigate]);

  return <SplashScreen />;
}
