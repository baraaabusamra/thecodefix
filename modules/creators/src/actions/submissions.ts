"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@tcf/identity/auth";
import { getPost, getCreator, deletePost } from "../creators";
import { rateLimit } from "@tcf/core/rate-limit";

export async function deleteOwnPost(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!rateLimit(`delete-post:${session.user.id}`, 10, 10 * 60 * 1000)) {
    throw new Error("Too many requests");
  }

  const postId = String(formData.get("postId") ?? "");
  if (!postId) throw new Error("Invalid input.");

  const post = await getPost(postId);
  if (!post) throw new Error("Not found");

  const creator = await getCreator(post.creatorId);
  if (!creator || creator.userId !== session.user.id) {
    throw new Error("Forbidden");
  }

  await deletePost(postId);

  revalidatePath("/creators/submissions");
  revalidatePath(`/creators/${encodeURIComponent(creator.displayName)}`);
  revalidatePath("/creators/gallery");

  redirect(`/creators/submissions?page=${creator.id}`);
}
