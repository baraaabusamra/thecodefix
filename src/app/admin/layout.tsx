import { resolveAdmin } from "@/lib/admin-access";
import { capabilitiesFor } from "@/lib/rbac";
import Sidebar, { MobileAdminNav } from "./_components/Sidebar";
import AdminCommandPalette from "./_components/AdminCommandPalette";
import { GateScreen, AdminGate, SignInPrompt, Forbidden } from "./_components/gates";

// Shared admin shell: resolves access once for every /admin/* route, then
// renders the capability-aware sidebar. Per-section pages additionally check
// their own capability (defense in depth — Server Actions are also re-checked).
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await resolveAdmin();

  if (!access.ok) {
    return (
      <GateScreen>
        {access.mode === "token" ? (
          <AdminGate />
        ) : access.reason === "signin" ? (
          <SignInPrompt />
        ) : (
          <Forbidden role={access.role} />
        )}
      </GateScreen>
    );
  }

  return (
    <div>
      <MobileAdminNav role={access.role} caps={capabilitiesFor(access.role)} />
      <div className="mx-auto flex max-w-7xl">
        <Sidebar
          role={access.role}
          caps={capabilitiesFor(access.role)}
          mode={access.mode}
        />
        <div className="min-w-0 flex-1 px-4 py-8 md:px-8">{children}</div>
      </div>
      <AdminCommandPalette role={access.role} />
    </div>
  );
}
