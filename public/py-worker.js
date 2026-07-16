/* Python runner Web Worker (Pyodide).
 *
 * Runs user Python completely off the main thread so infinite loops / heavy
 * code can never freeze the page — the main thread stays responsive and can
 * kill this worker at any time (Stop button / timeout) via worker.terminate().
 *
 * Protocol (worker → main):
 *   { type: "status", status: "loading" | "ready" }
 *   { type: "exec-start" }                      // TLE timer starts here
 *   { type: "out", level: "log"|"error"|"hint", text }
 *   { type: "done", ms }
 *   { type: "fatal", text }                     // load/crash-level failure
 * Protocol (main → worker):
 *   { type: "run", code, stdin: string[] }
 */

/* global loadPyodide, importScripts */

var PYODIDE_BASE = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
var pyodide = null;

// ── Output flood protection ────────────────────────────────────────────
// Hard caps so printing 100k lines can't freeze the tab while rendering.
var MAX_LINES = 1000;
var MAX_CHARS = 500 * 1024; // 500 KB
var sentLines = 0;
var sentChars = 0;
var truncated = false;

function resetOutputBudget() {
  sentLines = 0;
  sentChars = 0;
  truncated = false;
}

function emit(level, text) {
  if (truncated) return;
  sentLines += 1;
  sentChars += text.length;
  if (sentLines > MAX_LINES || sentChars > MAX_CHARS) {
    truncated = true;
    self.postMessage({
      type: "out",
      level: "hint",
      text:
        "⚠️ تم اقتطاع الإخراج — تجاوز الحدّ المسموح (" +
        MAX_LINES +
        " سطر / 500KB). قلّل عدد أسطر الطباعة.",
    });
    return;
  }
  self.postMessage({ type: "out", level: level, text: text });
}

// ── Traceback cleanup ──────────────────────────────────────────────────
// Strip Pyodide-internal frames (…/lib/python3xx.zip/_pyodide/_base.py etc.)
// so the user only sees frames from their own code. Because we execute the
// user's source directly (setup code runs in SEPARATE runPython calls), the
// "<exec>" line numbers already match the editor 1:1 — no offset needed.
function cleanTraceback(msg) {
  var lines = String(msg).split("\n");
  var out = [];
  var skipBody = false;
  for (var i = 0; i < lines.length; i++) {
    var ln = lines[i];
    var isFrame = /^\s*File "/.test(ln);
    if (isFrame) {
      var internal =
        ln.indexOf("/lib/python") !== -1 ||
        ln.indexOf("_pyodide/") !== -1 ||
        ln.indexOf('File "<string>"') !== -1;
      skipBody = internal;
      if (internal) continue;
      // Localize the user-code frame marker.
      ln = ln.replace(
        /File "<exec>", line (\d+)(, in ([^\s]+))?/,
        function (_m, n, _g, fn) {
          return fn && fn !== "<module>"
            ? "السطر " + n + " — داخل " + fn
            : "السطر " + n + " في كودك";
        }
      );
      out.push(ln);
      continue;
    }
    // Lines directly under a skipped frame (source echo / ^^^ markers).
    if (skipBody && /^\s+/.test(ln)) continue;
    skipBody = false;
    out.push(ln);
  }
  return out
    .join("\n")
    .replace(/^Traceback \(most recent call last\):/, "تتبّع الخطأ (الأحدث أخيرًا):")
    .trim();
}

// ── Friendly hints for browser-environment limitations ────────────────
var NETWORK_MODULES = ["requests", "urllib3", "aiohttp", "httpx", "socket"];

