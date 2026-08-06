import type { Country } from "@/lib/job-search";

// SVG flag via flag-icons (not emoji — regional-indicator glyphs don't
// render on every OS/browser). "remote" isn't a real country, so it keeps
// the globe emoji instead of a flag.
export default function CountryFlag({
  country,
  className,
}: {
  country: Country;
  className?: string;
}) {
  if (!country.iso) {
    return (
      <span className={className} aria-hidden>
        🌍
      </span>
    );
  }
  return (
    <span
      className={`fi fi-${country.iso} ${className ?? ""}`}
      role="img"
      aria-label={country.nameAr}
    />
  );
}
