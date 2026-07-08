"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// Monaco is ~600KB of JS a reader may never use. Split it into its own chunk
// (dynamic) AND only mount it when the playground box approaches the viewport
// (IntersectionObserver below) — lesson pages ship zero editor JS up front.
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="p-4 text-sm text-muted">...جارٍ تحميل المحرّر</div>
  ),
});

type LogLevel = "log" | "error" | "warn" | "hint";
type LogLine = { level: LogLevel; text: string };
type Mode = "js" | "html" | "python";
type PyStatus = "idle" | "loading" | "running";

// Main-thread output guard (the Python worker enforces its own cap too; this
// one also protects the JS-iframe path from console.log floods).
const MAX_LOG_LINES = 1000;
// Kill Python runs that exceed this wall-clock budget (TLE) — the timer starts
// when execution starts, not while Pyodide/packages are still downloading.
const TLE_MS = 25_000;

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
  const [pyStatus, setPyStatus] = useState<PyStatus>("idle");
  const [copied, setCopied] = useState(false);
  const [stdin, setStdin] = useState("");
  const [runnerKey, setRunnerKey] = useState(0); // bump to hard-reset the JS iframe
  const runnerRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const [nearView, setNearView] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const tleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jsSafetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Append a log line, enforcing the main-thread cap (atomic in the updater).
  const appendLog = useCallback((line: LogLine) => {
    setLogs((prev) => {
      if (prev.length >= MAX_LOG_LINES) {
        if (prev[prev.length - 1]?.level === "hint") return prev; // already truncated
        return [
          ...prev,
          {
            level: "hint",
            text: `⚠️ تم اقتطاع الإخراج — تجاوز ${MAX_LOG_LINES} سطر.`,
          },
        ];
      }
      return [...prev, line];
    });
  }, []);

  const clearTleTimer = useCallback(() => {
    if (tleTimerRef.current) {
      clearTimeout(tleTimerRef.current);
      tleTimerRef.current = null;
    }
  }, []);

  // Kill the Python worker (Stop / TLE / crash). A fresh worker — and a fresh
  // Pyodide — is created lazily on the next run, so a crashed or runaway run
  // can never poison the page: the main thread was never blocked.
  const killWorker = useCallback(
    (reason: "stopped" | "tle" | "crashed") => {
      workerRef.current?.terminate();
      workerRef.current = null;
      clearTleTimer();
      setPyStatus("idle");
      setRunning(false);
      const text =
        reason === "tle"
          ? `⏱ تجاوز الكود المهلة الزمنية (${TLE_MS / 1000} ثانية) فتم إيقافه — تحقّق من الحلقات اللانهائية. سيُعاد تجهيز بايثون عند التشغيل التالي.`
          : reason === "crashed"
            ? "💥 انهار مشغّل بايثون (غالبًا بسبب استهلاك ذاكرة ضخم). أُعيد ضبط البيئة — عدّل الكود وحاول مجددًا."
            : "⏹ تم إيقاف التشغيل.";
      appendLog({ level: reason === "stopped" ? "hint" : "error", text });
    },
    [appendLog, clearTleTimer]
  );

  // Lazily create the Python worker and wire its message protocol.
  const getWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    const w = new Worker("/py-worker.js");
    w.onmessage = (e: MessageEvent) => {
      const d = e.data;
      if (!d) return;
      if (d.type === "status") {
        setPyStatus(d.status === "loading" ? "loading" : "idle");
      } else if (d.type === "exec-start") {
        setPyStatus("running");
        clearTleTimer();
        tleTimerRef.current = setTimeout(() => killWorker("tle"), TLE_MS);
      } else if (d.type === "out") {
        appendLog({ level: d.level as LogLevel, text: d.text });
      } else if (d.type === "done") {
        clearTleTimer();
        setPyStatus("idle");
        setRunning(false);
      } else if (d.type === "fatal") {
        appendLog({ level: "error", text: d.text });
        killWorker("crashed");
      }
    };
    // A worker-level error usually means the WASM runtime died (OOM etc.).
    w.onerror = () => killWorker("crashed");
    workerRef.current = w;
    return w;
  }, [appendLog, clearTleTimer, killWorker]);

  // Load Monaco only when the playground is within ~600px of the viewport —
  // readers who never scroll to (or interact with) the editor never pay for it.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setNearView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNearView(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Terminate the worker + timers when the component unmounts.
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      if (tleTimerRef.current) clearTimeout(tleTimerRef.current);
      if (jsSafetyRef.current) clearTimeout(jsSafetyRef.current);
    };
  }, []);

  // Listen for console output from the JS runner iframe.
  useEffect(() => {
    if (mode !== "js") return;
    function onMessage(e: MessageEvent) {
      const d = e.data;
      if (!d || d.__tcf !== true) return;
      if (d.type === "ready") readyRef.current = true;
      else if (d.type === "log")
        appendLog({ level: d.level as LogLevel, text: d.text });
      else if (d.type === "done") setRunning(false);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [mode, appendLog]);

  // HTML mode: live preview, debounced as the user types.
  useEffect(() => {
    if (mode !== "html") return;
    const t = setTimeout(() => setPreview(code), 400);
    return () => clearTimeout(t);
  }, [code, mode]);

  // Python: hand the code to the worker (never blocks this thread).
  const runPython = useCallback(() => {
    setLogs([]); // fresh console every run
    setRunning(true);
    const stdinLines = stdin.length
      ? stdin.replace(/\r/g, "").split("\n")
      : [];
    // Drop a single trailing empty line (textarea artifact), keep intentional ones.
    if (stdinLines.length && stdinLines[stdinLines.length - 1] === "")
      stdinLines.pop();
    getWorker().postMessage({ type: "run", code, stdin: stdinLines });
  }, [code, stdin, getWorker]);

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
    if (jsSafetyRef.current) clearTimeout(jsSafetyRef.current);
    jsSafetyRef.current = setTimeout(() => setRunning(false), 6000); // safety
  }, [code, mode, runPython]);

  const stop = useCallback(() => {
    if (mode === "python") {
      killWorker("stopped");
      return;
    }
    // JS: recreate the sandbox iframe — the only way to kill a stuck loop.
    readyRef.current = false;
    setRunnerKey((k) => k + 1);
    setRunning(false);
    appendLog({ level: "hint", text: "⏹ تم إيقاف التشغيل وإعادة ضبط البيئة." });
  }, [mode, killWorker, appendLog]);

  const share = useCallback(() => {
    const encoded = btoa(encodeURIComponent(code));
    const url = `${window.location.origin}/playground?code=${encoded}&mode=${mode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code, mode]);

  const busy = running || pyStatus !== "idle";
  const statusLabel =
    pyStatus === "loading"
      ? "جارٍ تجهيز بايثون…"
      : busy
        ? "يعمل…"
        : null;

  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-border bg-surface">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-muted">
          {mode === "html"
            ? "🎨 محرّر HTML/CSS"
            : mode === "python"
              ? "🐍 محرّر بايثون"
              : "⚡ محرّر تفاعلي"}
          {statusLabel && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-cyan/10 px-2.5 py-0.5 text-xs font-semibold text-brand-cyan">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-cyan" />
              {statusLabel}
            </span>
          )}
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
          {mode !== "html" && busy && (
            <button
              onClick={stop}
              className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/20"
            >
              ⏹ إيقاف
            </button>
          )}
          <button
            onClick={run}
            disabled={busy && mode !== "html"}
            className="btn-neon px-4 py-1.5 text-sm disabled:opacity-60"
          >
            {mode === "html" ? "🔄 تحديث" : busy ? "...يعمل" : "▶ تشغيل"}
          </button>
        </div>
      </div>

      {/* ── Editor ── */}
      <div dir="ltr" ref={boxRef}>
        {nearView ? (
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
            loading={
              <div className="p-4 text-sm text-muted">...جارٍ تحميل المحرّر</div>
            }
          />
        ) : (
          /* Same height as the editor so swapping it in causes no layout shift;
             shows the code read-only until Monaco arrives. */
          <pre
            style={{ height }}
            className="m-0 overflow-auto bg-[#1e1e1e] p-4 font-mono text-sm leading-relaxed text-[#d4d4d4]"
          >
            {code}
          </pre>
        )}
      </div>

      {/* ── stdin box (Python only) — feeds input() one line per value ── */}
      {mode === "python" && (
        <details className="border-t border-border bg-surface px-4 py-2 text-sm">
          <summary className="cursor-pointer select-none font-semibold text-muted hover:text-foreground">
            📥 المدخلات (input) — قيمة في كل سطر
          </summary>
          <textarea
            dir="ltr"
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            rows={3}
            placeholder={"مثال:\nأحمد\n17"}
            className="mt-2 w-full rounded-lg border border-border bg-[#0d0b14] p-3 font-mono text-sm text-foreground outline-none placeholder:text-muted/60 focus:border-brand-cyan/60"
          />
        </details>
      )}

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
          {/* ── Console ── */}
          <div className="flex items-center justify-between border-t border-border bg-surface px-4 py-1.5">
            <span className="text-xs font-semibold text-muted">
              وحدة التحكّم {logs.length > 0 && `(${logs.length})`}
            </span>
            {logs.length > 0 && (
              <button
                onClick={() => setLogs([])}
                className="text-xs text-muted transition hover:text-foreground"
              >
                🗑 مسح
              </button>
            )}
          </div>
          <div
            dir="ltr"
            className="min-h-16 max-h-72 overflow-auto bg-[#0d0b14] p-4 font-mono text-sm md:max-h-80"
          >
            {logs.length === 0 ? (
              <span className="text-muted" dir="rtl">
                اضغط «تشغيل» لرؤية النتيجة هنا.
              </span>
            ) : (
              logs.map((l, i) =>
                l.level === "error" ? (
                  <div
                    key={i}
                    className="my-1 whitespace-pre-wrap rounded-md border-l-2 border-red-500 bg-red-500/10 px-3 py-1.5 text-red-300"
                  >
                    {l.text}
                  </div>
                ) : l.level === "hint" ? (
                  <div
                    key={i}
                    dir="rtl"
                    className="my-1 whitespace-pre-wrap rounded-md border-r-2 border-brand-purple bg-brand-purple/10 px-3 py-1.5 text-purple-200"
                  >
                    {l.text}
                  </div>
                ) : (
                  <div
                    key={i}
                    className={
                      l.level === "warn"
                        ? "whitespace-pre-wrap text-yellow-400"
                        : "whitespace-pre-wrap text-[#00f5ff]"
                    }
                  >
                    {l.text}
                  </div>
                )
              )
            )}
          </div>

          {mode === "js" && (
            <iframe
              key={runnerKey}
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
