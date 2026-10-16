import { resolveAdmin, type AdminAccess } from "./admin-access";
import { can, type Capability } from "./rbac";

// Authorization primitives for privileged server code.
//
// Two separate questions are involved, and this module owns the second one:
//
//   WHO is calling?   -> src/lib/admin-access.ts (resolveAdmin)
//   MAY they do this? -> here
//
// Keeping them apart is deliberate. `resolveAdmin` talks to the session, the
// database and the ADMIN_TOKEN fallback; the capability decision is pure
// policy over the table in src/lib/rbac.ts. Tests can drive a specific caller
// by faking `resolveAdmin` while the real enforcement below still runs.

/**
 * The single authorization gate for admin Server Actions.
 *
 * Server Actions are public HTTP endpoints: the page that rendered the form
 * having checked a capability proves nothing about who POSTs to the action
 * afterwards, so each one re-verifies. Before Phase 2 that re-verification
 * was copy-pasted as the same `resolveAdmin()` + `can()` + `throw` triple in
 * thirteen places — thirteen chances to get the fail-closed direction subtly
 * wrong, and no single place to audit.
 *
 * Fail-closed by construction: it throws unless the caller both resolves to
 * an admin AND holds `cap`. It returns the resolved access so callers can
 * make further capability decisions (content:edit may draft, but only
 * content:publish may go live) without resolving a second time.
 *
 * Throws the bare message "Forbidden", unchanged from the guards it replaced
 * and relied on by tests/rbac-matrix.test.mjs.
 */
export async function requireCapability(
  cap: Capability
): Promise<AdminAccess & { ok: true }> {
  const access = await resolveAdmin();
  if (!access.ok || !can(access.role, cap)) throw new Error("Forbidden");
  return access;
}
