// Official, authoritative reference for each track. Rendered at the bottom of
// every lesson as an external "المرجع الرسمي" link. This gives all 768 lessons
// at least one outbound DoFollow link to a high-authority source (helps E-E-A-T
// and satisfies the "external resource link" SEO signal), and points learners
// at the canonical docs when they want to go deeper.
export type TrackResource = { label: string; url: string };

export const TRACK_RESOURCES: Record<string, TrackResource> = {
  html: { label: "توثيق HTML على MDN", url: "https://developer.mozilla.org/en-US/docs/Web/HTML" },
  css: { label: "توثيق CSS على MDN", url: "https://developer.mozilla.org/en-US/docs/Web/CSS" },
  javascript: { label: "توثيق JavaScript على MDN", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript" },
  typescript: { label: "التوثيق الرسمي لـ TypeScript", url: "https://www.typescriptlang.org/docs/" },
  react: { label: "التوثيق الرسمي لـ React", url: "https://react.dev/" },
  nextjs: { label: "التوثيق الرسمي لـ Next.js", url: "https://nextjs.org/docs" },
  nodejs: { label: "التوثيق الرسمي لـ Node.js", url: "https://nodejs.org/docs/latest/api/" },
  python: { label: "التوثيق الرسمي لـ Python", url: "https://docs.python.org/3/" },
  django: { label: "التوثيق الرسمي لـ Django", url: "https://docs.djangoproject.com/" },
  java: { label: "توثيق Java من Oracle", url: "https://docs.oracle.com/en/java/" },
  csharp: { label: "توثيق C# من Microsoft", url: "https://learn.microsoft.com/dotnet/csharp/" },
  cpp: { label: "مرجع C++ الرسمي", url: "https://en.cppreference.com/w/cpp" },
  c: { label: "مرجع لغة C الرسمي", url: "https://en.cppreference.com/w/c" },
  go: { label: "التوثيق الرسمي لـ Go", url: "https://go.dev/doc/" },
  rust: { label: "كتاب Rust الرسمي", url: "https://doc.rust-lang.org/book/" },
  kotlin: { label: "التوثيق الرسمي لـ Kotlin", url: "https://kotlinlang.org/docs/home.html" },
  swift: { label: "كتاب Swift الرسمي", url: "https://docs.swift.org/swift-book/" },
  php: { label: "التوثيق الرسمي لـ PHP", url: "https://www.php.net/docs.php" },
  laravel: { label: "التوثيق الرسمي لـ Laravel", url: "https://laravel.com/docs" },
  flutter: { label: "التوثيق الرسمي لـ Flutter", url: "https://docs.flutter.dev/" },
  sql: { label: "توثيق SQL في PostgreSQL", url: "https://www.postgresql.org/docs/current/sql.html" },
  mongodb: { label: "التوثيق الرسمي لـ MongoDB", url: "https://www.mongodb.com/docs/" },
  git: { label: "التوثيق الرسمي لـ Git", url: "https://git-scm.com/doc" },
  docker: { label: "التوثيق الرسمي لـ Docker", url: "https://docs.docker.com/" },
  linux: { label: "صفحات دليل Linux الرسمية", url: "https://man7.org/linux/man-pages/" },
  tailwind: { label: "التوثيق الرسمي لـ Tailwind CSS", url: "https://tailwindcss.com/docs" },
  networking: { label: "توثيق HTTP والشبكات على MDN", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP" },
  "rest-api": { label: "توثيق HTTP على MDN", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP" },
  cybersecurity: { label: "OWASP — مرجع أمن التطبيقات", url: "https://owasp.org/" },
  oop: { label: "البرمجة الكائنية على ويكيبيديا", url: "https://en.wikipedia.org/wiki/Object-oriented_programming" },
  dsa: { label: "هياكل البيانات على ويكيبيديا", url: "https://en.wikipedia.org/wiki/Data_structure" },
  "ai-ml": { label: "توثيق scikit-learn الرسمي", url: "https://scikit-learn.org/stable/" },
};
