import { KadLogo } from "@/components/kad-logo";

export function SplashScreen({ animated = true }: { animated?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6">
      <KadLogo animated={animated} className="text-7xl" />
      <p
        className="text-sm font-medium tracking-wide text-muted-foreground animate-kad-rise"
        style={{ animationDelay: "0.9s" }}
      >
        Natural farming, together · సహజ వ్యవసాయం
      </p>
    </div>
  );
}
