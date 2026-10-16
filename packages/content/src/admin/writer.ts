import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { contentDir } from "../paths";

// Raw file access for the admin content manager. Reading works everywhere;
// writing is dev-only because Vercel's production filesystem is read-only.
// Moving content into a database or a Git-backed flow is the prod-editing path.

const TRACKS_DIR = contentDir("tracks");

// A single path segment only: letters, digits, dot, dash, underscore. Rejects
// slashes, "..", and anything else, so a track/slug can never escape its content
// directory (defense in depth — these already come from an authenticated admin).
// Shared by the lesson, quiz, and job file helpers.
const SAFE_SEGMENT = /^[a-zA-Z0-9._-]+$/;

export function assertSafeSegment(name: string): string {
  if (!SAFE_SEGMENT.test(name)) {
    throw new Error("Invalid content name.");
  }
  return name;
}

export function lessonFilePath(track: string, slug: string): string {
  const file = path.join(
    TRACKS_DIR,
    assertSafeSegment(track),
    `${assertSafeSegment(slug)}.mdx`
  );
  // Ensure the resolved path is still inside the tracks directory.
  const rel = path.relative(TRACKS_DIR, file);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Invalid content path.");
  }
  return file;
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
