import type { Metadata } from "next";
import Link from "next/link";
import { getTracks, getLessons } from "@/lib/content";
import { hasQuiz } from "@/lib/quiz";
import { getRoadmaps } from "@/lib/roadmaps";
import ContinueLearning from "@/components/ContinueLearning";
import TrackedCta from "@/components/TrackedCta";
import RevealObserver from "@/components/RevealObserver";
import JsonLd from "@/components/JsonLd";

// Homepage FAQ — rendered visibly + as FAQPage JSON-LD for rich results.
const FAQS: { q: string; a: string }[] = [
  {
    q: "هل المنصّة مجّانية؟",
    a: "نعم، كل الدروس والمسارات والاختبارات والشهادات على The Code Fix مجّانية بالكامل.",
  },
  {
    q: "هل أحصل على شهادة؟",
    a: "نعم، عند اجتياز اختبار أي مسار تحصل على شهادة إتمام قابلة للطباعة والتحقّق.",
  },
  {
    q: "ما أفضل لغة برمجة أبدأ بها؟",
    a: "للمبتدئين ننصح بـ Python لسهولتها، أو HTML و CSS و JavaScript لتطوير الويب. تابع خريطة طريق الأساسيات للبدء الصحيح.",
  },
  {
    q: "هل أحتاج خبرة سابقة في البرمجة؟",
    a: "لا، كل المسارات تبدأ من الصفر وتتدرّج خطوة بخطوة حتى الاحتراف بشرح عربي واضح.",
  },
  {
    q: "كم مسارًا تعليميًّا متاح؟",
    a: "أكثر من 30 مسارًا يغطّي تطوير الويب والموبايل وقواعد البيانات والأمن السيبراني والذكاء وغيرها، مع أمثلة تفاعلية.",
  },
];

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Short labels for the homepage roadmap chips.
const ROADMAP_SHORT: Record<string, string> = {
  frontend: "Frontend",
  backend: "Backend",
  fullstack: "Full-Stack",
  mobile: "Mobile",
  foundations: "الأساسيات",
  devops: "DevOps",
  python: "Python",
  cybersecurity: "الأمن السيبراني",
  gamedev: "الألعاب",
};

// Featured subjects shown as big W3Schools-style rows (tagline + code sample).
const FEATURED: Record<string, { tagline: string; code: string }> = {
  html: {
    tagline: "لغة بناء صفحات الويب",
    code: `<!DOCTYPE html>
<html>
<head>
  <title>صفحتي</title>
</head>
<body>
  <h1>مرحبًا بالعالم</h1>
  <p>أول صفحة لي.</p>
</body>
</html>`,
  },
  css: {
    tagline: "لغة تنسيق صفحات الويب",
    code: `body {
  background-color: #07060a;
}
h1 {
  color: #b026ff;
  text-align: center;
}`,
  },
  javascript: {
    tagline: "لغة برمجة صفحات الويب",
    code: `function greet(name) {
  return "أهلًا يا " + name;
}

console.log(greet("براء"));`,
  },
  python: {
    tagline: "لغة بسيطة وقوية للمبتدئين",
    code: `name = "براء"
print(f"أهلًا يا {name}")

for i in range(3):
    print(i)`,
  },
  react: {
    tagline: "مكتبة بناء واجهات المستخدم",
    code: `function App() {
  return <h1>أهلًا React</h1>;
}`,
  },
  sql: {
    tagline: "لغة قواعد البيانات",
    code: `SELECT name, age
FROM users
WHERE age >= 18;`,
  },
  typescript: {
    tagline: "جافاسكريبت مع أنواع آمنة",
    code: `let age: number = 25;

function add(a: number, b: number): number {
  return a + b;
}`,
  },
  nodejs: {
    tagline: "تشغيل جافاسكريبت على الخادم",
    code: `import http from "node:http";

http.createServer((req, res) => {
  res.end("مرحبًا من Node.js");
}).listen(3000);`,
  },
  java: {
    tagline: "لغة الشركات والأندرويد",
    code: `public class Main {
  public static void main(String[] args) {
    System.out.println("مرحبًا من Java");
  }
}`,
  },
  csharp: {
    tagline: "لغة مايكروسوفت والألعاب (Unity)",
    code: `using System;

class Program {
  static void Main() {
    Console.WriteLine("مرحبًا من C#");
  }
}`,
  },
  php: {
    tagline: "لغة الخوادم الأشهر",
    code: `<?php
$name = "براء";
echo "مرحبًا $name";
?>`,
  },
  laravel: {
    tagline: "إطار PHP لبناء تطبيقات احترافية",
    code: `Route::get('/', function () {
    return 'مرحبًا من Laravel';
});`,
  },
  django: {
    tagline: "إطار بايثون للويب",
    code: `from django.http import HttpResponse

def home(request):
    return HttpResponse("مرحبًا")`,
  },
  cpp: {
    tagline: "لغة سريعة للأنظمة والألعاب",
    code: `#include <iostream>
using namespace std;

int main() {
  cout << "مرحبًا من C++";
}`,
  },
  c: {
    tagline: "أمّ لغات البرمجة",
    code: `#include <stdio.h>

int main() {
  printf("مرحبًا من C\\n");
  return 0;
}`,
  },
  go: {
    tagline: "لغة جوجل السريعة للخوادم",
    code: `package main

import "fmt"

func main() {
  fmt.Println("مرحبًا من Go")
}`,
  },
  rust: {
    tagline: "السرعة مع أمان الذاكرة",
    code: `fn main() {
    println!("مرحبًا من Rust");
}`,
  },
  kotlin: {
    tagline: "اللغة الرسمية للأندرويد",
    code: `fun main() {
    println("مرحبًا من Kotlin")
}`,
  },
  swift: {
    tagline: "لغة تطبيقات Apple",
    code: `let name = "براء"
print("أهلًا \\(name)")`,
  },
  flutter: {
    tagline: "تطبيقات iOS و Android بكود واحد",
    code: `import 'package:flutter/material.dart';

void main() => runApp(
  const MaterialApp(home: Text('أهلًا')),
);`,
  },
  nextjs: {
    tagline: "إطار React للمواقع السريعة",
    code: `export default function Page() {
  return <h1>أهلًا Next.js</h1>;
}`,
  },
  mongodb: {
    tagline: "قاعدة بيانات NoSQL مرنة",
    code: `db.users.insertOne({
  name: "براء",
  age: 25
});`,
  },
  tailwind: {
    tagline: "إطار CSS عملي وسريع",
    code: `<button class="px-4 py-2 bg-purple-600
  text-white rounded-lg">
  زر
</button>`,
  },
};

