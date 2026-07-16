"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type AdminPaletteItem = {
  t: string; // title
  s: string; // section label
  u: string; // url
};

// ⌘K / Ctrl+K command palette scoped to the admin panel: jump to any section,
// content/quiz editor, or public view. Full keyboard navigation.
export default function AdminCommandPaletteClient({
  items,
}: {
  items: AdminPaletteItem[];
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("tcf:open-admin-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("tcf:open-admin-search", onOpen);
    };
  }, []);

  // When the palette opens, clear the previous query and focus the input.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting fields as the dialog opens
      setQ("");
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items.slice(0, 10);
    return items
      .filter(
        (it) =>
          it.t.toLowerCase().includes(needle) ||
          it.s.toLowerCase().includes(needle)
      )
      .slice(0, 40);
  }, [q, items]);

  if (!open) return null;

  function go(url: string) {
    setOpen(false);
    router.push(url);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(results.length - 1, s + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(0, s - 1));
    } else if (e.key === "Enter" && results[sel]) {
      e.preventDefault();
      go(results[sel].u);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <span className="text-muted">⚡</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={onInputKey}
            placeholder="انتقل لقسم أو محرّر... (لوحة الإدارة)"
            className="flex-1 bg-transparent py-4 text-base outline-none"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-xs text-muted">
            Esc
          </kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-muted">لا توجد نتائج</li>
          )}
          {results.map((it, i) => (
            <li key={it.u + it.t}>
              <button
                type="button"
                onMouseEnter={() => setSel(i)}
                onClick={() => go(it.u)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-right transition ${
                  i === sel ? "bg-brand-purple/15" : "hover:bg-surface"
                }`}
              >
                <span className="truncate font-medium">{it.t}</span>
                <span className="shrink-0 text-xs text-muted">{it.s}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
