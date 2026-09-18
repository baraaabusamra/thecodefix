// Security boundary for database-backed (CMS) MDX.
//
// File-based lessons under src/content are reviewed through git and render
// unchanged. CMS lessons are written from the admin panel by roles as low as
// `writer`, so they are UNTRUSTED: next-mdx-remote's default `blockJS` strips
// JS expressions/imports/exports, but it still renders intrinsic JSX elements
// verbatim (<script>, <iframe srcDoc>, <form>, ...), which is stored XSS.
//
// This remark plugin walks the MDX AST (mdast + mdx-jsx nodes) and enforces a
// strict allowlist of elements, attributes and URL schemes. It is used twice:
//   - save time: validateUntrustedMdx() collects violations and the CMS
//     action refuses to persist the content;
//   - render time: <Mdx untrusted> strips anything not allowlisted, so rows
//     saved before this validator existed can't bypass it.

type MdxAttribute = {
  type: string; // "mdxJsxAttribute" | "mdxJsxExpressionAttribute"
  name?: string;
  value?: unknown;
};

type MdxNode = {
  type: string;
  name?: string | null;
  attributes?: MdxAttribute[];
  children?: MdxNode[];
  url?: string;
};

type AttrRule = "text" | "url" | "href" | "number" | readonly string[];

// Attributes allowed on every allowlisted intrinsic element.
const GLOBAL_ATTRS: Record<string, AttrRule> = {
  title: "text",
  dir: ["rtl", "ltr", "auto"],
  lang: "text",
};

const CELL_ATTRS: Record<string, AttrRule> = {
  colSpan: "number",
  rowSpan: "number",
};

// Elements a CMS lesson may use. Anything else (script, iframe, object,
// embed, form, input, button, meta, base, link, style, svg, unknown custom
// components, fragments, ...) is rejected at save time and removed at render.
const ALLOWED_ELEMENTS: Record<string, Record<string, AttrRule>> = {
  // The only custom component lessons actually use (see src/components/Mdx.tsx).
  Playground: {
    initialCode: "text",
    mode: ["js", "html", "python"],
    language: ["javascript", "typescript", "html", "css", "python", "json"],
    height: "number",
  },
  details: { open: "text" },
  summary: {},
  p: {},
  span: {},
  div: {},
  br: {},
  hr: {},
  strong: {},
  em: {},
  b: {},
  i: {},
  u: {},
  s: {},
  del: {},
  ins: {},
  small: {},
  mark: {},
  kbd: {},
  code: {},
  pre: {},
  sup: {},
  sub: {},
  abbr: {},
  blockquote: {},
  ul: {},
  ol: { start: "number" },
  li: {},
  table: {},
  caption: {},
  thead: {},
  tbody: {},
  tfoot: {},
  tr: {},
  th: CELL_ATTRS,
  td: CELL_ATTRS,
  h2: {},
  h3: {},
  h4: {},
  h5: {},
  h6: {},
  a: { href: "href" },
  img: { src: "url", alt: "text", width: "number", height: "number" },
};

// Node types that carry executable JS in MDX. next-mdx-remote's blockJS also
// removes these, but the boundary must not depend on a library default.
const JS_NODE_TYPES = new Set(["mdxjsEsm", "mdxFlowExpression", "mdxTextExpression"]);

/**
 * Whether a URL is safe to render from untrusted content: http(s) absolute
 * URLs, site-relative paths, and in-page anchors. `mailto:` only for links.
 * Rejects javascript:, data:, vbscript:, protocol-relative //host, and
 * backslash tricks (browsers normalize "/\host" to "//host").
 */
export function isSafeUntrustedUrl(raw: string, allowMailto = false): boolean {
  // Browsers ignore ASCII whitespace/control chars inside schemes
  // ("java\tscript:"), so strip them before inspecting.
  const v = Array.from(raw)
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code > 0x20 && !(code >= 0x7f && code <= 0x9f);
    })
    .join("");
  if (!v) return false;
  if (v.includes("\\")) return false;
  if (v.startsWith("#")) return true;
  if (v.startsWith("//")) return false;
  if (v.startsWith("/") || v.startsWith("./") || v.startsWith("../")) return true;
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(v)?.[1]?.toLowerCase();
  if (!scheme) return !v.includes(":"); // plain relative path like "img.png"
  if (scheme === "http" || scheme === "https") return true;
  return allowMailto && scheme === "mailto";
}

function attrAllowed(rule: AttrRule, value: string): boolean {
  if (Array.isArray(rule)) return rule.includes(value);
  switch (rule) {
    case "text":
      return true;
    case "number":
      return /^\d{1,5}$/.test(value);
    case "url":
      return isSafeUntrustedUrl(value, false);
    case "href":
      return isSafeUntrustedUrl(value, true);
    default:
      return false;
  }
}

