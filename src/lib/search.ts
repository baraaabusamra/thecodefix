import Fuse from "fuse.js";
import { getTracks, getLessons, type LessonSummary, type TrackMeta } from "@/lib/content";

export type SearchResult = LessonSummary & {
  track: string;
  trackTitle: string;
};

let fusePromise: Promise<Fuse<SearchResult>> | null = null;

async function buildIndex(): Promise<Fuse<SearchResult>> {
  const docs: SearchResult[] = [];
  for (const track of await getTracks()) {
    for (const lesson of await getLessons(track.slug)) {
      docs.push({ ...lesson, track: track.slug, trackTitle: track.title });
    }
  }
  return new Fuse(docs, {
    keys: [
      { name: "title", weight: 2 },
      { name: "description", weight: 1 },
      { name: "keywords", weight: 1.5 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
  });
}

export async function searchLessons(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  if (!fusePromise) fusePromise = buildIndex();
  const fuse = await fusePromise;
  return fuse.search(q).map((r) => r.item);
}

export function resetSearchIndex() {
  fusePromise = null;
}
