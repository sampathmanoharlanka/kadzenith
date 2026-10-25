import { Outlet, createFileRoute } from "@tanstack/react-router";

import { RoleGate } from "@/components/role-gate";

export const Route = createFileRoute("/_authed/farmer")({
  component: () => (
    <RoleGate role="farmer">
      <Outlet />
    </RoleGate>
  ),
});
