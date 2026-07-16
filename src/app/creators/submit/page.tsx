import { Suspense } from "react";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCreatorByUserId } from "@/lib/creators";
import VideoSubmissionForm from "@/components/creators/VideoSubmissionForm";

export const metadata: Metadata = {
  title: "إرسال فيديو جديد",
  description: "أرسل فيديو تعليميًا من YouTube أو Instagram أو TikTok أو Facebook للمراجعة.",
};

export default async function SubmitPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/creators/submit");

  const creator = await getCreatorByUserId(session.user.id);
  if (!creator) redirect("/creators/register");

  return (
    <Suspense fallback={<div className="py-20 text-center text-muted">...</div>}>
      <VideoSubmissionForm />
    </Suspense>
  );
}
