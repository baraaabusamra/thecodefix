import { getTracks, getLessons } from "@/lib/content";
import CommandPaletteClient, {
  type PaletteItem,
} from "@/components/CommandPaletteClient";

// Builds the search index at render time (statically at build) and hands it to
// the client palette. Plain DB reads keep this statically renderable.
export default async function CommandPalette() {
  const tracks = await getTracks();
  const items: PaletteItem[] = [];

  // Key destinations first.
  const pages: PaletteItem[] = [
    { t: "المسارات", s: "صفحة", u: "/learn" },
    { t: "خرائط الطريق", s: "صفحة", u: "/roadmaps" },
    { t: "المحرّر التفاعلي", s: "صفحة", u: "/playground" },
    { t: "المدوّنة", s: "صفحة", u: "/blog" },
    { t: "الوظائف", s: "صفحة", u: "/jobs" },
    { t: "حسابي", s: "صفحة", u: "/account" },
  ];
  items.push(...pages);

  for (const track of tracks) {
    items.push({
      t: `${track.icon} ${track.title}`,
      s: "مسار",
      u: `/learn/${track.slug}`,
    });
    const lessons = await getLessons(track.slug);
    for (const l of lessons) {
      items.push({ t: l.title, s: track.title, u: `/learn/${track.slug}/${l.slug}` });
    }
  }

  return <CommandPaletteClient items={items} />;
}
