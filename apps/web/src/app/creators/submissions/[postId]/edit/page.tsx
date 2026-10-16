import type { Metadata } from "next";
import { auth } from "@tcf/identity/auth";
import { notFound, redirect } from "next/navigation";
import { getPost, getCreator } from "@tcf/creators/creators";
import EditPostForm from "@tcf/creators/ui/EditPostForm";

export const metadata: Metadata = {
  title: "تعديل المنشور",
  robots: { index: false, follow: false },
};

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/creators/submissions");

  const { postId } = await params;
  const post = await getPost(postId);
  if (!post) notFound();

  const creator = await getCreator(post.creatorId);
  if (!creator || creator.userId !== session.user.id) notFound();

  return <EditPostForm post={post} />;
}
