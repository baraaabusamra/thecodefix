import type { Metadata } from "next";
import Playground from "@/components/Playground";

export const metadata: Metadata = {
  title: "محرّر الأكواد",
  description:
    "محرّر أكواد تفاعلي مباشر في المتصفح — اكتب JavaScript أو HTML/CSS أو Python وشغّلها فورًا وشاركها برابط.",
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

const DEFAULT_PYTHON = `# مرحبًا بك في محرّر بايثون
name = "براء"
print(f"أهلًا يا {name}!")

for i in range(1, 6):
    print("العدّ:", i)`;

type Mode = "js" | "html" | "python";

const DEFAULTS: Record<Mode, string> = {
  js: DEFAULT_JS,
  html: DEFAULT_HTML,
  python: DEFAULT_PYTHON,
};

const DESCRIPTIONS: Record<Mode, string> = {
  js: "اكتب كود JavaScript وشغّله مباشرة في متصفحك، ثم شارك النتيجة برابط.",
  html: "اكتب HTML و CSS وشاهد النتيجة مباشرة، ثم شارك عملك برابط.",
  python:
    "اكتب كود Python وشغّله مباشرة في متصفحك! (التشغيل الأول يستغرق بضع ثوانٍ لتحميل بايثون).",
};

const TABS: { mode: Mode; label: string; href: string }[] = [
  { mode: "js", label: "JavaScript", href: "/playground" },
  { mode: "html", label: "HTML / CSS", href: "/playground?mode=html" },
  { mode: "python", label: "Python", href: "/playground?mode=python" },
];

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
  const { code, mode: rawMode } = await searchParams;
  const mode: Mode =
    rawMode === "html" ? "html" : rawMode === "python" ? "python" : "js";
  const initialCode = decode(code, DEFAULTS[mode]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold neon-text">محرّر الأكواد</h1>
      <p className="mb-6 text-muted">{DESCRIPTIONS[mode]}</p>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = t.mode === mode;
          return (
            <a
              key={t.mode}
              href={t.href}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                active
                  ? "border-brand-purple text-brand-purple"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </a>
          );
        })}
      </div>

      <Playground
        key={mode}
        initialCode={initialCode}
        mode={mode}
        height={400}
        showShare
      />
    </div>
  );
}
