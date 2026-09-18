"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useProgress, setName, PASS_RATIO } from "@/lib/progress";
import { getMyStats } from "@/app/progress-actions";
import type { TrustedCounts } from "@/lib/trusted-stats";
import type { AchievementTotals } from "@/lib/achievements";
import { useBookmarks } from "@/lib/bookmarks";
import { useRecent } from "@/lib/recent";
import { computeGamification, gamificationFromCounts, LEVELS } from "@/lib/points";
import AchievementsGrid from "@/components/AchievementsGrid";
import ThemeToggle from "@/components/ThemeToggle";
import AccountIdentity from "@/components/AccountIdentity";

export type TrackInfo = {
  slug: string;
  title: string;
  icon: string;
  lessonCount: number;
  hasQuiz: boolean;
};

/** Slim job shape passed from the server for the opportunity radar. */
export type JobLite = {
  slug: string;
  title: string;
  company: string;
  type: string;
  location: string;
  tags: string[];
};

type TabId = "overview" | "tracks" | "saved" | "certificates" | "settings";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "overview", label: "نظرة عامة", icon: "🏠" },
  { id: "tracks", label: "مساراتي", icon: "📚" },
  { id: "saved", label: "المحفوظات", icon: "★" },
  { id: "certificates", label: "الشهادات", icon: "🏆" },
  { id: "settings", label: "الإعدادات", icon: "⚙️" },
];

