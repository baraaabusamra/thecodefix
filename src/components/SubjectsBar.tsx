import Link from "next/link";
import { getTracks } from "@/lib/content";

// W3Schools-style second nav row: a dark bar of subject links that scrolls
// horizontally (hidden scrollbar). Rendered under the header on every page.
export default async function SubjectsBar() {
  const tracks = await getTracks();

  return (
    <nav className="border-t border-white/5 bg-[#20232e]">
      <div className="mx-auto flex max-w-6xl items-center overflow-x-auto px-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tracks.map((t) => (
          <Link
            key={t.slug}
            href={`/learn/${t.slug}`}
            className="whitespace-nowrap px-3 py-2 text-xs font-bold uppercase tracking-wide text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            {t.title}
          </Link>
        ))}
      </div>
    </nav>
  );
}