function hintFor(errText) {
  var m = errText.match(/No module named '([^']+)'/);
  var mod = m ? m[1].split(".")[0] : null;

  if (mod && NETWORK_MODULES.indexOf(mod) !== -1) {
    return (
      "💡 مكتبات الشبكة التقليدية (مثل " +
      mod +
      ") لا تعمل داخل المتصفّح بسبب قيود CORS و sockets. البديل داخل هذا المحرّر:\n" +
      "from pyodide.http import pyfetch\n" +
      'res = await pyfetch("https://api.example.com")'
    );
  }
  if (
    (mod && (mod === "multiprocessing" || mod === "_multiprocessing")) ||
    errText.indexOf("can't start new thread") !== -1 ||
    errText.indexOf("Function not implemented") !== -1
  ) {
    return "💡 المتصفّح لا يدعم threading / multiprocessing في بيئة WebAssembly — اكتب الكود بدون خيوط أو عمليات متوازية.";
  }
  if (mod) {
    return (
      "💡 المكتبة «" +
      mod +
      "» غير متاحة في بيئة المتصفّح. الحزم العلمية الشهيرة (numpy, pandas, matplotlib…) تُحمَّل تلقائيًا عند استيرادها؛ غيرها يتطلّب أن يكون ضمن حزم Pyodide المدعومة."
    );
  }
  if (errText.indexOf("EOFError") !== -1 && errText.indexOf("المدخلات") !== -1) {
    return "💡 الكود يستدعي ()input — اكتب القيم المطلوبة (سطرًا لكل قيمة) في صندوق «المدخلات» ثم أعد التشغيل.";
  }
  return null;
}

// ── Per-run Python setup (executed SEPARATELY from user code so the user's
//    traceback line numbers stay exact). Provides:
//    1. input() that reads from the pre-supplied stdin lines (echoes like a
//       terminal, clear Arabic error when exhausted — never hangs).
//    2. A MEMFS wipe of the working dir so files from previous runs
//       (open("x.txt","w")…) don't leak between executions.
var SETUP_PY = [
  "import builtins, os, shutil, sys",
  "",
  "# -- wipe leftover files from previous runs (MEMFS reset) --",
  "os.chdir('/home/pyodide')",
  "for _e in os.listdir('.'):",
  "    try:",
  "        if os.path.isfile(_e) or os.path.islink(_e):",
  "            os.remove(_e)",
  "        elif os.path.isdir(_e):",
  "            shutil.rmtree(_e, ignore_errors=True)",
  "    except Exception:",
  "        pass",
  "",
  "# -- input() fed from the editor's stdin box --",
  "_tcf_lines = list(_tcf_stdin.to_py()) if hasattr(_tcf_stdin, 'to_py') else list(_tcf_stdin)",
  "def _tcf_input(prompt=''):",
  "    if prompt:",
  "        print(prompt, end='')",
  "    if _tcf_lines:",
  "        _v = str(_tcf_lines.pop(0))",
  "        print(_v)",
  "        return _v",
  "    raise EOFError('لا توجد مدخلات متبقية — أضِف القيم في صندوق «المدخلات» أسفل المحرّر قبل التشغيل.')",
  "builtins.input = _tcf_input",
].join("\n");

async function ensurePyodide() {
  if (pyodide) return pyodide;
  self.postMessage({ type: "status", status: "loading" });
  importScripts(PYODIDE_BASE + "pyodide.js");
  pyodide = await loadPyodide({ indexURL: PYODIDE_BASE });
  self.postMessage({ type: "status", status: "ready" });
  return pyodide;
}

self.onmessage = async function (e) {
  var msg = e.data;
  if (!msg || msg.type !== "run") return;

  try {
    var py = await ensurePyodide();
    resetOutputBudget();

    py.setStdout({ batched: function (s) { emit("log", s); } });
    py.setStderr({ batched: function (s) { emit("error", s); } });

    // stdin lines + per-run environment reset (separate call → no line offset).
    py.globals.set("_tcf_stdin", msg.stdin || []);
    py.runPython(SETUP_PY);

    // Auto-load supported packages (numpy, pandas, …) the code imports.
    try {
      await py.loadPackagesFromImports(msg.code);
    } catch (_err) {
      /* unknown imports fail naturally below with a hint */
    }

    self.postMessage({ type: "exec-start" });
    var t0 = Date.now();
    await py.runPythonAsync(msg.code);
    self.postMessage({ type: "done", ms: Date.now() - t0 });
  } catch (err) {
    var raw = err && err.message ? err.message : String(err);
    var text = raw.indexOf("Traceback") !== -1 ? cleanTraceback(raw) : raw;
    self.postMessage({ type: "out", level: "error", text: text });
    var hint = hintFor(raw);
    if (hint) self.postMessage({ type: "out", level: "hint", text: hint });
    self.postMessage({ type: "done", ms: 0 });
  }
};
