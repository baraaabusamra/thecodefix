"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";

type LogLevel = "log" | "error" | "warn";
type LogLine = { level: LogLevel; text: string };
type Mode = "js" | "html" | "python";

// Minimal Pyodide surface we use (Python-in-the-browser via WebAssembly).
type Pyodide = {
  setStdout: (o: { batched: (s: string) => void }) => void;
  setStderr: (o: { batched: (s: string) => void }) => void;
  runPythonAsync: (code: string) => Promise<unknown>;
};
type PyWindow = Window & { loadPyodide?: () => Promise<Pyodide> };
const PYODIDE_SRC = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js";

// Sandboxed JS runner: code executes inside an iframe with no DOM access to the
// parent, console output is streamed back via postMessage.
const RUNNER_SRCDOC = `<!doctype html><html><head><meta charset="utf-8"></head><body><script>
function fmt(v){
  if (typeof v === 'string') return v;
  if (v instanceof Error) return v.name + ': ' + v.message;
  try { return JSON.stringify(v, function(k,val){ return typeof val==='function'? '[function]' : val; }, 2); }
  catch(e){ return String(v); }
}
function send(level, args){
  parent.postMessage({ __tcf:true, type:'log', level:level, text: Array.prototype.map.call(args, fmt).join(' ') }, '*');
}
console.log = function(){ send('log', arguments); };
console.info = function(){ send('log', arguments); };
console.warn = function(){ send('warn', arguments); };
console.error = function(){ send('error', arguments); };
window.onerror = function(msg){ send('error', [msg]); };
window.addEventListener('message', function(e){
  if (!e.data || e.data.__tcf !== true || e.data.type !== 'run') return;
  try { (0, eval)(e.data.code); }
  catch(err){ send('error', [err]); }
  parent.postMessage({ __tcf:true, type:'done' }, '*');
});
parent.postMessage({ __tcf:true, type:'ready' }, '*');
<\/script></body></html>`;

