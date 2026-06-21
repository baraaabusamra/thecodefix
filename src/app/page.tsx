import Link from "next/link";
import { getTracks, getLessons } from "@/lib/content";
import { hasQuiz } from "@/lib/quiz";
import { getRoadmaps } from "@/lib/roadmaps";

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
      {/* ===== Hero (light W3Schools-style band) ===== */}
      <section
        style={{
          background: "linear-gradient(135deg, #f3e9ff 0%, #e6fbff 100%)",
          color: "#15151c",
        }}
      >
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h1 className="text-5xl font-extrabold leading-[1.1] md:text-7xl">
            تعلّم البرمجة{" "}
            <span style={{ color: "var(--brand-purple)" }}>بالعربي</span>
          </h1>
          <p
            className="mx-auto mt-5 max-w-2xl text-lg md:text-xl"
            style={{ color: "#3a3a44" }}
          >
            المرجع العربي الأول: شروحات وأمثلة تفاعلية واختبارات وشهادات في{" "}
            {tracks.length}+ مسارًا — مجانًا.
          </p>
          <form
            action="/search"
            className="mx-auto mt-8 flex w-full max-w-xl items-center gap-2 rounded-full border border-black/10 bg-white p-2 shadow-md"
          >
            <input
              name="q"
              placeholder="ابحث عن أي موضوع..."
              className="flex-1 bg-transparent px-4 py-2 text-[#15151c] outline-none placeholder:text-[#9a9aa5]"
            />
            <button className="rounded-full bg-brand-purple px-6 py-2 font-semibold text-white">
              ابحث
            </button>
          </form>
          <Link
            href="/learn"
            className="mt-6 inline-block rounded-full bg-brand-purple px-10 py-3 text-lg font-semibold text-white transition hover:opacity-90"
          >
            ابدأ التعلّم مجانًا
          </Link>
        </div>
      </section>

      {/* ===== Roadmaps banner — "where do I start?" ===== */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-12 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">
            لا تعرف من أين تبدأ؟ <span className="neon-text">اتبع خريطة طريق</span> 🗺️
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
                className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:neon-glow"
              >
                {r.icon} {ROADMAP_SHORT[r.slug] ?? r.title}
              </Link>
            ))}
          </div>
          <Link
            href="/roadmaps"
            className="mt-7 inline-block rounded-full bg-brand-purple px-8 py-3 font-semibold text-white transition hover:opacity-90"
          >
            تصفّح كل خرائط الطريق ←
          </Link>
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
              backgroundColor: `color-mix(in srgb, ${t.color} 16%, white)`,
              color: "#15151c",
            }}
            className="scroll-mt-32"
          >
            <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 md:grid-cols-2">
              {/* Text + buttons */}
              <div className="text-center">
                <h2 className="text-6xl font-extrabold md:text-7xl">
                  {t.title}
                </h2>
                <p className="mt-3 text-lg" style={{ color: "#3a3a44" }}>
                  {sample.tagline}
                </p>
                <div className="mx-auto mt-6 flex max-w-xs flex-col gap-3">
                  <Link
                    href={`/learn/${t.slug}`}
                    className="rounded-full bg-brand-purple px-6 py-3 text-lg font-bold text-white transition hover:opacity-90"
                  >
                    تعلّم {t.title}
                  </Link>
                  {hasQuiz(t.slug) && (
                    <Link
                      href={`/quiz/${t.slug}`}
                      className="rounded-full border border-black/15 bg-white px-6 py-3 font-semibold text-[#15151c] transition hover:bg-black/5"
                    >
                      احصل على شهادة
                    </Link>
                  )}
                </div>
              </div>

              {/* Code example card (light, W3Schools-style) */}
              <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                <h3 className="mb-3 font-bold text-[#15151c]">
                  مثال {t.title}:
                </h3>
                <pre
                  dir="ltr"
                  className="overflow-x-auto rounded-xl bg-[#f4f4f6] p-4 text-sm leading-relaxed text-[#15151c]"
                  style={{ borderInlineStart: `4px solid ${t.color}` }}
                >
                  <code>{sample.code}</code>
                </pre>
                <Link
                  href="/playground"
                  className="mt-3 inline-block rounded-full bg-brand-cyan px-6 py-2 font-semibold text-black transition hover:opacity-90"
                >
                  جرّب بنفسك ⚡
                </Link>
              </div>
            </div>
          </section>
        );
      })}

      {/* ===== All tracks grid ===== */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="mb-2 text-center text-3xl font-bold">كل المسارات</h2>
          <p className="mb-10 text-center text-muted">
            {tracks.length} مسارًا — كل واحد بشروحات واختبار وشهادة.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((t) => (
              <Link
                key={t.slug}
                href={`/learn/${t.slug}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-background p-4 transition hover:-translate-y-0.5 hover:neon-glow"
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

      {/* ===== Feature band ===== */}
      <section className="border-t border-border">
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
      <Link href={href} className="font-semibold text-brand-cyan hover:underline">
        {cta} →
      </Link>
    </div>
  );
}
