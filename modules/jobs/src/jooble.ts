import type { Country, SearchMode, Specialty } from "./search";

// Jooble job-aggregator integration (https://jooble.org/api/about).
// Server-side only (reads a secret env var) — import from server components
// exclusively, never from "use client" files.
// Dormant until JOOBLE_API_KEY is set (same pattern as flags.ts features):
// country pages render real listings when the key exists, and fall back to
// the smart search links alone when it doesn't. Pages that call this are ISR
// (`export const revalidate`) so the fetch runs at build/regeneration time —
// never per-request, and a Jooble outage can only ever hide the section.

export function isJoobleEnabled(): boolean {
  return !!process.env.JOOBLE_API_KEY;
}

export type JoobleJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  snippet: string;
  salary: string;
  source: string;
  link: string;
};

// Jooble snippets embed <b> highlights and entities — render as plain text.
function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const MAX_RESULTS = 10;

export async function searchJooble(
  country: Country,
  specialty: Specialty,
  mode: SearchMode
): Promise<JoobleJob[]> {
  const key = process.env.JOOBLE_API_KEY;
  if (!key) return [];

  const training = mode === "training";
  const remote = country.slug === "remote";
  const keywords = [
    specialty.queryEn,
    training ? "intern" : "",
    remote ? "remote" : "",
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const res = await fetch(`https://jooble.org/api/${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keywords,
        location: remote ? "" : country.nameEn,
        page: "1",
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      jobs?: {
        id?: number | string;
        title?: string;
        company?: string;
        location?: string;
        snippet?: string;
        salary?: string;
        source?: string;
        link?: string;
      }[];
    };

    // Jooble's global endpoint falls back to irrelevant US results when a
    // country has little coverage (e.g. "Beirut, Lebanon" → "Lebanon, TN").
    // Keep only listings whose location names the requested country, and
    // reject anything ending in a US state code. Empty after filtering →
    // the listings section simply doesn't render.
    const usState = /,\s*[A-Z]{2}$/;
    const inCountry = (loc: string) =>
      remote ||
      (loc.toLowerCase().includes(country.nameEn.toLowerCase()) &&
        !usState.test(loc.trim()));

    return (data.jobs ?? [])
      .filter((j) => j.title && j.link && inCountry(j.location ?? ""))
      .slice(0, MAX_RESULTS)
      .map((j) => ({
        id: String(j.id ?? j.link),
        title: stripHtml(j.title ?? ""),
        company: stripHtml(j.company ?? ""),
        location: stripHtml(j.location ?? ""),
        snippet: stripHtml(j.snippet ?? "").slice(0, 220),
        salary: stripHtml(j.salary ?? ""),
        source: stripHtml(j.source ?? ""),
        link: j.link!,
      }));
  } catch {
    // Timeout / network / bad payload — the page still renders with the
    // smart search links; listings simply don't appear this cycle.
    return [];
  }
}
