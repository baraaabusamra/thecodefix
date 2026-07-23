"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { requireDb } from "@/db";
import { tickets, ticketReplies, users, auditLogs } from "@/db/schema";
import { assertOps } from "@/lib/admin-operations";
import { formSchema, safeText, safeLongText, emailField } from "@/lib/validation";
import { checkRateLimit, rateLimitKey, getClientIp, Limits } from "@/lib/rate-limit";

const STATUSES = new Set(["new", "in_progress", "closed"]);
const PRIORITIES = new Set(["low", "normal", "high"]);

const LIST = "/admin/operations/tickets";

function revalidateTicket(id?: string) {
  revalidatePath(LIST);
  if (id) revalidatePath(`${LIST}/${id}`);
}

const createTicketSchema = formSchema({
  subject: safeText,
  body: safeLongText,
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  requesterEmail: emailField,
});

export async function createTicket(formData: FormData) {
  await assertOps();
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-tickets", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = createTicketSchema.safeParse(formData);
  if (!parsed.success) redirect(`${LIST}?error=create`);
  const db = requireDb();
  const { subject, body, priority, requesterEmail } = parsed.data;

  const requesterEmailVal = requesterEmail || null;
  let userId: string | null = null;
  if (requesterEmailVal) {
    const [u] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, requesterEmailVal))
      .limit(1);
    userId = u?.id ?? null;
  }

  const [row] = await db
    .insert(tickets)
    .values({ subject, body, priority, requesterEmail: requesterEmailVal, userId })
    .returning({ id: tickets.id });
  revalidateTicket(row.id);
  redirect(`${LIST}/${row.id}?saved=1`);
}

const updateTicketSchema = formSchema({
  id: z.string().min(1),
  status: z.enum(["new", "in_progress", "closed"]),
  priority: z.enum(["low", "normal", "high"]),
  assigneeId: z.string().optional().default(""),
});

export async function updateTicket(formData: FormData) {
  await assertOps();
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-tickets", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = updateTicketSchema.safeParse(formData);
  if (!parsed.success) throw new Error("Invalid input.");
  const db = requireDb();
  const { id, status, priority, assigneeId } = parsed.data;

  await db
    .update(tickets)
    .set({ status, priority, assigneeId: assigneeId || null, updatedAt: new Date() })
    .where(eq(tickets.id, id));
  revalidateTicket(id);
  redirect(`${LIST}/${id}?saved=1`);
}

const addReplySchema = formSchema({
  ticketId: z.string().min(1),
  body: safeLongText,
  internal: z.string().optional().default(""),
});

export async function addTicketReply(formData: FormData) {
  await assertOps();
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-tickets", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = addReplySchema.safeParse(formData);
  if (!parsed.success) throw new Error("Invalid input.");
  const db = requireDb();
  const { ticketId, body, internal } = parsed.data;

  const session = await auth();
  await db.insert(ticketReplies).values({
    ticketId,
    body,
    internal: internal === "on",
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
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-tickets", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = z.object({ id: z.string().min(1) }).safeParse({
    id: formData.get("id"),
  });
  if (!parsed.success) throw new Error("Invalid input.");
  const db = requireDb();
  const { id } = parsed.data;

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
