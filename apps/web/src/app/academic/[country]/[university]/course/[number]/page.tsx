import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCountry } from "@tcf/jobs/search";
import { getUniversity, getSpecialization } from "@tcf/academic/universities";
import {
  findCourseInUniversity,
  listUniversityCourses,
  getStudyPlanKeys,
} from "@tcf/academic/study-plans";
import { BASE_KEYWORDS } from "@tcf/content/seo";

export async function generateStaticParams() {
  const keys = await getStudyPlanKeys();
  const unis = new Map<string, { country: string; university: string }>();
  for (const k of keys) unis.set(`${k.country}/${k.university}`, k);

  const params: { country: string; university: string; number: string }[] = [];
  for (const { country, university } of unis.values()) {
    const courses = await listUniversityCourses(country, university);
    for (const number of courses.keys()) {
      params.push({ country, university, number });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string; university: string; number: string }>;
}): Promise<Metadata> {
  const { country, university, number } = await params;
  const u = getUniversity(country, university);
  const found = u ? await findCourseInUniversity(country, university, number) : null;
  if (!u || !found) return {};
  return {
    title: `${found.course.name} — ${u.name}`,
    description: `تفاصيل مادة ${found.course.name} (${number}) في ${u.name}: الساعات المعتمدة والمتطلب السابق ونمط التدريس.`,
    keywords: [found.course.name, u.name, ...BASE_KEYWORDS],
    alternates: { canonical: `/academic/${country}/${university}/course/${number}` },
  };
}

const numberToken = /\d{6,10}/g;

function PrerequisiteLinks({
  text,
  country,
  university,
  known,
}: {
  text: string;
  country: string;
  university: string;
  known: Set<string>;
}) {
  const parts = text.split(numberToken);
  const matches = text.match(numberToken) ?? [];
  return (
    <span dir="ltr">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {matches[i] &&
            (known.has(matches[i]) ? (
              <Link
                href={`/academic/${country}/${university}/course/${matches[i]}`}
                className="font-mono text-accent hover:underline"
              >
                {matches[i]}
              </Link>
            ) : (
              <span className="font-mono">{matches[i]}</span>
            ))}
        </span>
      ))}
    </span>
  );
}

export default async function AcademicCoursePage({
  params,
}: {
  params: Promise<{ country: string; university: string; number: string }>;
}) {
  const { country: countrySlug, university: universitySlug, number } = await params;
  const country = getCountry(countrySlug);
  const university = getUniversity(countrySlug, universitySlug);
  if (!country || !university) notFound();

  const found = await findCourseInUniversity(countrySlug, universitySlug, number);
  if (!found) notFound();

  const allCourses = await listUniversityCourses(countrySlug, universitySlug);
  const known = new Set(allCourses.keys());
  const { course, occurrences } = found;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <nav className="mb-4 text-sm text-muted">
        <Link href="/academic" className="hover:text-foreground">
          الجانب الأكاديمي
        </Link>
        {" / "}
        <Link href={`/academic/${countrySlug}`} className="hover:text-foreground">
          {country.nameAr}
        </Link>
        {" / "}
        <Link href={`/academic/${countrySlug}/${universitySlug}`} className="hover:text-foreground">
          {university.name}
        </Link>
        {" / "}
        <span dir="ltr" className="font-mono">
          {number}
        </span>
      </nav>

      <p className="font-mono text-sm text-accent" dir="ltr">
        {course.number}
      </p>
      <h1 className="mt-1 text-3xl font-extrabold md:text-4xl" dir="ltr">
        {course.name}
      </h1>
      <p className="mt-2 text-muted">{university.name}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="الساعات المعتمدة" value={course.creditHours} />
        <Stat label="نظري" value={course.theoretical} />
        <Stat label="عملي" value={course.practical} />
        <Stat label="النمط" value={course.mode ?? "—"} />
      </div>

      {course.prerequisite && (
        <div className="mt-6 rounded-xl border border-border bg-surface/50 p-4">
          <h2 className="text-sm font-bold text-muted">المتطلب السابق</h2>
          <p className="mt-1 font-mono text-sm">
            <PrerequisiteLinks
              text={course.prerequisite}
              country={countrySlug}
              university={universitySlug}
              known={known}
            />
          </p>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-sm font-bold text-muted">تظهر ضمن</h2>
        <div className="mt-2 space-y-2">
          {occurrences.map((o, i) => {
            const spec = getSpecialization(o.specialization);
            return (
              <Link
                key={i}
                href={`/academic/${countrySlug}/${universitySlug}/${o.specialization}`}
                className="glass card-glow flex items-center justify-between gap-2 rounded-xl p-3 text-sm"
              >
                <span>
                  {spec?.title ?? o.specialization}{" "}
                  <span className="text-muted">— {o.category}</span>
                </span>
                <span className="text-accent">←</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-surface/50 p-3 text-center">
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}
