// Structural prop type: any record with an ISO code and an Arabic name (the
// jobs, training and academic country lists all qualify) — the UI package
// must not depend on a feature module.
type FlagCountry = { iso?: string | null; nameAr: string };

// SVG flag via flag-icons (not emoji — regional-indicator glyphs don't
// render on every OS/browser). "remote" isn't a real country, so it keeps
// the globe emoji instead of a flag.
export default function CountryFlag({
  country,
  className,
}: {
  country: FlagCountry;
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
