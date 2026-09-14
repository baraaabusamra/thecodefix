import { unstable_cache } from "next/cache";
import { getTracks, getLessons } from "@/lib/content";

export type SearchIndexItem = {
  t: string; // title
  s: string; // subtitle (track / section)
  u: string; // url
};

// Full track+lesson index for the command palette (⌘K search).
//
// Previously this walk (all tracks x every lesson's frontmatter) ran fresh
// on every single page render, because CommandPalette sits in the root
// layout and is rendered for every page on the site — home, every blog
// post, every lesson, every reference entry, etc. That meant ~1,170 lesson
// .mdx files were re-read and re-parsed (fs.readFileSync + gray-matter) on
// every render, multiplied by the total number of pages on the site.
//
// unstable_cache computes this once and persists the result in Next's Data
// Cache (backed by the filesystem during `next build`, so it's shared
// across the static-generation of every page in one build) instead of
// recomputing per page. It's invalidated via updateTag("content") from
// admin content actions (see revalidateContent() in
// src/app/admin/content/actions.ts and setLessonWorkflow() in
// src/app/admin/operations/content/actions.ts) whenever a track/lesson is
// created/edited/published/deleted — updateTag rather than revalidateTag
// so the admin sees their own edit immediately (read-your-own-writes)
// instead of possibly one more stale read under stale-while-revalidate.
export const getSearchIndex = unstable_cache(
  async (): Promise<SearchIndexItem[]> => {
    const tracks = await getTracks();
    const items: SearchIndexItem[] = [];
    for (const track of tracks) {
      items.push({
        t: `${track.icon} ${track.title}`,
        s: "مسار",
        u: `/learn/${track.slug}`,
      });
      const lessons = await getLessons(track.slug);
      for (const l of lessons) {
        items.push({
          t: l.title,
          s: track.title,
          u: `/learn/${track.slug}/${l.slug}`,
        });
      }
    }
    return items;
  },
  ["command-palette-search-index"],
  { tags: ["content"] }
);
