[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $projectRoot "docs\ROADMAP.md"
$outputPath = Join-Path $projectRoot "docs\ROADMAP.html"

if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Roadmap source not found: $sourcePath"
}

$roadmapHtml = (ConvertFrom-Markdown -Path $sourcePath).Html
$generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm"

$template = @'
<!doctype html>
<html lang="ar" dir="rtl" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark light">
  <meta name="description" content="الخطة الكبرى الموحّدة لمنصة The Code Fix: الأهداف، المراحل، الميزات، SEO ومؤشرات النجاح.">
  <title>The Code Fix — الخطة الكبرى الموحّدة</title>
  <style>
    :root {
      --bg: #070912;
      --surface: rgba(16, 20, 38, 0.88);
      --surface-strong: #11162a;
      --surface-soft: rgba(31, 38, 67, 0.62);
      --text: #f6f7ff;
      --muted: #abb3ca;
      --border: rgba(166, 179, 221, 0.18);
      --purple: #b866ff;
      --purple-strong: #9c35ff;
      --cyan: #28e7f2;
      --green: #54e4a0;
      --orange: #ffb45c;
      --danger: #ff7d9f;
      --shadow: 0 20px 60px rgba(0, 0, 0, 0.26);
      --radius: 20px;
      --code-bg: #090d1a;
      --table-stripe: rgba(255, 255, 255, 0.025);
    }

    html[data-theme="light"] {
      --bg: #f5f6fb;
      --surface: rgba(255, 255, 255, 0.94);
      --surface-strong: #ffffff;
      --surface-soft: #eef0f8;
      --text: #15192a;
      --muted: #596178;
      --border: rgba(27, 35, 64, 0.14);
      --purple: #7620c8;
      --purple-strong: #6718b4;
      --cyan: #007c89;
      --green: #087b50;
      --orange: #995400;
      --danger: #b72551;
      --shadow: 0 16px 45px rgba(30, 34, 55, 0.1);
      --code-bg: #eceef6;
      --table-stripe: rgba(25, 31, 56, 0.035);
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      min-height: 100vh;
      color: var(--text);
      background:
        radial-gradient(circle at 86% 4%, rgba(156, 53, 255, 0.18), transparent 28rem),
        radial-gradient(circle at 8% 22%, rgba(40, 231, 242, 0.09), transparent 24rem),
        var(--bg);
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      line-height: 1.8;
      transition: background-color .2s ease, color .2s ease;
    }

    a { color: var(--cyan); text-underline-offset: 4px; }
    a:hover { color: var(--purple); }
    button, input { font: inherit; }
    button { cursor: pointer; }

    .skip-link {
      position: fixed;
      inset-block-start: 12px;
      inset-inline-start: 12px;
      z-index: 100;
      padding: 8px 14px;
      color: #060812;
      background: var(--cyan);
      border-radius: 10px;
      transform: translateY(-160%);
    }
    .skip-link:focus { transform: translateY(0); }

    .scroll-progress {
      position: fixed;
      inset: 0 0 auto;
      z-index: 90;
      height: 4px;
      background: transparent;
    }
    .scroll-progress > span {
      display: block;
      width: 0;
      height: 100%;
      background: linear-gradient(90deg, var(--purple), var(--cyan));
    }

    .hero {
      position: relative;
      overflow: hidden;
      padding: 74px 24px 42px;
      border-bottom: 1px solid var(--border);
    }
    .hero::after {
      content: "";
      position: absolute;
      width: 420px;
      height: 420px;
      inset-block-start: -290px;
      inset-inline-end: 8%;
      border: 1px solid rgba(184, 102, 255, 0.3);
      border-radius: 50%;
      box-shadow: 0 0 90px rgba(184, 102, 255, 0.15);
    }
    .hero-inner { width: min(1180px, 100%); margin: auto; position: relative; z-index: 1; }
    .eyebrow {
      display: inline-flex;
      gap: 8px;
      align-items: center;
      padding: 5px 11px;
      color: var(--cyan);
      background: rgba(40, 231, 242, 0.08);
      border: 1px solid rgba(40, 231, 242, 0.25);
      border-radius: 999px;
      font-size: .82rem;
      font-weight: 700;
    }
    .hero h1 {
      max-width: 920px;
      margin: 18px 0 10px;
      font-size: clamp(2.1rem, 6vw, 4.7rem);
      line-height: 1.1;
      letter-spacing: -.04em;
    }
    .hero h1 span {
      color: transparent;
      background: linear-gradient(90deg, var(--purple), var(--cyan));
      -webkit-background-clip: text;
      background-clip: text;
    }
    .hero p { max-width: 790px; margin: 0; color: var(--muted); font-size: 1.08rem; }
    .hero-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
    .action {
      min-height: 42px;
      padding: 8px 14px;
      color: var(--text);
      background: var(--surface-soft);
      border: 1px solid var(--border);
      border-radius: 12px;
    }
    .action:hover { border-color: var(--purple); }
    .action.primary {
      color: #090b14;
      background: linear-gradient(90deg, var(--purple), var(--cyan));
      border-color: transparent;
      font-weight: 800;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(5, minmax(110px, 1fr));
      gap: 10px;
      margin-top: 34px;
    }
    .stat {
      padding: 15px;
      background: rgba(11, 15, 29, 0.5);
      border: 1px solid var(--border);
      border-radius: 16px;
      backdrop-filter: blur(12px);
    }
    html[data-theme="light"] .stat { background: rgba(255, 255, 255, 0.7); }
    .stat strong { display: block; color: var(--cyan); font-size: 1.5rem; line-height: 1.2; }
    .stat span { color: var(--muted); font-size: .82rem; }

    .page {
      display: grid;
      grid-template-columns: minmax(230px, 290px) minmax(0, 860px);
      gap: 28px;
      justify-content: center;
      width: min(1220px, calc(100% - 32px));
      margin: 32px auto 90px;
      align-items: start;
    }

    .sidebar {
      position: sticky;
      inset-block-start: 20px;
      max-height: calc(100vh - 40px);
      overflow: auto;
      padding: 18px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      scrollbar-width: thin;
    }
    .sidebar h2 { margin: 0 0 10px; font-size: 1rem; }
    .sidebar small { display: block; margin-bottom: 14px; color: var(--muted); }
    .toc { display: grid; gap: 5px; }
    .toc a {
      display: block;
      padding: 7px 10px;
      color: var(--muted);
      border-inline-start: 2px solid transparent;
      border-radius: 7px;
      text-decoration: none;
      font-size: .86rem;
      line-height: 1.45;
    }
    .toc a:hover, .toc a.active {
      color: var(--text);
      background: var(--surface-soft);
      border-inline-start-color: var(--cyan);
    }

    .roadmap-content { min-width: 0; }
    .roadmap-content > blockquote {
      margin: 0 0 24px;
      padding: 18px 20px;
      background: linear-gradient(135deg, rgba(184, 102, 255, .11), rgba(40, 231, 242, .07));
      border: 1px solid var(--border);
      border-inline-start: 4px solid var(--purple);
      border-radius: var(--radius);
    }
    .roadmap-content > hr { display: none; }
    .roadmap-section {
      margin-bottom: 20px;
      padding: clamp(20px, 4vw, 36px);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      scroll-margin-top: 24px;
    }
    .roadmap-section > h2 {
      margin: 0 0 22px;
      padding-bottom: 13px;
      color: var(--text);
      border-bottom: 1px solid var(--border);
      font-size: clamp(1.45rem, 3.4vw, 2.1rem);
      line-height: 1.35;
    }
    h3 { margin: 34px 0 10px; color: var(--purple); font-size: 1.3rem; scroll-margin-top: 24px; }
    h4 { margin: 26px 0 8px; color: var(--cyan); font-size: 1.06rem; }
    p { margin: 10px 0; }
    strong { color: var(--text); }
    ul, ol { padding-inline-start: 1.45rem; }
    li { margin: 5px 0; }
    li::marker { color: var(--purple); font-weight: 800; }
    blockquote {
      margin: 18px 0;
      padding: 12px 18px;
      color: var(--muted);
      background: var(--surface-soft);
      border-inline-start: 3px solid var(--cyan);
      border-radius: 12px;
    }
    code {
      color: var(--cyan);
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 1px 5px;
      direction: ltr;
      unicode-bidi: isolate;
    }
    pre {
      overflow: auto;
      padding: 18px;
      direction: ltr;
      text-align: left;
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
    }
    pre code { padding: 0; color: var(--text); background: transparent; border: 0; }
    .table-wrap { overflow-x: auto; margin: 18px 0 24px; border: 1px solid var(--border); border-radius: 14px; }
    table { width: 100%; border-collapse: collapse; min-width: 620px; font-size: .92rem; }
    th, td { padding: 11px 13px; text-align: start; vertical-align: top; border-bottom: 1px solid var(--border); }
    th { color: var(--cyan); background: var(--surface-strong); font-weight: 800; }
    tr:nth-child(even) td { background: var(--table-stripe); }
    tr:last-child td { border-bottom: 0; }
    hr { height: 1px; margin: 34px 0; background: var(--border); border: 0; }

    .footer {
      width: min(860px, calc(100% - 32px));
      margin: -55px auto 45px;
      color: var(--muted);
      text-align: center;
      font-size: .85rem;
    }

    @media (max-width: 900px) {
      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .stats .stat:last-child { grid-column: 1 / -1; }
      .page { display: block; }
      .sidebar { position: relative; inset-block-start: auto; max-height: none; margin-bottom: 18px; }
      .toc { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 560px) {
      .hero { padding: 55px 16px 30px; }
      .page { width: min(100% - 20px, 1220px); margin-top: 18px; }
      .stats { grid-template-columns: 1fr 1fr; }
      .toc { grid-template-columns: 1fr; }
      .roadmap-section { padding: 18px; border-radius: 16px; }
      .hero-actions .action { flex: 1; }
    }

    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      *, *::before, *::after { transition: none !important; }
    }

    @media print {
      :root, html[data-theme="light"] {
        --bg: #fff; --surface: #fff; --surface-strong: #fff; --surface-soft: #f5f5f5;
        --text: #111; --muted: #444; --border: #ccc; --purple: #521d83; --cyan: #00636d;
        --shadow: none; --code-bg: #f5f5f5; --table-stripe: #fafafa;
      }
      body { background: #fff; }
      .scroll-progress, .sidebar, .hero-actions { display: none !important; }
      .hero { padding: 22px 0; }
      .hero-inner, .page, .footer { width: 100%; }
      .stats { grid-template-columns: repeat(5, 1fr); }
      .page { display: block; margin: 20px 0; }
      .roadmap-section { break-inside: avoid-page; box-shadow: none; }
      a { color: #111; text-decoration: none; }
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#roadmap">تجاوز إلى الخطة</a>
  <div class="scroll-progress" aria-hidden="true"><span id="scroll-bar"></span></div>

  <header class="hero">
    <div class="hero-inner">
      <span class="eyebrow">خارطة المنتج والنمو · 2026–2027</span>
      <h1>The Code Fix<br><span>الخطة الكبرى الموحّدة</span></h1>
      <p>من القياس وتثبيت الأساس، إلى SEO والتطبيق العملي والعودة، ثم الدخل والتوسع الذكي.</p>
      <div class="hero-actions">
        <a class="action primary" href="#roadmap-section-4">ابدأ من مراحل التنفيذ</a>
        <button class="action" id="theme-toggle" type="button" aria-label="تبديل المظهر">تبديل المظهر</button>
        <button class="action" type="button" onclick="window.print()">طباعة / PDF</button>
      </div>
      <div class="stats" aria-label="أرقام المشروع الحالية">
        <div class="stat"><strong>51</strong><span>مسارًا تعليميًا</span></div>
        <div class="stat"><strong>1,164</strong><span>درسًا</span></div>
        <div class="stat"><strong>752</strong><span>مدخلًا مرجعيًا</span></div>
        <div class="stat"><strong>90</strong><span>مقالًا</span></div>
        <div class="stat"><strong>3,851</strong><span>صفحة في البناء</span></div>
      </div>
    </div>
  </header>

  <div class="page">
    <aside class="sidebar" aria-label="فهرس الخطة">
      <h2>فهرس الخطة</h2>
      <small>انتقل مباشرة إلى أي محور.</small>
      <nav class="toc" id="toc"></nav>
    </aside>

    <main class="roadmap-content" id="roadmap">
__ROADMAP_CONTENT__
    </main>
  </div>

  <footer class="footer">
    نسخة عرض مولّدة من <a href="ROADMAP.md">ROADMAP.md</a> بتاريخ __GENERATED_AT__. ملف Markdown هو المصدر المعتمد.
  </footer>

  <script>
    (() => {
      const root = document.documentElement;
      const themeButton = document.getElementById('theme-toggle');
      const savedTheme = localStorage.getItem('tcf-roadmap-theme');
      if (savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme;

      const updateThemeLabel = () => {
        themeButton.textContent = root.dataset.theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن';
      };
      updateThemeLabel();
      themeButton.addEventListener('click', () => {
        root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('tcf-roadmap-theme', root.dataset.theme);
        updateThemeLabel();
      });

      const main = document.getElementById('roadmap');
      const sourceTitle = main.querySelector(':scope > h1');
      if (sourceTitle) sourceTitle.remove();

      main.querySelectorAll('table').forEach((table) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-wrap';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      });

      const originalNodes = [...main.children];
      const fragment = document.createDocumentFragment();
      let currentSection = null;
      let sectionNumber = 0;

      originalNodes.forEach((node) => {
        if (node.tagName === 'H2') {
          sectionNumber += 1;
          currentSection = document.createElement('section');
          currentSection.className = 'roadmap-section';
          currentSection.id = `roadmap-section-${sectionNumber}`;
          fragment.appendChild(currentSection);
        }
        (currentSection || fragment).appendChild(node);
      });
      main.replaceChildren(fragment);

      const toc = document.getElementById('toc');
      const sections = [...main.querySelectorAll('.roadmap-section')];
      sections.forEach((section) => {
        const heading = section.querySelector(':scope > h2');
        if (!heading) return;
        const link = document.createElement('a');
        link.href = `#${section.id}`;
        link.textContent = heading.textContent;
        link.dataset.target = section.id;
        toc.appendChild(link);
      });

      const links = [...toc.querySelectorAll('a')];
      const observer = new IntersectionObserver((entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        links.forEach((link) => link.classList.toggle('active', link.dataset.target === visible.target.id));
      }, { rootMargin: '-15% 0px -70%', threshold: [0, .1, .3] });
      sections.forEach((section) => observer.observe(section));

      const scrollBar = document.getElementById('scroll-bar');
      const updateProgress = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const percent = max > 0 ? (window.scrollY / max) * 100 : 0;
        scrollBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
      };
      document.addEventListener('scroll', updateProgress, { passive: true });
      updateProgress();
    })();
  </script>
</body>
</html>
'@

$document = $template.Replace("__ROADMAP_CONTENT__", $roadmapHtml)
$document = $document.Replace("__GENERATED_AT__", $generatedAt)
Set-Content -LiteralPath $outputPath -Value $document -Encoding utf8NoBOM

Write-Output "Generated $outputPath from $sourcePath"
