"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { writeRawLesson, isContentWritable } from "@/lib/admin-content";
import { requireDb } from "@/db";
import { contentTracks, contentLessons } from "@/db/schema";
import { slugify } from "@/lib/admin-cms";
import { formSchema, safeText, safeTextOptional } from "@/lib/validation";
import { checkRateLimit, rateLimitKey, getClientIp, Limits } from "@/lib/rate-limit";

async function assertContentAccess() {
  const access = await resolveAdmin();
  if (!access.ok || !can(access.role, "content:edit")) {
    throw new Error("Forbidden");
  }
}

function revalidateContent(track?: string, slug?: string) {
  revalidatePath("/");
  revalidatePath("/learn");
  revalidatePath("/sitemap.xml");
  if (track) revalidatePath(`/learn/${track}`);
  if (track && slug) revalidatePath(`/learn/${track}/${slug}`);
}

const saveLessonSchema = formSchema({
  track: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  content: z.string().max(100000),
});

export async function saveLesson(formData: FormData) {
  await assertContentAccess();
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-cms", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  if (!isContentWritable()) throw new Error("Content is read-only in production.");
  const parsed = saveLessonSchema.safeParse(formData);
  if (!parsed.success) throw new Error("Missing track or slug.");
  const { track, slug, content } = parsed.data;

  writeRawLesson(track, slug, content);
  revalidatePath(`/admin/content/${track}/${slug}`);
  revalidatePath(`/learn/${track}/${slug}`);
  redirect(`/admin/content/${track}/${slug}?saved=1`);
}

const createTrackSchema = formSchema({
  slug: z.string().min(1).max(100),
  title: safeText,
  icon: z.string().max(20).default("📦"),
  color: z.string().max(20).default("#B026FF"),
  description: safeTextOptional,
});

export async function createTrack(formData: FormData) {
  await assertContentAccess();
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-cms", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = createTrackSchema.safeParse(formData);
  if (!parsed.success) redirect("/admin/content?error=track");
  const db = requireDb();
  const { slug, title, icon, color, description } = parsed.data;

  await db
    .insert(contentTracks)
    .values({ slug, title, icon, color, description, order: 100 })
    .onConflictDoNothing();
  revalidateContent();
  redirect("/admin/content?saved=track");
}

const createLessonSchema = formSchema({
  track: z.string().min(1).max(100),
  title: safeText,
  slug: z.string().max(100).optional().default(""),
  order: z.coerce.number().int().min(0).max(9999).default(100),
});

export async function createLesson(formData: FormData) {
  await assertContentAccess();
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-cms", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = createLessonSchema.safeParse(formData);
  if (!parsed.success) redirect("/admin/content?error=lesson");
  const db = requireDb();
  const { track, title, slug: rawSlug, order } = parsed.data;
  const slug = rawSlug ? slugify(rawSlug) : slugify(title);

  const [row] = await db
    .insert(contentLessons)
    .values({ track, slug, title, order, content: `# ${title}\n` })
    .onConflictDoNothing()
    .returning({ id: contentLessons.id });
  revalidateContent(track, slug);
  if (row) redirect(`/admin/content/db/${row.id}?saved=1`);
  redirect("/admin/content?error=lesson");
}

const updateLessonSchema = formSchema({
  id: z.string().min(1),
  title: safeText,
  description: safeTextOptional,
  order: z.coerce.number().int().min(0).max(9999).default(100),
  keywords: safeTextOptional,
  content: z.string().max(100000).default(""),
  published: z.string().optional().default(""),
});

export async function updateDbLesson(formData: FormData) {
  await assertContentAccess();
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-cms", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = updateLessonSchema.safeParse(formData);
  if (!parsed.success) throw new Error("Missing id.");
  const db = requireDb();
  const { id, title, description, order, keywords, content, published } = parsed.data;

  const [current] = await db
    .select({ status: contentLessons.status })
    .from(contentLessons)
    .where(eq(contentLessons.id, id))
    .limit(1);
  const isPublished = published === "on";
  const status = isPublished
    ? ("published" as const)
    : current?.status === "published"
      ? ("draft" as const)
      : current?.status;

  // Keep the Operations review workflow in sync with the publish checkbox:
  // checking it publishes; unchecking a published lesson drops it to draft,
  // but an in-review/suspended lesson keeps its workflow state.
  const [current] = await db
    .select({ status: contentLessons.status })
    .from(contentLessons)
    .where(eq(contentLessons.id, id))
    .limit(1);
  const status = published
    ? ("published" as const)
    : current?.status === "published"
      ? ("draft" as const)
      : current?.status;

  const [row] = await db
    .update(contentLessons)
    .set({ title, description, order, keywords, content, published, status, updatedAt: new Date() })
    .where(eq(contentLessons.id, id))
    .returning({ track: contentLessons.track, slug: contentLessons.slug });
  if (row) revalidateContent(row.track, row.slug);
  redirect(`/admin/content/db/${id}?saved=1`);
}

export async function deleteDbLesson(formData: FormData) {
  await assertContentAccess();
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-cms", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = z.object({ id: z.string().min(1) }).safeParse({ id: formData.get("id") });
  if (!parsed.success) throw new Error("Missing id.");
  const db = requireDb();
  const { id } = parsed.data;
  const [row] = await db
    .delete(contentLessons)
    .where(eq(contentLessons.id, id))
    .returning({ track: contentLessons.track, slug: contentLessons.slug });
  if (row) revalidateContent(row.track, row.slug);
  redirect("/admin/content?saved=deleted");
}

export async function deleteTrack(formData: FormData) {
  await assertContentAccess();
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-cms", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = z.object({ slug: z.string().min(1).max(100) }).safeParse({ slug: formData.get("slug") });
  if (!parsed.success) throw new Error("Missing slug.");
  const db = requireDb();
  const { slug } = parsed.data;
  await db.delete(contentLessons).where(eq(contentLessons.track, slug));
  await db.delete(contentTracks).where(eq(contentTracks.slug, slug));
  revalidateContent();
  redirect("/admin/content?saved=deleted");
}
