"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { requireCapability } from "@tcf/identity/authorization";
import { can } from "@tcf/identity/rbac";
import { writeRawLesson, isContentWritable } from "@tcf/content/admin/writer";
import { requireDb } from "@tcf/db";
import { contentTracks, contentLessons } from "@tcf/db/schema";
import { slugify } from "@tcf/content/admin/cms";
import { validateUntrustedMdx } from "@tcf/content/mdx-untrusted";

async function assertContentAccess() {
  const access = await requireCapability("content:edit");
  // Editorial approval: only content:publish may make CMS content live, take
  // live content down, or change it. Writers (content:edit only) create and
  // edit drafts and submit them for review.
  return { canPublish: can(access.role, "content:publish") };
}

async function assertPublishAccess() {
  const { canPublish } = await assertContentAccess();
  if (!canPublish) throw new Error("Forbidden");
}

// Live or taken-down lessons are editorial decisions: a writer may not edit,
// republish or delete them (that would bypass review).
function isEditoriallyLocked(status: string | null | undefined, published?: boolean) {
  return published === true || status === "published" || status === "suspended";
}

// Re-renders the listing pages (and the affected track/lesson) so new or
// edited CMS content appears on the live site immediately (on-demand ISR).
// Also busts the "content" tag so the cached command-palette search index
// (packages/content/src/search-index.ts) picks up the change on other pages too, not
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
  // A new track is public immediately (tracks have no draft state).
  await assertPublishAccess();
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
  const { canPublish } = await assertContentAccess();
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
    .values({
      track,
      slug,
      title,
      order,
      content,
      // Publishers keep the existing "live on create" behaviour; a writer's
      // new page starts as an unpublished draft.
      ...(canPublish ? {} : { published: false, status: "draft" as const }),
    })
    .onConflictDoNothing()
    .returning({ id: contentLessons.id });
  revalidateContent(track, slug);
  if (row) redirect(`/admin/content/db/${row.id}?saved=1`);
  redirect("/admin/content?error=lesson");
}

export async function updateDbLesson(formData: FormData) {
  const { canPublish } = await assertContentAccess();
  const db = requireDb();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id.");

  const [current] = await db
    .select({ status: contentLessons.status, published: contentLessons.published })
    .from(contentLessons)
    .where(eq(contentLessons.id, id))
    .limit(1);
  if (!current) throw new Error("Lesson not found.");
  if (!canPublish && isEditoriallyLocked(current.status, current.published)) {
    redirect(`/admin/content/db/${id}?error=locked`);
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const order = Number(formData.get("order")) || 100;
  const keywords = String(formData.get("keywords") ?? "").trim() || null;
  const content = String(formData.get("content") ?? "");
  // Only publishers control visibility. For writers the checkbox is ignored
  // and the lesson stays unpublished: draft, or review when submitted.
  const published = canPublish && formData.get("published") === "on";

  // CMS MDX is untrusted: refuse to persist anything outside the allowlist
  // (render time sanitizes again for rows saved before this check existed).
  const problems = await validateUntrustedMdx(content);
  if (problems.length > 0) {
    const detail = encodeURIComponent(problems.slice(0, 5).join(" • "));
    redirect(`/admin/content/db/${id}?error=mdx&detail=${detail}`);
  }

  // Publishers: keep the Operations review workflow in sync with the publish
  // checkbox — checking it publishes; unchecking a published lesson drops it
  // to draft, but an in-review/suspended lesson keeps its workflow state.
  // Writers: draft, or "review" when they submit it for review.
  const status = !canPublish
    ? formData.get("submitForReview") === "on"
      ? ("review" as const)
      : ("draft" as const)
    : published
      ? ("published" as const)
      : current.status === "published"
        ? ("draft" as const)
        : current.status;

  const [row] = await db
    .update(contentLessons)
    .set({ title, description, order, keywords, content, published, status, updatedAt: new Date() })
    .where(
      canPublish
        ? eq(contentLessons.id, id)
        : // Re-checked atomically: if a publisher made it live meanwhile, a
          // writer's save must not overwrite (and thereby unpublish) it.
          and(
            eq(contentLessons.id, id),
            eq(contentLessons.published, false),
            inArray(contentLessons.status, ["draft", "review"])
          )
    )
    .returning({ track: contentLessons.track, slug: contentLessons.slug });
  if (!row && !canPublish) redirect(`/admin/content/db/${id}?error=locked`);
  if (row) revalidateContent(row.track, row.slug);
  redirect(`/admin/content/db/${id}?saved=1`);
}

export async function deleteDbLesson(formData: FormData) {
  const { canPublish } = await assertContentAccess();
  const db = requireDb();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id.");
  const [row] = await db
    .delete(contentLessons)
    .where(
      canPublish
        ? eq(contentLessons.id, id)
        : // Writers may only delete unpublished drafts/reviews (checked
          // atomically in the DELETE itself).
          and(
            eq(contentLessons.id, id),
            eq(contentLessons.published, false),
            inArray(contentLessons.status, ["draft", "review"])
          )
    )
    .returning({ track: contentLessons.track, slug: contentLessons.slug });
  if (!row && !canPublish) throw new Error("Forbidden");
  if (row) revalidateContent(row.track, row.slug);
  redirect("/admin/content?saved=deleted");
}

export async function deleteTrack(formData: FormData) {
  // Removes live lessons too — an editorial decision.
  await assertPublishAccess();
  const db = requireDb();
  const slug = String(formData.get("slug") ?? "");
  if (!slug) throw new Error("Missing slug.");
  await db.delete(contentLessons).where(eq(contentLessons.track, slug));
  await db.delete(contentTracks).where(eq(contentTracks.slug, slug));
  revalidateContent();
  redirect("/admin/content?saved=deleted");
}
