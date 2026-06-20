import type { Metadata } from "next";
import Playground from "@/components/Playground";

export const metadata: Metadata = {
  title: "محرّر الأكواد",
  description:
    "محرّر أكواد تفاعلي مباشر في المتصفح — اكتب جافاسكريبت أو HTML/CSS وشغّلها فورًا وشاركها برابط.",
};

const DEFAULT_JS = `// مرحبًا بك في محرّر The Code Fix
const name = "براء";
console.log("أهلًا يا " + name + "!");

for (let i = 1; i <= 5; i++) {
  console.log("العدّ:", i);
}`;

const DEFAULT_HTML = `<h1 style="color:#b026ff">أهلًا بك!</h1>
<p>عدّل هذا الكود وشاهد النتيجة مباشرة.</p>
<button style="background:#00f5ff;border:none;padding:8px 16px;border-radius:8px">
  زر تجريبي
</button>`;

function decode(code: string | undefined, fallback: string): string {
  if (!code) return fallback;
  try {
    return decodeURIComponent(atob(code));
  } catch {
    return fallback;
  }
}

export default async function PlaygroundPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; mode?: string }>;
}) {
  const { code, mode } = await searchParams;
  const htmlMode = mode === "html";
  const initialCode = decode(code, htmlMode ? DEFAULT_HTML : DEFAULT_JS);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold neon-text">محرّر الأكواد</h1>
      <p className="mb-6 text-muted">
        {htmlMode
          ? "اكتب HTML و CSS وشاهد النتيجة مباشرة، ثم شارك عملك برابط."
          : "اكتب كود جافاسكريبت وشغّله مباشرة في متصفحك، ثم شارك النتيجة برابط."}
      </p>

      <div className="mb-6 flex gap-2">
        <a
          href="/playground"
          className={`rounded-lg border px-4 py-2 text-sm ${
            htmlMode ? "border-border text-muted" : "border-brand-purple text-brand-purple"
          }`}
        >
          JavaScript
        </a>
        <a
          href="/playground?mode=html"
          className={`rounded-lg border px-4 py-2 text-sm ${
            htmlMode ? "border-brand-purple text-brand-purple" : "border-border text-muted"
          }`}
        >
          HTML / CSS
        </a>
      </div>

      <Playground
        key={htmlMode ? "html" : "js"}
        initialCode={initialCode}
        mode={htmlMode ? "html" : "js"}
        height={400}
        showShare
      />
    </div>
  );
}
