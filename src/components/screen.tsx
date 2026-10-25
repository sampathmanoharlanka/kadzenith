import type { ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  Home,
  IndianRupee,
  MessageCircleHeart,
  Tractor,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import type { AppRole } from "@/lib/accounts";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV: Record<AppRole, NavItem[]> = {
  farmer: [
    { to: "/farmer", label: "Home", icon: Home, exact: true },
    { to: "/farmer/book", label: "Labour", icon: Tractor },
    { to: "/farmer/assistant", label: "Mitra", icon: MessageCircleHeart },
    { to: "/profile", label: "Profile", icon: UserRound },
  ],
  labour: [
    { to: "/labour", label: "Work", icon: ClipboardList, exact: true },
    { to: "/profile", label: "Profile", icon: UserRound },
  ],
  crp: [
    { to: "/crp", label: "Farmers", icon: Users, exact: true },
    { to: "/crp/schedules", label: "Schedules", icon: CalendarClock },
    { to: "/crp/rates", label: "Rates", icon: IndianRupee },
    { to: "/profile", label: "Profile", icon: UserRound },
  ],
};

export function BottomNav() {
  const { role } = useAuth();
  if (!role) return null;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[30rem] border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex">
        {NAV[role].map((item) => (
          <li key={item.to} className="flex-1">
            <Link
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="group flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors data-[status=active]:text-foreground"
            >
              <span className="grid h-7 w-12 place-items-center rounded-full transition-colors group-data-[status=active]:bg-leaf-soft group-data-[status=active]:text-primary">
                <item.icon className="size-[18px]" />
              </span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

interface ScreenProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Shows a back arrow instead of the bottom navigation. */
  back?: boolean;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  hideNav?: boolean;
}

export function Screen({ title, subtitle, back, action, children, className, hideNav }: ScreenProps) {
  const router = useRouter();
  const showNav = !back && !hideNav;

  return (
    <div className={cn("flex min-h-dvh flex-col", showNav && "pb-24")}>
      {(title || back || action) && (
        <header className="sticky top-0 z-20 flex items-center gap-3 bg-background/95 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
          {back && (
            <button
              type="button"
              aria-label="Go back"
              onClick={() => router.history.back()}
              className="-ml-2 grid size-10 shrink-0 place-items-center rounded-full transition-colors hover:bg-muted"
            >
              <ArrowLeft className="size-5" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            {title && <h1 className="truncate text-xl font-bold">{title}</h1>}
            {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <main className={cn("flex-1 px-5", className)}>{children}</main>
      {showNav && <BottomNav />}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-bold">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl bg-muted px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-background text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 font-semibold">{title}</p>
      {children && <p className="mt-1 text-sm text-muted-foreground">{children}</p>}
    </div>
  );
}