// Wrap the user's HTML/CSS so Arabic + RTL render naturally in the preview.
function htmlDocument(code: string) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<style>body{font-family:system-ui,"Segoe UI",sans-serif;margin:16px;color:#14121a;background:#fff}</style>
</head><body>${code}</body></html>`;
}

export default function Playground({
  initialCode = "",
  mode = "js",
  language,
  height = 320,
  showShare = false,
}: {
  initialCode?: string;
  mode?: Mode;
  language?: string;
  height?: number;
  showShare?: boolean;
}) {
  const editorLanguage =
    language ??
    (mode === "html" ? "html" : mode === "python" ? "python" : "javascript");

  const [code, setCode] = useState(initialCode);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [preview, setPreview] = useState(initialCode); // html mode
  const [running, setRunning] = useState(false);
  const [pyLoading, setPyLoading] = useState(false); // python: loading Pyodide
  const [copied, setCopied] = useState(false);
  const runnerRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const pyodideRef = useRef<Pyodide | null>(null);

  // Listen for console output from the JS runner.
  useEffect(() => {
    if (mode !== "js") return;
    function onMessage(e: MessageEvent) {
      const d = e.data;
      if (!d || d.__tcf !== true) return;
      if (d.type === "ready") readyRef.current = true;
      else if (d.type === "log")
        setLogs((prev) => [...prev, { level: d.level, text: d.text }]);
      else if (d.type === "done") setRunning(false);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [mode]);

  // HTML mode: live preview, debounced as the user types.
  useEffect(() => {
    if (mode !== "html") return;
    const t = setTimeout(() => setPreview(code), 400);
    return () => clearTimeout(t);
  }, [code, mode]);

  // Python mode: lazy-load Pyodide (Python compiled to WASM) once, then run.
  const runPython = useCallback(async () => {
    setLogs([]);
    setRunning(true);
    try {
      if (!pyodideRef.current) {
        setPyLoading(true);
        const w = window as unknown as PyWindow;
        if (!w.loadPyodide) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = PYODIDE_SRC;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("تعذّر تحميل بايثون"));
            document.head.appendChild(s);
          });
        }
        pyodideRef.current = await (window as unknown as PyWindow).loadPyodide!();
        setPyLoading(false);
      }
      const py = pyodideRef.current;
      py.setStdout({
        batched: (s) => setLogs((p) => [...p, { level: "log", text: s }]),
      });
      py.setStderr({
        batched: (s) => setLogs((p) => [...p, { level: "error", text: s }]),
      });
      await py.runPythonAsync(code);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLogs((p) => [...p, { level: "error", text: msg }]);
    } finally {
      setPyLoading(false);
      setRunning(false);
    }
  }, [code]);

  const run = useCallback(() => {
    if (mode === "html") {
      setPreview(code);
      return;
    }
    if (mode === "python") {
      runPython();
      return;
    }
    setLogs([]);
    setRunning(true);
    const post = () =>
      runnerRef.current?.contentWindow?.postMessage(
        { __tcf: true, type: "run", code },
        "*"
      );
    if (readyRef.current) post();
    else setTimeout(post, 300); // iframe still booting
    setTimeout(() => setRunning(false), 4000); // safety
  }, [code, mode, runPython]);

  const share = useCallback(() => {
    const encoded = btoa(encodeURIComponent(code));
    const url = `${window.location.origin}/playground?code=${encoded}&mode=${mode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code, mode]);

  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <span className="text-sm font-semibold text-muted">
          {mode === "html"
            ? "🎨 محرّر HTML/CSS"
            : mode === "python"
              ? "🐍 محرّر بايثون"
              : "⚡ محرّر تفاعلي"}
        </span>
        <div className="flex items-center gap-2">
          {showShare && (
            <button
              onClick={share}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:text-foreground"
            >
              {copied ? "✓ تم النسخ" : "🔗 مشاركة"}
            </button>
          )}
          <button
            onClick={() => {
              setCode(initialCode);
              setLogs([]);
              setPreview(initialCode);
            }}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground"
          >
            ↺ إعادة
          </button>
          <button
            onClick={run}
            disabled={running}
            className="btn-neon px-4 py-1.5 text-sm disabled:opacity-60"
          >
            {pyLoading
              ? "...جارٍ تحميل بايثون"
              : running
                ? "...يعمل"
                : mode === "html"
                  ? "🔄 تحديث"
                  : "▶ تشغيل"}
          </button>
        </div>
      </div>

      <div dir="ltr">
        <Editor
          height={height}
          language={editorLanguage}
          theme="vs-dark"
          value={code}
          onChange={(v) => setCode(v ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
            fontFamily: "var(--font-mono-code), monospace",
          }}
          loading={<div className="p-4 text-sm text-muted">...جارٍ تحميل المحرّر</div>}
        />
      </div>

      {mode === "html" ? (
        <div className="border-t border-border">
          <div className="bg-surface px-4 py-1.5 text-xs text-muted">
            النتيجة المباشرة:
          </div>
          <iframe
            title="html-preview"
            sandbox="allow-scripts"
            srcDoc={htmlDocument(preview)}
            className="block w-full bg-white"
            style={{ height: 220 }}
          />
        </div>
      ) : (
        <>
          <div
            dir="ltr"
            className="min-h-16 max-h-56 overflow-auto border-t border-border bg-[#0d0b14] p-4 font-mono text-sm"
          >
            {logs.length === 0 ? (
              <span className="text-muted" dir="rtl">
                اضغط «تشغيل» لرؤية النتيجة هنا.
              </span>
            ) : (
              logs.map((l, i) => (
                <div
                  key={i}
                  className={
                    l.level === "error"
                      ? "text-red-400"
                      : l.level === "warn"
                        ? "text-yellow-400"
                        : "text-[#00f5ff]"
                  }
                >
                  {l.text}
                </div>
              ))
            )}
          </div>

          {mode === "js" && (
            <iframe
              ref={runnerRef}
              title="code-runner"
              sandbox="allow-scripts"
              srcDoc={RUNNER_SRCDOC}
              className="hidden"
            />
          )}
        </>
      )}
    </div>
  );
}
