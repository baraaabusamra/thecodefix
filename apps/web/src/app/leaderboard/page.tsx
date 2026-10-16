import type { Metadata } from "next";
import Link from "next/link";
import { getLeaderboard } from "@tcf/progress/leaderboard";
import { LEVELS } from "@tcf/progress/points";
import Breadcrumbs from "@tcf/ui/ui/Breadcrumbs";
import LeaderboardTabs from "@tcf/progress/ui/LeaderboardTabs";

// League standings refresh in the background every 5 minutes — fast for
// visitors, cheap for the database, and the weekly snapshot logic runs at
// most once per user per week inside getLeaderboard().
export const revalidate = 300;

export const metadata: Metadata = {
  title: "المتصدرون — دوري المتعلمين الأسبوعي",
  description:
    "لوحة متصدري The Code Fix: نقاط أسبوع الدوري الحالي وترتيب كل الوقت — كل درس تنهيه 10 نقاط وكل اختبار تجتازه 50. سجّل دخولك ونافس.",
  alternates: { canonical: "/leaderboard" },
};

export default async function LeaderboardPage() {
  const data = await getLeaderboard(50);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Breadcrumbs
        items={[
          { name: "الرئيسية", href: "/" },
          { name: "المتصدرون", href: "/leaderboard" },
        ]}
      />
      <h1 className="text-3xl font-extrabold md:text-4xl">
        🏆 دوري <span className="neon-text">المتعلمين</span>
      </h1>
      <p className="mt-3 text-muted">
        كل درس تنهيه = 10 نقاط، وكل اختبار تجتازه = 50. الدوري الأسبوعي يبدأ من
        صفر كل يوم اثنين — فرصة جديدة للصدارة كل أسبوع.
      </p>

      {/* League tiers strip */}
      <div className="mt-5 flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <span
            key={l.threshold}
            className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-muted"
            title={`${l.threshold}+ نقطة`}
          >
            {l.icon} {l.title}
          </span>
        ))}
      </div>

      {data === null ? (
        <p className="mt-10 rounded-2xl border border-border bg-surface px-6 py-10 text-center text-muted">
          اللوحة غير متاحة حاليًا.
        </p>
      ) : data.weekly.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <p className="text-4xl">🏁</p>
          <h2 className="mt-3 text-lg font-bold">الدوري ينتظر أبطاله</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            سجّل دخولك، أكمل دروسًا، وسيظهر اسمك هنا — المراكز الأولى فارغة
            ومناداة عليك.
          </p>
          <Link href="/learn" className="btn-neon mt-5 inline-flex px-5 py-2 text-sm">
            ابدأ بجمع النقاط
          </Link>
        </div>
      ) : (
        <LeaderboardTabs weekly={data.weekly} allTime={data.allTime} weekStart={data.weekStart} />
      )}

      <p className="mt-8 text-center text-xs text-muted">
        يُحتسب المتصدرون من تقدم الحسابات المسجّلة فقط —{" "}
        <Link href="/login" className="text-accent underline">
          سجّل دخولك
        </Link>{" "}
        ليُحفظ تقدمك ويدخل المنافسة. تتحدث اللوحة كل 5 دقائق.
      </p>
    </div>
  );
}
