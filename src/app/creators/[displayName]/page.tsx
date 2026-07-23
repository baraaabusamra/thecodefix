import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCreatorByDisplayName, listSubmissionsByCreator } from "@/lib/creators";
import CreatorProfileCard from "@/components/creators/CreatorProfileCard";
import SubmissionCard from "@/components/creators/SubmissionCard";
import JsonLd from "@/components/JsonLd";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ displayName: string }>;
}): Promise<Metadata> {
  const { displayName } = await params;
  const creator = await getCreatorByDisplayName(decodeURIComponent(displayName));
  if (!creator) return { title: "المبدع غير موجود" };

  return {
    title: `${creator.displayName} — مبدع The Code Fix`,
    description: creator.bio ?? `صفحة المبدع ${creator.displayName} على The Code Fix.`,
    openGraph: {
      title: `${creator.displayName} — مبدع The Code Fix`,
      description: creator.bio ?? `شاهد فيديوهات ${creator.displayName} التعليمية.`,
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
  if (!creator) notFound();

  const submissions = await listSubmissionsByCreator(creator.id);
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

        <h2 className="mt-10 text-lg font-bold">الفيديوهات المعتمدة</h2>
        {approved.length === 0 ? (
          <p className="mt-4 text-sm text-muted">لا توجد فيديوهات معتمدة بعد.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {approved.map((sub) => (
              <SubmissionCard key={sub.id} submission={sub} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
