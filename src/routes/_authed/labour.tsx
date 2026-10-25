import { Outlet, createFileRoute } from "@tanstack/react-router";

import { RoleGate } from "@/components/role-gate";

export const Route = createFileRoute("/_authed/labour")({
  component: () => (
    <RoleGate role="labour">
      <Outlet />
    </RoleGate>
  ),
});
