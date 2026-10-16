import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db } from "@tcf/db";
import { contentTracks, contentLessons } from "@tcf/db/schema";
import { eq } from "drizzle-orm";
import { contentDir } from "./paths";

const CONTENT_DIR = contentDir("tracks");

// Content lives in two places that are merged transparently:
//  - Files: src/content/tracks/<slug>/ (the original tracks; read-only, so
//    file reads below stay uncached — they're cheap per track/lesson and
//    always correct since nothing else can change them at runtime).
//  - Database: created/edited from the admin CMS; editable in production.
// Public readers below merge both. The DB reads (dbTracks/dbLessons) are
// cached via unstable_cache, tagged "content"/"tracks"/"lessons", instead of
// hitting Neon on every getTracks()/getLessons()/getLesson() call on every
// page render. Admin mutations invalidate via updateTag("content") — see
// revalidateContent() in src/app/admin/content/actions.ts and
// setLessonWorkflow() in src/app/admin/operations/content/actions.ts.

export type TrackMeta = {
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  order: number;
  source: "file" | "db";
};

export type LessonFrontmatter = {
  title: string;
  seoTitle?: string;
  description: string;
  order: number;
  keywords?: string[];
};

export type LessonSummary = {
  slug: string;
  order: number;
} & LessonFrontmatter;

export type Lesson = LessonSummary & {
  track: string;
  content: string;
  source: "file" | "db";
};

// ── File readers (synchronous) ───────────────────────────────────────
function fileTracks(): TrackMeta[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((d) => fs.existsSync(path.join(CONTENT_DIR, d, "_meta.json")))
    .map((slug) => {
      const meta = JSON.parse(
        fs.readFileSync(path.join(CONTENT_DIR, slug, "_meta.json"), "utf-8")
      );
      return { slug, order: 0, source: "file", ...meta } as TrackMeta;
    });
}

function fileLessons(track: string): LessonSummary[] {
  const dir = path.join(CONTENT_DIR, track);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const { data } = matter(raw);
      return {
        slug: file.replace(/\.mdx$/, ""),
        ...(data as LessonFrontmatter),
      };
    });
}

function fileLesson(track: string, slug: string): Lesson | null {
  const file = path.join(CONTENT_DIR, track, `${slug}.mdx`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf-8");
  const { data, content } = matter(raw);
  return {
    track,
    slug,
    content,
    source: "file",
    ...(data as LessonFrontmatter),
  };
}

// ── DB readers (cached across renders/requests) ──────────────────────
// Neither function takes arguments — each always fetches its whole
// (published-only) table — so a single fixed cache key per function is
// correct. "tracks"/"lessons" are split out from the shared "content" tag
// for a future finer-grained invalidation pass; today every admin mutation
// busts "content" (the safe, always-correct choice — see the actions files
// referenced above), which covers both.
//
// Wrapped in both react's cache() and unstable_cache(), not just one:
// unstable_cache() alone persists across requests/builds but only dedupes
// once the first call's cache write has landed — concurrent calls issued
// before that (e.g. generateStaticParams's `Promise.all` over all 51
// tracks, each independently calling this same zero-arg function) each see
// a miss and independently hit the DB. react's cache() memoizes the
// in-flight promise synchronously on first call within one render, so the
// other 50 concurrent callers reuse it instead of racing.
const dbTracks = cache(
  unstable_cache(
    async () => {
      if (!db) return [];
      return db
        .select()
        .from(contentTracks)
        .where(eq(contentTracks.published, true));
    },
    ["db-tracks"],
    { tags: ["content", "tracks"] }
  )
);

const dbLessons = cache(
  unstable_cache(
    async () => {
      if (!db) return [];
      return db
        .select()
        .from(contentLessons)
        .where(eq(contentLessons.published, true));
    },
    ["db-lessons"],
    { tags: ["content", "lessons"] }
  )
);

function parseKeywords(s: string | null): string[] | undefined {
  if (!s) return undefined;
  const arr = s
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  return arr.length ? arr : undefined;
}

// ── Public readers (merge file + DB) ─────────────────────────────────
export async function getTracks(): Promise<TrackMeta[]> {
  const files = fileTracks();
  const fileSlugs = new Set(files.map((t) => t.slug));
  const fromDb: TrackMeta[] = (await dbTracks())
    .filter((t) => !fileSlugs.has(t.slug))
    .map((t) => ({
      slug: t.slug,
      title: t.title,
      description: t.description,
      icon: t.icon,
      color: t.color,
      order: t.order,
      source: "db",
    }));
  return [...files, ...fromDb].sort((a, b) => a.order - b.order);
}

export async function getTrack(slug: string): Promise<TrackMeta | null> {
  return (await getTracks()).find((t) => t.slug === slug) ?? null;
}

export async function getLessons(track: string): Promise<LessonSummary[]> {
  const files = fileLessons(track);
  const fileSlugs = new Set(files.map((l) => l.slug));
  const fromDb: LessonSummary[] = (await dbLessons())
    .filter((l) => l.track === track && !fileSlugs.has(l.slug))
    .map((l) => ({
      slug: l.slug,
      order: l.order,
      title: l.title,
      description: l.description,
      keywords: parseKeywords(l.keywords),
    }));
  return [...files, ...fromDb].sort((a, b) => a.order - b.order);
}

export async function getLesson(
  track: string,
  slug: string
): Promise<Lesson | null> {
  const fromFile = fileLesson(track, slug);
  if (fromFile) return fromFile;

  const row = (await dbLessons()).find(
    (l) => l.track === track && l.slug === slug
  );
  if (!row) return null;
  return {
    track: row.track,
    slug: row.slug,
    title: row.title,
    description: row.description,
    order: row.order,
    keywords: parseKeywords(row.keywords),
    content: row.content,
    source: "db",
  };
}

export type SearchResult = LessonSummary & {
  track: string;
  trackTitle: string;
};

/** Simple full-text-ish search across all lessons (title/description/keywords). */
export async function searchLessons(query: string): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: SearchResult[] = [];
  for (const track of await getTracks()) {
    for (const lesson of await getLessons(track.slug)) {
      const haystack = [
        lesson.title,
        lesson.description,
        ...(lesson.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();
      if (haystack.includes(q)) {
        results.push({ ...lesson, track: track.slug, trackTitle: track.title });
      }
    }
  }
  return results;
}

/** Previous/next lesson within a track for the lesson footer nav. */
export async function getAdjacentLessons(track: string, slug: string) {
  const lessons = await getLessons(track);
  const i = lessons.findIndex((l) => l.slug === slug);
  return {
    prev: i > 0 ? lessons[i - 1] : null,
    next: i >= 0 && i < lessons.length - 1 ? lessons[i + 1] : null,
  };
}
