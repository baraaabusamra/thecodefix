import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@tcf/identity/auth";
import { redirect } from "next/navigation";
import { resolveActiveCreator, listPostsByCreator } from "@tcf/creators/creators";
import SubmissionCard from "@tcf/creators/ui/SubmissionCard";
import PageSwitcher from "@tcf/creators/ui/PageSwitcher";

export const metadata: Metadata = {
  title: "منشوراتي",
  description: "جميع منشوراتك المرسلة للمراجعة.",
};

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/creators/submissions");

  const { page } = await searchParams;
  const resolved = await resolveActiveCreator(session.user.id, page);
  if (!resolved) redirect("/creators/register");
  const { active, all } = resolved;

  const submissions = await listPostsByCreator(active.id);
  const list = submissions ?? [];

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 py-16">
      {all.length > 1 && <PageSwitcher pages={all} activeId={active.id} />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">منشورات {active.displayName}</h1>
          <p className="mt-1 text-sm text-muted">
            جميع المنشورات التي أرسلتها للمراجعة.
          </p>
        </div>
        <Link
          href={`/creators/submit?page=${active.id}`}
          className="btn-neon rounded-xl px-4 py-2 text-sm font-semibold"
        >
          + منشور جديد
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="mt-16 text-center text-muted">
          <p>لم تنشر أي شيء بعد.</p>
          <Link
            href={`/creators/submit?page=${active.id}`}
            className="mt-2 inline-block text-brand-cyan hover:underline"
          >
            أنشئ أول منشور
          </Link>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {list.map((sub) => (
            <SubmissionCard
              key={sub.id}
              submission={sub}
              creatorDisplayName={active.displayName}
              manageable
            />
          ))}
        </div>
      )}
    </div>
  );
}
