import fs from "node:fs";
import path from "node:path";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { jobAlerts, type JobAlert } from "@/db/schema";
import { isContentWritable, assertSafeSegment } from "./admin-content";

// Raw file access for the job-board manager. Reading works everywhere; writing
// is dev-only (Vercel production filesystem is read-only) — same constraint as
// the lessons editor. A real approval/company workflow needs the database.

const JOBS_DIR = path.join(process.cwd(), "src", "content", "jobs");

export function jobFilePath(slug: string): string {
  return path.join(JOBS_DIR, `${assertSafeSegment(slug)}.json`);
}

export function readRawJob(slug: string): string | null {
  const file = jobFilePath(slug);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf-8");
}

export function writeRawJob(slug: string, content: string): void {
  if (!isContentWritable()) {
    throw new Error("Content is read-only in production.");
  }
  const file = jobFilePath(slug);
  if (!fs.existsSync(file)) {
    throw new Error("Job not found.");
  }
  // Validate it parses as an object before writing.
  const parsed = JSON.parse(content);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Job JSON must be an object.");
  }
  fs.writeFileSync(file, content, "utf-8");
}

/** Job-alert signups (lead list), newest first. Empty when the DB is dormant. */
export async function getJobAlerts(): Promise<JobAlert[]> {
  if (!db) return [];
  return db.select().from(jobAlerts).orderBy(desc(jobAlerts.createdAt));
}

export function isValidJobJson(content: string): boolean {
  try {
    const parsed = JSON.parse(content);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false;
  }
}
