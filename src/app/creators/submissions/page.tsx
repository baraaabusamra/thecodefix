import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCreatorByUserId, listSubmissionsByCreator } from "@/lib/creators";
import SubmissionCard from "@/components/creators/SubmissionCard";

export const metadata: Metadata = {
  title: "فيديوهاتي",
  description: "جميع فيديوهاتك المرسلة للمراجعة.",
};

export default async function SubmissionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/creators/submissions");

  const creator = await getCreatorByUserId(session.user.id);
  if (!creator) redirect("/creators/register");

  const submissions = await listSubmissionsByCreator(creator.id);
  const list = submissions ?? [];

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">فيديوهاتي</h1>
          <p className="mt-1 text-sm text-muted">
            جميع الفيديوهات التي أرسلتها للمراجعة.
          </p>
        </div>
        <Link
          href="/creators/submit"
          className="btn-neon rounded-xl px-4 py-2 text-sm font-semibold"
        >
          + إرسال فيديو
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="mt-16 text-center text-muted">
          <p>لم ترسل أي فيديو بعد.</p>
          <Link
            href="/creators/submit"
            className="mt-2 inline-block text-brand-cyan hover:underline"
          >
            إرسال أول فيديو
          </Link>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {list.map((sub) => (
            <SubmissionCard key={sub.id} submission={sub} />
          ))}
        </div>
      )}
    </div>
  );
}
