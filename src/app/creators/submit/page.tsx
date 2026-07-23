import { Suspense } from "react";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { resolveActiveCreator } from "@/lib/creators";
import PostForm from "@/components/creators/VideoSubmissionForm";

export const metadata: Metadata = {
  title: "منشور جديد",
  description: "انشر منشورًا جديدًا (نص + صورة اختيارية + رابط اختياري) للمراجعة.",
};

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/creators/submit");

  const { page } = await searchParams;
  const resolved = await resolveActiveCreator(session.user.id, page);
  if (!resolved) redirect("/creators/register");

  return (
    <Suspense fallback={<div className="py-20 text-center text-muted">...</div>}>
      <PostForm pages={resolved.all} activeId={resolved.active.id} />
    </Suspense>
  );
}
