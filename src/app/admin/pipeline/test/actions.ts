"use server";

import { requireDb } from "@/db";
import { pipelineUniversities, pipelinePrograms } from "@/db/schema";
import { TavilySearchProvider } from "@/lib/curriculum/discovery/tavily";
import { rankSource, RankedSource } from "@/lib/curriculum/discovery/ranking";
import { eq } from "drizzle-orm";

export async function fetchUniversities() {
  return await requireDb().select().from(pipelineUniversities);
}

export async function fetchPrograms(universityId: string) {
  return await requireDb().select().from(pipelinePrograms).where(eq(pipelinePrograms.universityId, universityId));
}

export async function discoverSources(universityId: string, programId: string | null) {
  const [university] = await requireDb().select().from(pipelineUniversities).where(eq(pipelineUniversities.id, universityId));
  if (!university) throw new Error("University not found");

  let query = `${university.universitySlug} course catalog handbook pdf`;
  if (programId) {
    const [program] = await requireDb().select().from(pipelinePrograms).where(eq(pipelinePrograms.id, programId));
    if (program) {
      query = `${university.universitySlug} ${program.canonicalName || program.specializationSlug} study plan curriculum pdf`;
    }
  }

  const provider = new TavilySearchProvider();
  const results = await provider.search(query, {
    limit: 5,
    includeDomains: university.officialDomain ? [university.officialDomain] : undefined
  });

  const ranked = results.map(r => rankSource(r.url, r.title, university.officialDomain));
  ranked.sort((a, b) => b.score - a.score);

  return ranked;
}
