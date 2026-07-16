"use client";

import { useRef, useState } from "react";

// Custom MDX <pre> renderer: wraps highlighted code blocks with a
// copy-to-clipboard button. Code stays LTR; the button sits top-left.
export default function CodeBlock(
  props: React.HTMLAttributes<HTMLPreElement>
) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = ref.current?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <div className="group relative my-6">
      <button
        type="button"
        onClick={copy}
        dir="rtl"
        aria-label="نسخ الكود"
        className="absolute left-2 top-2 z-10 rounded-md border border-white/15 bg-black/40 px-2.5 py-1 text-xs font-semibold text-white/80 opacity-0 backdrop-blur transition hover:border-brand-cyan/60 hover:text-white focus:opacity-100 group-hover:opacity-100"
      >
        {copied ? "✓ نُسخ" : "نسخ"}
      </button>
      <pre ref={ref} {...props} />
    </div>
  );
}
