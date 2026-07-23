import { Suspense } from "react";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import CreatorRegisterForm from "@/components/creators/CreatorRegisterForm";

export const metadata: Metadata = {
  title: "التسجيل كمنشئ محتوى",
  description: "سجّل كمنشئ محتوى في The Code Fix وشارك فيديوهاتك التعليمية.",
};

export default async function RegisterPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/creators/register");

  return (
    <Suspense fallback={<div className="py-20 text-center text-muted">...</div>}>
      <CreatorRegisterForm />
    </Suspense>
  );
}