// User dashboard: progressive disclosure via tabs so many features never
// become visual clutter — a smart side widget (identity + gamification +
// opportunity radar) and one focused content panel at a time.
export default function AccountDashboard({
  tracks,
  jobs,
  authEnabled,
}: {
  tracks: TrackInfo[];
  jobs: JobLite[];
  authEnabled: boolean;
}) {
  const progress = useProgress();
  const bookmarks = useBookmarks();
  const recent = useRecent();
  const [tab, setTab] = useState<TabId>("overview");

  // Signed-in: points/level/achievements come from the server (same source as
  // the public leaderboard). Guests: local progress, which is untrusted and
  // only ever shown to themselves.
  const trusted = useTrustedStats();
  const game = trusted
    ? gamificationFromCounts(trusted.lessonsDone, trusted.quizzesPassed)
    : computeGamification(progress);
  const trustedTotals: AchievementTotals | null = trusted
    ? {
        totalLessons: trusted.lessonsDone,
        tracksStarted: trusted.tracksStarted,
        quizzesPassed: trusted.quizzesPassed,
      }
    : null;
  const activeTracks = tracks.filter(
    (t) => (progress.completedLessons[t.slug]?.length ?? 0) > 0
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        {/* ══ Smart side widget ══ */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:h-fit">
          <ProfileCard name={progress.name} game={game} authEnabled={authEnabled} />
          <OpportunityRadar
            jobs={jobs}
            tracks={tracks}
            progress={progress.completedLessons}
            recentTrack={recent?.track ?? null}
          />
          <LeagueCard points={game.points} />
        </aside>

        {/* ══ Dynamic content area ══ */}
        <main className="min-w-0">
          {/* Tabs bar */}
          <div
            role="tablist"
            aria-label="أقسام لوحة التحكم"
            className="mb-8 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-surface p-1.5 [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                  tab === t.id
                    ? "bg-brand-purple/15 text-accent shadow-[0_0_14px_-4px_var(--brand-purple)]"
                    : "text-muted hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                <span aria-hidden>{t.icon}</span>
                {t.label}
                {t.id === "saved" && bookmarks.length > 0 && (
                  <span className="rounded-full bg-brand-purple/20 px-1.5 text-xs text-accent">
                    {bookmarks.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* One panel at a time — key remounts to replay the fade */}
          <div key={tab} className="tab-panel">
            {tab === "overview" && (
              <OverviewTab
                tracks={tracks}
                progress={progress.completedLessons}
                game={game}
                recent={recent}
                activeCount={activeTracks.length}
                trustedTotals={trustedTotals}
              />
            )}
            {tab === "tracks" && (
              <TracksTab tracks={activeTracks} progressMap={progress.completedLessons} quizzes={progress.quizzes} />
            )}
            {tab === "saved" && <SavedTab bookmarks={bookmarks} />}
            {tab === "certificates" && (
              <CertificatesTab tracks={tracks} quizzes={progress.quizzes} />
            )}
            {tab === "settings" && <SettingsTab name={progress.name} />}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ══════════ Side widget ══════════ */

function ProfileCard({
  name,
  game,
  authEnabled,
}: {
  name: string;
  game: ReturnType<typeof computeGamification>;
  authEnabled: boolean;
}) {
  const initial = (name || "؟").trim().charAt(0).toUpperCase();
  return (
    <section className="glass card-glow rounded-2xl p-5">
      {authEnabled ? (
        <AccountIdentity fallbackName={name} game={game} />
      ) : (
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-brand-purple/50 bg-brand-purple/10 text-xl font-bold text-accent shadow-[0_0_18px_-6px_var(--brand-purple)]">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{name || "متعلّم جديد"}</p>
            <p className="text-sm text-muted">
              {game.level.icon} {game.level.title} · المستوى {game.levelIndex}
            </p>
          </div>
        </div>
      )}

      {/* Points + level progress */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          <span className="font-bold text-accent">{game.points} نقطة</span>
          {game.nextLevel ? (
            <span className="text-xs text-muted">
              {game.nextLevel.icon} {game.nextLevel.title} عند {game.nextLevel.threshold}
            </span>
          ) : (
            <span className="text-xs text-muted">أعلى مستوى 👑</span>
          )}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-gradient-to-l from-brand-purple to-brand-cyan transition-all duration-300"
            style={{ width: `${game.pctToNext}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          كل درس = 10 نقاط · كل اختبار ناجح = 50 نقطة
        </p>
      </div>
    </section>
  );
}

function OpportunityRadar({
  jobs,
  tracks,
  progress,
  recentTrack,
}: {
  jobs: JobLite[];
  tracks: TrackInfo[];
  progress: Record<string, string[]>;
  recentTrack: string | null;
}) {
  // The learner's "current" track: last opened, else the most completed.
  const focus =
    recentTrack ??
    tracks
      .filter((t) => (progress[t.slug]?.length ?? 0) > 0)
      .sort((a, b) => (progress[b.slug]?.length ?? 0) - (progress[a.slug]?.length ?? 0))[0]
      ?.slug ??
    null;
  const focusTrack = tracks.find((t) => t.slug === focus) ?? null;

  const matches = (j: JobLite, needle: string) =>
    (j.title + " " + j.tags.join(" ")).toLowerCase().includes(needle.toLowerCase());

  // Prefer an internship matching the focus track, then any matching job,
  // then any internship at all.
  const pick =
    (focusTrack &&
      (jobs.find((j) => j.type.includes("تدريب") && matches(j, focusTrack.slug)) ??
        jobs.find((j) => matches(j, focusTrack.slug)))) ||
    jobs.find((j) => j.type.includes("تدريب")) ||
    null;

  if (!pick) return null;

  return (
    <section className="card-glow rounded-2xl border border-brand-cyan/30 bg-surface p-5">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-cyan">
        📡 رادار الفرص
      </p>
      <Link href={`/jobs/${pick.slug}`} className="group block">
        <p className="font-bold transition group-hover:text-accent">{pick.title}</p>
        <p className="mt-0.5 text-sm text-muted">
          {pick.company} · {pick.location} · {pick.type}
        </p>
      </Link>
      {focusTrack && (
        <p className="mt-3 rounded-lg bg-surface-2 px-3 py-1.5 text-xs text-muted">
          💡 مقترحة لأنك تدرس {focusTrack.icon} {focusTrack.title}
        </p>
      )}
      <Link
        href="/jobs"
        className="mt-3 inline-block text-xs font-semibold text-accent underline"
      >
        كل الفرص ←
      </Link>
    </section>
  );
}

function LeagueCard({ points }: { points: number }) {
  return (
    <section className="card-glow rounded-2xl border border-brand-purple/30 bg-surface p-5">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-accent">
        🏆 دوري الأسبوع
      </p>
      <p className="text-sm text-muted">
        نافس متعلمي المنصة — الدوري يبدأ من صفر كل يوم اثنين، ورصيدك{" "}
        <span className="font-bold text-accent">{points} نقطة</span> يرفع
        ترتيبك العام.
      </p>
      <Link
        href="/leaderboard"
        className="btn-neon mt-4 inline-flex w-full justify-center px-4 py-2 text-sm"
      >
        شوف ترتيبك ←
      </Link>
    </section>
  );
}

/* ══════════ Tab: Overview ══════════ */

function OverviewTab({
  tracks,
  progress,
  game,
  recent,
  activeCount,
  trustedTotals,
}: {
  tracks: TrackInfo[];
  progress: Record<string, string[]>;
  game: ReturnType<typeof computeGamification>;
  recent: { track: string; slug: string; title: string; trackTitle: string } | null;
  activeCount: number;
  trustedTotals: AchievementTotals | null;
}) {
  const recentTrack = recent ? tracks.find((t) => t.slug === recent.track) : null;
  const done = recent ? (progress[recent.track]?.length ?? 0) : 0;
  const pct =
    recentTrack && recentTrack.lessonCount
      ? Math.round((done / recentTrack.lessonCount) * 100)
      : 0;

  return (
    <div className="space-y-8">
      {/* Hero: continue learning */}
      <section className="card-glow relative overflow-hidden rounded-2xl border border-brand-purple/40 bg-surface p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(420px 200px at 85% -40px, color-mix(in srgb, var(--brand-purple) 18%, transparent), transparent 70%)",
          }}
        />
        <div className="relative">
          {recent ? (
            <>
              <p className="text-sm text-muted">أكمل من حيث توقفت</p>
              <h2 className="mt-1 text-2xl font-bold">
                {recentTrack?.icon} {recent.title}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {recent.trackTitle}
                {recentTrack ? ` · أنجزت ${pct}% من المسار` : ""}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  href={`/learn/${recent.track}/${recent.slug}`}
                  className="btn-neon px-6 py-2.5"
                >
                  ▶ متابعة التعلم
                </Link>
                <Link
                  href={`/learn/${recent.track}`}
                  className="rounded-[10px] border border-border px-5 py-2.5 text-sm font-semibold transition hover:border-brand-purple/50"
                >
                  صفحة المسار
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">رحلتك تبدأ هنا</p>
              <h2 className="mt-1 text-2xl font-bold">اختر مسارك الأول 🚀</h2>
              <p className="mt-1 max-w-md text-sm text-muted">
                31 مسارًا من الصفر للاحتراف — وكل درس تنهيه يضيف لنقاطك.
              </p>
              <Link href="/learn" className="btn-neon mt-5 inline-flex px-6 py-2.5">
                استكشف المسارات
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard value={String(game.lessonsDone)} label="درسًا منجزًا" tone="purple" />
        <StatCard
          value={`${game.level.icon} ${game.level.title}`}
          label={`رتبتك · المستوى ${game.levelIndex}`}
          tone="cyan"
        />
        <StatCard value={String(activeCount)} label="مسارًا نشطًا" tone="pink" />
      </div>

      {/* Achievements */}
      <AchievementsGrid totals={trustedTotals} />
    </div>
  );
}

function StatCard({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: "purple" | "cyan" | "pink";
}) {
  const colors = {
    purple: "text-accent",
    cyan: "text-brand-cyan",
    pink: "text-brand-pink",
  } as const;
  return (
    <div className="card-glow rounded-2xl border border-border bg-surface p-4 text-center">
      <p className={`truncate text-xl font-bold sm:text-2xl ${colors[tone]}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

/* ══════════ Tab: My tracks ══════════ */

function TracksTab({
  tracks,
  progressMap,
  quizzes,
}: {
  tracks: TrackInfo[];
  progressMap: Record<string, string[]>;
  quizzes: Record<string, { score: number; total: number }>;
}) {
  if (tracks.length === 0) {
    return (
      <EmptyState
        icon="📚"
        title="لا مسارات نشطة بعد"
        text="أكمل أول درس في أي مسار وسيظهر هنا مع شريط تقدمه."
        cta={{ href: "/learn", label: "استكشف المسارات" }}
      />
    );
  }
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {tracks.map((t) => {
          const done = progressMap[t.slug]?.length ?? 0;
          const pct = t.lessonCount ? Math.round((done / t.lessonCount) * 100) : 0;
          const quiz = quizzes[t.slug];
          return (
            <div key={t.slug} className="card-glow rounded-2xl border border-border bg-surface p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <Link href={`/learn/${t.slug}`} className="truncate font-bold hover:text-accent">
                  {t.icon} {t.title}
                </Link>
                <span className="shrink-0 text-sm font-bold text-accent">{pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-brand-purple to-brand-cyan transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                <span>
                  {done}/{t.lessonCount} درس
                </span>
                {t.hasQuiz && (
                  <Link href={`/quiz/${t.slug}`} className="font-semibold text-brand-cyan hover:underline">
                    {quiz ? `الاختبار: ${quiz.score}/${quiz.total}` : "ابدأ الاختبار ←"}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Link
        href="/learn"
        className="mt-6 inline-block text-sm font-semibold text-accent underline"
      >
        + أضف مسارًا جديدًا
      </Link>
    </div>
  );
}

/* ══════════ Tab: Saved ══════════ */

function SavedTab({
  bookmarks,
}: {
  bookmarks: { track: string; slug: string; title: string; trackTitle: string }[];
}) {
  if (bookmarks.length === 0) {
    return (
      <EmptyState
        icon="★"
        title="لا محفوظات بعد"
        text="داخل أي درس اضغط زر النجمة ★ لحفظه هنا — مرجعك السريع للعودة."
        cta={{ href: "/learn", label: "تصفح الدروس" }}
      />
    );
  }
  return (
    <div className="space-y-2.5">
      {bookmarks.map((b) => (
        <Link
          key={`${b.track}-${b.slug}`}
          href={`/learn/${b.track}/${b.slug}`}
          className="card-glow flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
        >
          <span className="truncate font-medium">★ {b.title}</span>
          <span className="shrink-0 rounded-full bg-brand-purple/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
            {b.trackTitle}
          </span>
        </Link>
      ))}
    </div>
  );
}

/* ══════════ Tab: Certificates ══════════ */

function CertificatesTab({
  tracks,
  quizzes,
}: {
  tracks: TrackInfo[];
  quizzes: Record<string, { score: number; total: number }>;
}) {
  const quizTracks = tracks.filter((t) => t.hasQuiz);
  const earned = (slug: string) => {
    const r = quizzes[slug];
    return !!r && r.score / r.total >= PASS_RATIO;
  };
  const earnedCount = quizTracks.filter((t) => earned(t.slug)).length;

  return (
    <div>
      <p className="mb-5 text-sm text-muted">
        حصّلت <span className="font-bold text-accent">{earnedCount}</span> من{" "}
        {quizTracks.length} شهادة — الرمادية بانتظارك 😉
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {quizTracks.map((t) => {
          const ok = earned(t.slug);
          return ok ? (
            <Link
              key={t.slug}
              href={`/certificate/${t.slug}`}
              className="card-glow rounded-2xl border border-brand-cyan/40 bg-surface p-4 text-center"
            >
              <p className="text-3xl">🏆</p>
              <p className="mt-2 truncate text-sm font-bold">{t.title}</p>
              <p className="mt-0.5 text-xs text-brand-cyan">اعرض الشهادة</p>
            </Link>
          ) : (
            <Link
              key={t.slug}
              href={`/quiz/${t.slug}`}
              title={`اجتز اختبار ${t.title} لفتح الشهادة`}
              className="rounded-2xl border border-border bg-surface p-4 text-center opacity-45 grayscale transition-all duration-300 hover:opacity-80 hover:grayscale-0"
            >
              <p className="text-3xl">🔒</p>
              <p className="mt-2 truncate text-sm font-bold">{t.title}</p>
              <p className="mt-0.5 text-xs text-muted">اجتز الاختبار لفتحها</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════ Tab: Settings ══════════ */

function SettingsTab({ name }: { name: string }) {
  const [draft, setDraft] = useState(name);
  const [saved, setSaved] = useState(false);
  return (
    <div className="max-w-md space-y-5">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="mb-3 font-bold">👤 الملف الشخصي</h3>
        <label className="text-sm text-muted">
          اسمك (يظهر على شهاداتك)
          <div className="mt-1.5 flex gap-2">
            <input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setSaved(false);
              }}
              placeholder="اكتب اسمك"
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-purple/60"
            />
            <button
              onClick={() => {
                if (draft.trim()) {
                  setName(draft.trim());
                  setSaved(true);
                }
              }}
              className="btn-neon px-4 py-2 text-sm"
            >
              {saved ? "✓ حُفظ" : "حفظ"}
            </button>
          </div>
        </label>
      </section>

      <section className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5">
        <div>
          <h3 className="font-bold">🎨 المظهر</h3>
          <p className="mt-0.5 text-sm text-muted">بدّل بين الداكن والفاتح</p>
        </div>
        <ThemeToggle />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="mb-1 font-bold">📊 مستويات النقاط</h3>
        <p className="mb-3 text-sm text-muted">كل درس 10 نقاط، وكل اختبار ناجح 50.</p>
        <ul className="space-y-1.5 text-sm">
          {LEVELS.map((l) => (
            <li key={l.threshold} className="flex justify-between text-muted">
              <span>
                {l.icon} {l.title}
              </span>
              <span className="font-mono text-xs">{l.threshold}+</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ══════════ Shared ══════════ */

function EmptyState({
  icon,
  title,
  text,
  cta,
}: {
  icon: string;
  title: string;
  text: string;
  cta: { href: string; label: string };
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
      <p className="text-4xl">{icon}</p>
      <h3 className="mt-3 text-lg font-bold">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{text}</p>
      <Link href={cta.href} className="btn-neon mt-5 inline-flex px-5 py-2 text-sm">
        {cta.label}
      </Link>
    </div>
  );
}

/** Server-trusted stats for the signed-in user; null for guests / until loaded. */
function useTrustedStats(): TrustedCounts | null {
  const { status } = useSession();
  const [stats, setStats] = useState<TrustedCounts | null>(null);
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    getMyStats()
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status]);
  return status === "authenticated" ? stats : null;
}
