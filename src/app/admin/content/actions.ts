"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { writeRawLesson, isContentWritable } from "@/lib/admin-content";
import { requireDb } from "@/db";
import { contentTracks, contentLessons } from "@/db/schema";
import { slugify } from "@/lib/admin-cms";
import { validateUntrustedMdx } from "@/lib/mdx-untrusted";

async function assertContentAccess() {
  const access = await resolveAdmin();
  if (!access.ok || !can(access.role, "content:edit")) {
    throw new Error("Forbidden");
  }
}

// Re-renders the listing pages (and the affected track/lesson) so new or
// edited CMS content appears on the live site immediately (on-demand ISR).
// Also busts the "content" tag so the cached command-palette search index
// (src/lib/search-index.ts) picks up the change on other pages too, not
// just the paths revalidated above. updateTag (not revalidateTag) is used
// deliberately: this runs inside a Server Action and admins expect to see
// their own edit in search immediately (read-your-own-writes) — revalidateTag
// with the recommended "max" profile is stale-while-revalidate and can still
// serve the pre-edit index on the very next request.
function revalidateContent(track?: string, slug?: string) {
  revalidatePath("/");
  revalidatePath("/learn");
  revalidatePath("/sitemap.xml");
  if (track) revalidatePath(`/learn/${track}`);
  if (track && slug) revalidatePath(`/learn/${track}/${slug}`);
  updateTag("content");
}

// ── File-based editor (dev-only) ─────────────────────────────────────
export async function saveLesson(formData: FormData) {
  await assertContentAccess();
  if (!isContentWritable()) {
    throw new Error("Content is read-only in production.");
  }

  const track = String(formData.get("track") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const content = String(formData.get("content") ?? "");
  if (!track || !slug) throw new Error("Missing track or slug.");

  writeRawLesson(track, slug, content);
  revalidatePath(`/admin/content/${track}/${slug}`);
  revalidatePath(`/learn/${track}/${slug}`);
  redirect(`/admin/content/${track}/${slug}?saved=1`);
}

// ── CMS: database-backed tracks & lessons (work in production) ────────
export async function createTrack(formData: FormData) {
  await assertContentAccess();
  const db = requireDb();
  const slug = slugify(String(formData.get("slug") ?? ""));
  const title = String(formData.get("title") ?? "").trim();
  if (!slug || !title) redirect("/admin/content?error=track");

  const icon = String(formData.get("icon") ?? "").trim() || "📦";
  const color = String(formData.get("color") ?? "").trim() || "#B026FF";
  const description = String(formData.get("description") ?? "").trim();

  await db
    .insert(contentTracks)
    .values({ slug, title, icon, color, description, order: 100 })
    .onConflictDoNothing();
  revalidateContent();
  redirect("/admin/content?saved=track");
}

export async function createLesson(formData: FormData) {
  await assertContentAccess();
  const db = requireDb();
  const track = String(formData.get("track") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? "") || title);
  if (!track || !title || !slug) redirect("/admin/content?error=lesson");

  const order = Number(formData.get("order")) || 100;
  // The title is interpolated into MDX, so it goes through the same gate.
  const content = `# ${title}\n`;
  if ((await validateUntrustedMdx(content)).length > 0) {
    redirect("/admin/content?error=lesson");
  }
  const [row] = await db
    .insert(contentLessons)
    .values({ track, slug, title, order, content })
    .onConflictDoNothing()
    .returning({ id: contentLessons.id });
  revalidateContent(track, slug);
  if (row) redirect(`/admin/content/db/${row.id}?saved=1`);
  redirect("/admin/content?error=lesson");
}

export async function updateDbLesson(formData: FormData) {
  await assertContentAccess();
  const db = requireDb();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id.");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const order = Number(formData.get("order")) || 100;
  const keywords = String(formData.get("keywords") ?? "").trim() || null;
  const content = String(formData.get("content") ?? "");
  const published = formData.get("published") === "on";

  // CMS MDX is untrusted: refuse to persist anything outside the allowlist
  // (render time sanitizes again for rows saved before this check existed).
  const problems = await validateUntrustedMdx(content);
  if (problems.length > 0) {
    const detail = encodeURIComponent(problems.slice(0, 5).join(" • "));
    redirect(`/admin/content/db/${id}?error=mdx&detail=${detail}`);
  }

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
  const db = requireDb();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id.");
  const [row] = await db
    .delete(contentLessons)
    .where(eq(contentLessons.id, id))
    .returning({ track: contentLessons.track, slug: contentLessons.slug });
  if (row) revalidateContent(row.track, row.slug);
  redirect("/admin/content?saved=deleted");
}

export async function deleteTrack(formData: FormData) {
  await assertContentAccess();
  const db = requireDb();
  const slug = String(formData.get("slug") ?? "");
  if (!slug) throw new Error("Missing slug.");
  await db.delete(contentLessons).where(eq(contentLessons.track, slug));
  await db.delete(contentTracks).where(eq(contentTracks.slug, slug));
  revalidateContent();
  redirect("/admin/content?saved=deleted");
}
