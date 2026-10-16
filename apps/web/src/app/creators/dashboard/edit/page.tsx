import type { Metadata } from "next";
import { auth } from "@tcf/identity/auth";
import { redirect, notFound } from "next/navigation";
import { getCreator } from "@tcf/creators/creators";
import EditProfileForm from "@tcf/creators/ui/EditProfileForm";

export const metadata: Metadata = {
  title: "تعديل الصفحة",
  robots: { index: false, follow: false },
};

export default async function EditCreatorProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/creators/dashboard");

  const { page } = await searchParams;
  if (!page) notFound();

  const creator = await getCreator(page);
  if (!creator || creator.userId !== session.user.id) notFound();

  return <EditProfileForm creator={creator} />;
}
