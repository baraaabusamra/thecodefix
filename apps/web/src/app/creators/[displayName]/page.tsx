import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCreatorByDisplayName, listPostsByCreator } from "@tcf/creators/creators";
import CreatorProfileCard from "@tcf/creators/ui/CreatorProfileCard";
import SubmissionCard from "@tcf/creators/ui/SubmissionCard";
import JsonLd from "@tcf/ui/ui/JsonLd";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ displayName: string }>;
}): Promise<Metadata> {
  const { displayName } = await params;
  const creator = await getCreatorByDisplayName(decodeURIComponent(displayName));
  if (!creator) return { title: "الصفحة غير موجودة" };

  return {
    title: `${creator.displayName} — مبدع The Code Fix`,
    description: creator.bio ?? `صفحة ${creator.displayName} على The Code Fix.`,
    openGraph: {
      title: `${creator.displayName} — مبدع The Code Fix`,
      description: creator.bio ?? `تصفّح منشورات ${creator.displayName}.`,
      type: "profile",
    },
  };
}

export default async function CreatorProfilePage({
  params,
}: {
  params: Promise<{ displayName: string }>;
}) {
  const { displayName } = await params;
  const creator = await getCreatorByDisplayName(decodeURIComponent(displayName));
  if (!creator || creator.status === "suspended") notFound();

  const submissions = await listPostsByCreator(creator.id);
  const approved = (submissions ?? []).filter((s) => s.status === "approved");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: creator.displayName,
    description: creator.bio ?? "",
    url: `https://thecodefix.net/creators/${encodeURIComponent(creator.displayName)}`,
    mainEntity: {
      "@type": "Person",
      name: creator.displayName,
      description: creator.bio ?? "",
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-2xl px-4 py-16">
        <CreatorProfileCard creator={creator} />

        <h2 className="mt-10 text-lg font-bold">المنشورات المعتمدة</h2>
        {approved.length === 0 ? (
          <p className="mt-4 text-sm text-muted">لا توجد منشورات معتمدة بعد.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {approved.map((sub) => (
              <SubmissionCard
                key={sub.id}
                submission={sub}
                creatorDisplayName={creator.displayName}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
