import { Outlet, createFileRoute } from "@tanstack/react-router";

import { RoleGate } from "@/components/role-gate";

export const Route = createFileRoute("/_authed/crp")({
  component: () => (
    <RoleGate role="crp">
      <Outlet />
    </RoleGate>
  ),
});
