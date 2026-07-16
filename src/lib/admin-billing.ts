import { db } from "@/db";
import {
  subscriptions,
  organizations,
  organizationMembers,
  users,
} from "@/db/schema";
import { desc, eq, count } from "drizzle-orm";
import type { Organization } from "@/db/schema";
import type { billingStatus } from "@/db/schema";

// Query helpers for the admin billing section. Return `null` when the database
// is not configured so the page can render a "connect the database" state.

type BillingStatus = (typeof billingStatus.enumValues)[number];

export type SubscriptionRow = {
  id: string;
  status: BillingStatus;
  plan: string;
  currentPeriodEnd: Date | null;
  userName: string | null;
  userEmail: string | null;
};

export async function listSubscriptions(): Promise<SubscriptionRow[] | null> {
  if (!db) return null;
  return db
    .select({
      id: subscriptions.id,
      status: subscriptions.status,
      plan: subscriptions.plan,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      userName: users.name,
      userEmail: users.email,
    })
    .from(subscriptions)
    .leftJoin(users, eq(subscriptions.userId, users.id))
    .orderBy(desc(subscriptions.createdAt));
}

export type OrganizationRow = Organization & { seatsUsed: number };

export async function listOrganizations(): Promise<OrganizationRow[] | null> {
  if (!db) return null;
  const orgs = await db
    .select()
    .from(organizations)
    .orderBy(desc(organizations.createdAt));

  const usage = await db
    .select({
      orgId: organizationMembers.organizationId,
      used: count(),
    })
    .from(organizationMembers)
    .groupBy(organizationMembers.organizationId);

  const usedByOrg = new Map(usage.map((u) => [u.orgId, Number(u.used)]));
  return orgs.map((o) => ({ ...o, seatsUsed: usedByOrg.get(o.id) ?? 0 }));
}
