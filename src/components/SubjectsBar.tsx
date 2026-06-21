import { getTracks } from "@/lib/content";
import SubjectsBarScroller from "./SubjectsBarScroller";

// W3Schools-style second nav row: a dark bar of subject links with left/right
// scroll arrows. Rendered under the header on every page.
export default async function SubjectsBar() {
  const tracks = await getTracks();
  const subjects = tracks.map((t) => ({ slug: t.slug, title: t.title }));

  return (
    <nav className="border-t border-white/5 bg-[#20232e]">
      <SubjectsBarScroller subjects={subjects} />
    </nav>
  );
}
