import { getSearchIndex } from "@/lib/search-index";
import CommandPaletteClient, {
  type PaletteItem,
} from "@/components/CommandPaletteClient";

// Hands the (cached) search index to the client palette — see
// src/lib/search-index.ts for why this is cached rather than rebuilt from
// every track/lesson file on every render.
export default async function CommandPalette() {
  // Key destinations first, same fixed order as before.
  const pages: PaletteItem[] = [
    { t: "المسارات", s: "صفحة", u: "/learn" },
    { t: "خرائط الطريق", s: "صفحة", u: "/roadmaps" },
    { t: "المحرّر التفاعلي", s: "صفحة", u: "/playground" },
    { t: "المدوّنة", s: "صفحة", u: "/blog" },
    { t: "الوظائف", s: "صفحة", u: "/jobs" },
    { t: "حسابي", s: "صفحة", u: "/account" },
  ];

  const items: PaletteItem[] = [...pages, ...(await getSearchIndex())];

  return <CommandPaletteClient items={items} />;
}
