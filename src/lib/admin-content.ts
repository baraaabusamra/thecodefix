import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

// Raw file access for the admin content manager. Reading works everywhere;
// writing is dev-only because Vercel's production filesystem is read-only.
// Moving content into a database or a Git-backed flow is the prod-editing path.

const TRACKS_DIR = path.join(process.cwd(), "src", "content", "tracks");

export function lessonFilePath(track: string, slug: string): string {
  return path.join(TRACKS_DIR, track, `${slug}.mdx`);
}

export function readRawLesson(track: string, slug: string): string | null {
  const file = lessonFilePath(track, slug);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf-8");
}

/** Whether the content files can be written (true only outside production). */
export function isContentWritable(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function writeRawLesson(track: string, slug: string, content: string): void {
  if (!isContentWritable()) {
    throw new Error("Content is read-only in production.");
  }
  const file = lessonFilePath(track, slug);
  if (!fs.existsSync(file)) {
    throw new Error("Lesson not found.");
  }
  // Validate frontmatter parses before writing, so we never save a broken file.
  matter(content);
  fs.writeFileSync(file, content, "utf-8");
}