function isJsxElement(node: MdxNode): boolean {
  return node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement";
}

type Report = (message: string) => void;

function sanitizeAttributes(node: MdxNode, rules: Record<string, AttrRule>, report: Report) {
  const tag = node.name ?? "";
  node.attributes = (node.attributes ?? []).filter((attr) => {
    if (attr.type !== "mdxJsxAttribute" || !attr.name) {
      report(`<${tag}>: لا يُسمح بخصائص JavaScript ({...})`);
      return false;
    }
    const name = attr.name;
    const rule = rules[name] ?? GLOBAL_ATTRS[name];
    if (!rule) {
      report(`<${tag}>: الخاصية "${name}" غير مسموحة`);
      return false;
    }
    // null = boolean attribute (<details open>); only fine for "text" rules.
    if (attr.value === null || attr.value === undefined) {
      if (rule === "text") return true;
      report(`<${tag}>: الخاصية "${name}" تحتاج قيمة`);
      return false;
    }
    if (typeof attr.value !== "string") {
      report(`<${tag}>: قيمة الخاصية "${name}" يجب أن تكون نصًا ثابتًا`);
      return false;
    }
    if (!attrAllowed(rule, attr.value)) {
      report(`<${tag}>: قيمة غير آمنة أو غير مسموحة للخاصية "${name}"`);
      return false;
    }
    return true;
  });
}

function sanitizeChildren(parent: MdxNode, report: Report) {
  if (!parent.children) return;
  const out: MdxNode[] = [];
  for (const child of parent.children) {
    if (JS_NODE_TYPES.has(child.type)) {
      report("لا يُسمح بتعابير JavaScript أو import/export");
      continue;
    }
    // Raw HTML nodes don't exist in MDX, but never pass one through.
    if (child.type === "html") {
      report("لا يُسمح بـ HTML خام");
      continue;
    }
    if (isJsxElement(child)) {
      const name = child.name ?? "";
      const rules = Object.hasOwn(ALLOWED_ELEMENTS, name) ? ALLOWED_ELEMENTS[name] : null;
      if (!rules) {
        report(name ? `العنصر <${name}> غير مسموح` : "لا يُسمح بـ Fragment (<>...</>)");
        continue; // drop the element and its whole subtree
      }
      sanitizeAttributes(child, rules, report);
      sanitizeChildren(child, report);
      out.push(child);
      continue;
    }
    if ((child.type === "link" || child.type === "definition") && child.url !== undefined) {
      if (!isSafeUntrustedUrl(child.url, true)) {
        report(`رابط غير آمن: ${child.url.slice(0, 80)}`);
        if (child.type === "link") {
          // Keep the visible text, drop the link.
          sanitizeChildren(child, report);
          out.push(...(child.children ?? []));
        }
        continue;
      }
    }
    if (child.type === "image" && child.url !== undefined && !isSafeUntrustedUrl(child.url)) {
      report(`رابط صورة غير آمن: ${child.url.slice(0, 80)}`);
      continue;
    }
    sanitizeChildren(child, report);
    out.push(child);
  }
  parent.children = out;
}

export type UntrustedMdxOptions = { onViolation?: Report };

/** Remark plugin: strips everything outside the untrusted-MDX allowlist. */
export function remarkUntrustedMdx(options: UntrustedMdxOptions = {}) {
  const report: Report = options.onViolation ?? (() => {});
  return (tree: unknown) => {
    sanitizeChildren(tree as MdxNode, report);
  };
}

/**
 * Save-time validator. Returns a (deduplicated, capped) list of human-readable
 * problems; an empty list means the source is safe to persist. MDX syntax
 * errors are reported too, since they would otherwise crash the live page.
 */
export async function validateUntrustedMdx(source: string): Promise<string[]> {
  const problems: string[] = [];
  // Loaded lazily: both are ESM-only, and this keeps the plugin half of the
  // module importable from CommonJS contexts (the node:test harness).
  const [{ serialize }, { default: remarkGfm }] = await Promise.all([
    import("next-mdx-remote/serialize"),
    import("remark-gfm"),
  ]);
  try {
    await serialize(source, {
      mdxOptions: {
        remarkPlugins: [
          remarkGfm,
          [remarkUntrustedMdx, { onViolation: (m: string) => problems.push(m) }],
        ],
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    problems.push(`خطأ في صياغة MDX: ${message.split("\n")[0].slice(0, 200)}`);
  }
  return [...new Set(problems)].slice(0, 20);
}
