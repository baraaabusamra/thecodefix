// scripts/ci/google-fonts-mock.cjs
// 📍 خريطة: منطقة "مختبر الجودة" ← بناء بدون إنترنت
// Lets `next build` run where fonts.googleapis.com is unreachable (sandboxes,
// air-gapped CI). Next's font loader reads NEXT_FONT_GOOGLE_MOCKED_RESPONSES
// and asks this module for the CSS of each requested URL; font files are then
// stubbed by Next itself. The built pages are for VERIFICATION ONLY — never
// deploy a build made with this mock (fonts would be placeholders).
//
//   NEXT_FONT_GOOGLE_MOCKED_RESPONSES=$PWD/scripts/ci/google-fonts-mock.cjs npm run build

const SUBSETS = ["arabic", "latin", "latin-ext", "cyrillic", "vietnamese"];

function css(url) {
  const q = new URL(url).searchParams;
  const families = q.getAll("family").map((f) => f.split(":")[0].replace(/\+/g, " "));
  return families
    .flatMap((family) =>
      SUBSETS.map(
        (s) => `/* ${s} */
@font-face {
  font-family: '${family}';
  font-style: normal;
  font-weight: 100 1000;
  font-display: swap;
  src: url(https://fonts.gstatic.com/mock/${encodeURIComponent(family)}-${s}.woff2) format('woff2');
}`
      )
    )
    .join("\n");
}

module.exports = new Proxy({}, { get: (_t, url) => (typeof url === "string" && url.startsWith("http") ? css(url) : undefined) });
