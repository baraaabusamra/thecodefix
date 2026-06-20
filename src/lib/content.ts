import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "src", "content", "tracks");

export type TrackMeta = {
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  order: number;
};

export type LessonFrontmatter = {
  title: string;
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
};

/** All track folders that contain a _meta.json */
export function getTracks(): TrackMeta[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((d) => fs.existsSync(path.join(CONTENT_DIR, d, "_meta.json")))
    .map((slug) => {
      const meta = JSON.parse(
        fs.readFileSync(path.join(CONTENT_DIR, slug, "_meta.json"), "utf-8")
      );
      return { slug, order: 0, ...meta } as TrackMeta;
    })
    .sort((a, b) => a.order - b.order);
}

export function getTrack(slug: string): TrackMeta | null {
  return getTracks().find((t) => t.slug === slug) ?? null;
}

/** Lesson summaries for one track, ordered by frontmatter `order`. */
export function getLessons(track: string): LessonSummary[] {
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
    })
    .sort((a, b) => a.order - b.order);
}

export function getLesson(track: string, slug: string): Lesson | null {
  const file = path.join(CONTENT_DIR, track, `${slug}.mdx`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf-8");
  const { data, content } = matter(raw);
  return {
    track,
    slug,
    content,
    ...(data as LessonFrontmatter),
  };
}

export type SearchResult = LessonSummary & {
  track: string;
  trackTitle: string;
};

/** Simple full-text-ish search across all lessons (title/description/keywords). */
export function searchLessons(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: SearchResult[] = [];
  for (const track of getTracks()) {
    for (const lesson of getLessons(track.slug)) {
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
export function getAdjacentLessons(track: string, slug: string) {
  const lessons = getLessons(track);
  const i = lessons.findIndex((l) => l.slug === slug);
  return {
    prev: i > 0 ? lessons[i - 1] : null,
    next: i >= 0 && i < lessons.length - 1 ? lessons[i + 1] : null,
  };
}
