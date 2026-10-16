import { db } from "@tcf/db";
import { outreachContacts, users } from "@tcf/db/schema";
import { asc, desc, eq } from "drizzle-orm";

// Query helpers for the Outreach tracker (Operations → متابعة التواصل).
// Access asserts reuse assertOps from admin-operations (ops:manage).

export type OutreachRow = {
  id: string;
  guide: "funding" | "instructors";
  category: string;
  name: string;
  description: string | null;
  url: string | null;
  status: "todo" | "contacted" | "replied" | "done" | "rejected";
  report: string | null;
  updatedByName: string | null;
  updatedAt: Date;
};

export async function listOutreach(): Promise<OutreachRow[] | null> {
  if (!db) return null;
  return db
    .select({
      id: outreachContacts.id,
      guide: outreachContacts.guide,
      category: outreachContacts.category,
      name: outreachContacts.name,
      description: outreachContacts.description,
      url: outreachContacts.url,
      status: outreachContacts.status,
      report: outreachContacts.report,
      updatedByName: users.name,
      updatedAt: outreachContacts.updatedAt,
    })
    .from(outreachContacts)
    .leftJoin(users, eq(outreachContacts.updatedBy, users.id))
    .orderBy(asc(outreachContacts.category), desc(outreachContacts.createdAt));
}
