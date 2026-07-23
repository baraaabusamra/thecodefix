import { eq, and, inArray } from "drizzle-orm";
import { requireDb } from "@/db";
import { organizations, organizationMembers, users, userProgress } from "@/db/schema";

export type OrgWithMembers = {
  id: string;
  name: string;
  seatsTotal: number;
  status: string;
  members: {
    userId: string | null;
    email: string;
    name: string | null;
    status: string;
    completedLessons: number;
  }[];
};

export async function getOrganizationWithProgress(orgId: string): Promise<OrgWithMembers | null> {
  const db = requireDb();

  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (!org[0]) return null;

  const members = await db
    .select({
      userId: organizationMembers.userId,
      email: organizationMembers.email,
      status: organizationMembers.status,
    })
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, orgId));

  const userIds = members.map((m) => m.userId).filter(Boolean) as string[];

  const userRows = userIds.length > 0
    ? await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, userIds))
    : [];

  const nameMap = new Map(userRows.map((u) => [u.id, u.name]));

  const progressRows = userIds.length > 0
    ? await db
        .select()
        .from(userProgress)
        .where(inArray(userProgress.userId, userIds))
    : [];

  const progressMap = new Map<string, { data: string }>();
  for (const p of progressRows) {
    progressMap.set(p.userId, { data: p.data });
  }

  return {
    id: org[0].id,
    name: org[0].name,
    seatsTotal: org[0].seatsTotal,
    status: org[0].status,
    members: members.map((m) => {
      const data = m.userId ? progressMap.get(m.userId)?.data : null;
      let completedLessons = 0;
      if (data) {
        try {
          const parsed = JSON.parse(data);
          completedLessons = Object.values(parsed.completedLessons ?? {}).reduce(
            (n: number, l: unknown) => n + ((l as string[]).length ?? 0),
            0,
          );
        } catch { /* ignore */ }
      }
      return {
        userId: m.userId,
        email: m.email,
        name: m.userId ? nameMap.get(m.userId) ?? null : null,
        status: m.status,
        completedLessons,
      };
    }),
  };
}
