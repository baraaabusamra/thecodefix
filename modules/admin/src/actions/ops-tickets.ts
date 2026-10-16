"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@tcf/identity/auth";
import { requireDb } from "@tcf/db";
import { tickets, ticketReplies, users, auditLogs } from "@tcf/db/schema";
import { assertOps } from "../operations";

const STATUSES = new Set(["new", "in_progress", "closed"]);
const PRIORITIES = new Set(["low", "normal", "high"]);

const LIST = "/admin/operations/tickets";

function revalidateTicket(id?: string) {
  revalidatePath(LIST);
  if (id) revalidatePath(`${LIST}/${id}`);
}

export async function createTicket(formData: FormData) {
  await assertOps();
  const db = requireDb();

  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const priority = String(formData.get("priority") ?? "normal");
  const requesterEmail =
    String(formData.get("requesterEmail") ?? "").trim() || null;
  if (!subject || !PRIORITIES.has(priority)) redirect(`${LIST}?error=create`);

  // Link the requester's account when the email matches a registered user.
  let userId: string | null = null;
  if (requesterEmail) {
    const [u] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, requesterEmail))
      .limit(1);
    userId = u?.id ?? null;
  }

  const [row] = await db
    .insert(tickets)
    .values({
      subject,
      body,
      priority: priority as typeof tickets.$inferInsert.priority,
      requesterEmail,
      userId,
    })
    .returning({ id: tickets.id });
  revalidateTicket(row.id);
  redirect(`${LIST}/${row.id}?saved=1`);
}

export async function updateTicket(formData: FormData) {
  await assertOps();
  const db = requireDb();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const priority = String(formData.get("priority") ?? "");
  const assigneeId = String(formData.get("assigneeId") ?? "") || null;
  if (!id || !STATUSES.has(status) || !PRIORITIES.has(priority)) {
    throw new Error("Invalid input.");
  }

  await db
    .update(tickets)
    .set({
      status: status as typeof tickets.$inferInsert.status,
      priority: priority as typeof tickets.$inferInsert.priority,
      assigneeId,
      updatedAt: new Date(),
    })
    .where(eq(tickets.id, id));
  revalidateTicket(id);
  redirect(`${LIST}/${id}?saved=1`);
}

export async function addTicketReply(formData: FormData) {
  await assertOps();
  const db = requireDb();

  const ticketId = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const internal = formData.get("internal") === "on";
  if (!ticketId || !body) throw new Error("Invalid input.");

  const session = await auth();
  await db.insert(ticketReplies).values({
    ticketId,
    body,
    internal,
    authorId: session?.user?.id ?? null,
  });
  await db
    .update(tickets)
    .set({ updatedAt: new Date() })
    .where(eq(tickets.id, ticketId));
  revalidateTicket(ticketId);
  redirect(`${LIST}/${ticketId}?saved=reply`);
}

export async function deleteTicket(formData: FormData) {
  await assertOps();
  const db = requireDb();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Invalid input.");

  await db.delete(tickets).where(eq(tickets.id, id));
  const session = await auth();
  await db.insert(auditLogs).values({
    userId: session?.user?.id ?? null,
    action: "ticket.delete",
    target: id,
  });
  revalidateTicket();
  redirect(`${LIST}?saved=deleted`);
}