export default async function Home() {
  const tracks = await getTracks();
  const roadmaps = getRoadmaps();
  const featured = tracks.filter((t) => FEATURED[t.slug]);
  const lessonCounts: Record<string, number> = {};
  await Promise.all(
    tracks.map(async (t) => {
      lessonCounts[t.slug] = (await getLessons(t.slug)).length;
    })
  );

  return (
    <div>
      <RevealObserver />
      {/* ===== Hero (dark neon, animated aurora) ===== */}
      <section className="relative isolate overflow-hidden bg-background">
        <div className="aurora" aria-hidden />
        {/* subtle grid sheen */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          aria-hidden
          style={{
            backgroundImage:
              "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:py-24 md:py-28">
          <span className="glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" />
            {tracks.length}+ مسار تعليمي — مجانًا بالكامل
          </span>
          <h1 className="text-4xl font-extrabold leading-[1.15] sm:text-5xl md:text-7xl md:leading-[1.1]">
            تعلّم البرمجة{" "}
            <span className="neon-text-animated">بالعربي</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted md:text-xl">
            المرجع العربي الأول: شروحات وأمثلة تفاعلية واختبارات وشهادات في{" "}
            {tracks.length}+ مسارًا — من الصفر إلى الاحتراف.
          </p>
          <form
            action="/search"
            className="glass mx-auto mt-9 flex w-full max-w-xl items-center gap-2 rounded-full p-2 shadow-2xl shadow-black/40"
          >
            <input
              name="q"
              placeholder="ابحث عن أي موضوع..."
              aria-label="ابحث في الموقع"
              className="flex-1 bg-transparent px-4 py-2 text-foreground outline-none placeholder:text-muted"
            />
            <button className="btn-neon px-6 py-2">ابحث</button>
          </form>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <TrackedCta
              href="/learn"
              event="learn_cta_click"
              properties={{ source: "homepage_hero" }}
              className="btn-neon px-10 py-3 text-lg"
            >
              ابدأ التعلّم مجانًا
            </TrackedCta>
            <Link
              href="/roadmaps"
              className="glass card-glow rounded-[10px] px-8 py-3 text-lg font-semibold text-foreground"
            >
              خرائط الطريق
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Continue learning (returning visitors) ===== */}
      <ContinueLearning />

      {/* ===== Roadmaps banner — "where do I start?" ===== */}
      <section className="reveal border-y border-border bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-12 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">
            لا تعرف من أين تبدأ؟ <span className="neon-text">اتبع خريطة طريق</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted">
            مسارات واضحة من الصفر إلى الاحتراف — مرتّبة خطوة بخطوة لهدفك، مع شرح
            لماذا تتعلّم كل مرحلة وأهم مفاهيمها.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {roadmaps.map((r) => (
              <Link
                key={r.slug}
                href={`/roadmaps/${r.slug}`}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold transition hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]"
              >
                {r.icon} {ROADMAP_SHORT[r.slug] ?? r.title}
              </Link>
            ))}
          </div>
          <Link href="/roadmaps" className="btn-neon mt-7 px-8 py-3">
            تصفّح كل خرائط الطريق ←
          </Link>
        </div>
      </section>

      {/* ===== Featured subjects: one section heading for the whole showcase,
             so the individual subject names below can be h3 (keeps the page from
             having 20+ h2 tags and gives a clean heading hierarchy). ===== */}
      <section className="reveal border-t border-border bg-background">
        <div className="mx-auto max-w-4xl px-4 pt-16 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">
            تعلّم أشهر لغات وتقنيات البرمجة{" "}
            <span className="neon-text">بالعربي</span>
          </h2>
          <p className="mt-3 text-muted">
            أمثلة حيّة من كل لغة — اضغط أي تقنية لتبدأ مسارها من الصفر مجانًا.
          </p>
        </div>
      </section>

      {/* ===== Big alternating subject rows (W3Schools-style) ===== */}
      {featured.map((t) => {
        const sample = FEATURED[t.slug];
        return (
          <section
            key={t.slug}
            id={t.slug}
            style={{
              backgroundImage: `radial-gradient(80% 120% at 0% 0%, color-mix(in srgb, ${t.color} 9%, transparent), transparent 60%)`,
            }}
            className="reveal scroll-mt-32 border-t border-border bg-background"
          >
            <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 md:grid-cols-2 md:py-20">
              {/* Text + buttons. min-w-0 on both cells: without it the code
                  sample's widest line sets the grid track's min-content width
                  and drags the whole page wider than a phone screen. */}
              <div className="min-w-0 text-center">
                <span
                  className="mb-3 inline-grid h-16 w-16 place-items-center rounded-2xl text-3xl"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${t.color} 14%, transparent)`,
                  }}
                >
                  {t.icon}
                </span>
                <h3
                  className="break-words text-4xl font-extrabold sm:text-6xl md:text-7xl"
                  style={{ color: t.color }}
                >
                  {t.title}
                </h3>
                <p className="mt-3 text-lg text-muted">{sample.tagline}</p>
                <div className="mx-auto mt-6 flex max-w-xs flex-col gap-3">
                  <Link
                    href={`/learn/${t.slug}`}
                    className="btn-neon px-6 py-3 text-lg"
                  >
                    تعلّم {t.title}
                  </Link>
                  {hasQuiz(t.slug) && (
                    <Link
                      href={`/quiz/${t.slug}`}
                      className="glass card-glow rounded-[10px] px-6 py-3 font-semibold text-foreground"
                    >
                      احصل على شهادة
                    </Link>
                  )}
                </div>
              </div>

              {/* Code example card (dark glass, neon edge) */}
              <div className="glass card-glow min-w-0 rounded-2xl p-5">
                <div className="mb-3 flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                  <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                  <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
                  <span className="ms-2 text-sm font-bold text-muted">
                    مثال {t.title}
                  </span>
                </div>
                <pre
                  dir="ltr"
                  className="overflow-x-auto rounded-xl bg-[#0d0b14] p-4 text-sm leading-relaxed text-[#e6e4ef]"
                  style={{ borderInlineStart: `4px solid ${t.color}` }}
                >
                  <code>{sample.code}</code>
                </pre>
                <Link
                  href="/playground"
                  className="btn-neon mt-3 px-6 py-2 text-sm"
                >
                  جرّب بنفسك
                </Link>
              </div>
            </div>
          </section>
        );
      })}

      {/* ===== All tracks grid ===== */}
      <section className="reveal border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 2xl:max-w-[1500px]">
          <h2 className="mb-2 text-center text-3xl font-bold">كل المسارات</h2>
          <p className="mb-10 text-center text-muted">
            {tracks.length} مسارًا — كل واحد بشروحات واختبار وشهادة.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tracks.map((t) => (
              <Link
                key={t.slug}
                href={`/learn/${t.slug}`}
                className="card-glow flex items-center gap-3 rounded-xl border border-border bg-surface p-4"
              >
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl"
                  style={{ backgroundColor: `${t.color}22` }}
                >
                  {t.icon}
                </span>
                <div className="min-w-0">
                  <p className="font-bold">تعلّم {t.title}</p>
                  <p className="truncate text-xs text-muted">
                    {lessonCounts[t.slug]} درس
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ (rich results) ===== */}
      <section className="reveal border-t border-border bg-surface">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }}
        />
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="mb-8 text-center text-3xl font-bold">
            الأسئلة الشائعة
          </h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="card-glow rounded-xl border border-border bg-surface p-4 open:border-brand-purple/40"
              >
                <summary className="cursor-pointer font-semibold">
                  {f.q}
                </summary>
                <p className="mt-2 text-sm text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Feature band ===== */}
      <section className="reveal border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-3">
          <Feature icon="⚡" title="محرّر تفاعلي" text="اكتب الكود وشغّله مباشرة في متصفّحك." href="/playground" cta="جرّب المحرّر" />
          <Feature icon="🧠" title="اختبارات وشهادات" text="اختبر فهمك واحصل على شهادة إتمام." href="/learn" cta="ابدأ اختبارًا" />
          <Feature icon="💼" title="وظائف ومدوّنة" text="وظائف برمجية ومقالات في العالم العربي." href="/jobs" cta="تصفّح الوظائف" />
        </div>
      </section>
    </div>
  );
}

function Feature({ icon, title, text, href, cta }: { icon: string; title: string; text: string; href: string; cta: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-surface text-3xl neon-glow">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-bold">{title}</h3>
      <p className="mb-4 text-sm text-muted">{text}</p>
      <Link href={href} className="font-semibold text-accent hover:underline">
        {cta}
      </Link>
    </div>
  );
}
