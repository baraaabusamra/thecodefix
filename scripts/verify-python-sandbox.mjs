// Real-browser verification harness for the Python playground sandbox
// (src/lib/python-sandbox.ts). Not part of the default unit tests because it
// needs a Chromium browser (Edge/Chrome) and internet access (Pyodide is
// loaded from cdn.jsdelivr.net, exactly as in production).
//
//   node scripts/verify-python-sandbox.mjs            (auto-detects Edge/Chrome)
//   BROWSER=/path/to/chrome node scripts/verify-python-sandbox.mjs
//
// A local server plays the role of the authenticated Code Fix origin: the
// harness page gets an HttpOnly, SameSite=Lax session cookie, and /whoami
// (like our real endpoints) sends no CORS headers. Student-style Python then
// tries every network bridge Pyodide offers against that origin.
//
//   CONTROL  — the OLD design (`new Worker("/py-worker.js")` on the page).
//              Must be able to make a credentialed, readable request; if it
//              can't, the harness is broken and the run fails.
//   SANDBOX  — the NEW design (SandboxedPythonWorker). Must never deliver the
//              session cookie to the server and never read a response body.
//   FUNCTION — print / input() via stdin / tracebacks / terminate() of an
//              infinite loop still work through the sandbox.

import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { build } from "esbuild";

const ROOT = process.cwd();
const SECRET = "tcf-session-secret-" + Math.random().toString(36).slice(2);

function findBrowser() {
  const candidates = [
    process.env.BROWSER,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p));
}

const bundle = await build({
  entryPoints: [path.join(ROOT, "modules", "learning", "src", "python-sandbox.ts")],
  bundle: true,
  format: "iife",
  globalName: "TCF",
  write: false,
});
const sandboxJs = bundle.outputFiles[0].text;
const workerJs = fs.readFileSync(path.join(ROOT, "apps", "web", "public", "py-worker.js"), "utf8");

// Every credential-bearing probe that reaches the server is recorded here.
const seen = [];

const PAGE = `<!doctype html><meta charset="utf-8"><body><script src="/sandbox.js"></script><script>
const ORIGIN = location.origin;
// Every probe URL carries &tag=<control|sandbox> so the server can attribute it.
const probe = (tag) => [
  "import js",
  "from pyodide.http import pyfetch",
  "O = " + JSON.stringify(ORIGIN),
  "T = " + JSON.stringify("&tag=" + tag),
  "print('origin=' + str(js.self.location.origin))",
  "try:",
  "    r = await pyfetch(O + '/whoami?via=pyfetch' + T, credentials='include')",
  "    print('READ pyfetch ' + await r.string())",
  "except Exception as e:",
  "    print('blocked pyfetch')",
  "try:",
  "    r = await js.fetch(O + '/whoami?via=fetch' + T)",
  "    print('READ fetch ' + await r.text())",
  "except Exception as e:",
  "    print('blocked fetch')",
  "try:",
  "    x = js.XMLHttpRequest.new()",
  "    x.open('GET', O + '/whoami?via=xhr' + T, False)",
  "    x.withCredentials = True",
  "    x.send()",
  "    print('READ xhr ' + str(x.responseText))",
  "except Exception as e:",
  "    print('blocked xhr')",
  "try:",
  "    js.self.importScripts(O + '/whoami.js?via=importScripts' + T)",
  "except Exception as e:",
  "    pass",
  "try:",
  "    es = js.EventSource.new(O + '/whoami?via=eventsource' + T, js.Object.fromEntries([['withCredentials', True]]))",
  "except Exception as e:",
  "    pass",
  "try:",
  "    ws = js.WebSocket.new(O.replace('http', 'ws') + '/ws?via=websocket' + T)",
  "except Exception as e:",
  "    pass",
  "import asyncio",
  "await asyncio.sleep(1.5)",
  "print('probe-done')",
].join("\\n");

function run(worker, code, stdin, { timeoutMs = 120000 } = {}) {
  return new Promise((resolve) => {
    const out = [];
    const t = setTimeout(() => resolve({ out, timedOut: true }), timeoutMs);
    worker.onmessage = (e) => {
      const d = e.data;
      if (d.type === "out") out.push(d.level + ":" + d.text);
      if (d.type === "done" || d.type === "fatal") { clearTimeout(t); resolve({ out, done: d.type }); }
    };
    worker.onerror = () => { clearTimeout(t); resolve({ out, error: true }); };
    worker.postMessage({ type: "run", code, stdin });
  });
}

(async () => {
  const report = {};
  try {
    // CONTROL: the old, vulnerable design.
    const control = new Worker("/py-worker.js");
    report.control = await run(control, probe("control"), []);
    control.terminate();

    // SANDBOX: the new design.
    const sandboxed = new TCF.SandboxedPythonWorker("/py-worker.js");
    report.sandbox = await run(sandboxed, probe("sandbox"), []);

    // FUNCTION: normal educational use through the same sandbox.
    report.print = await run(sandboxed, "x = 6\\nfor i in range(2):\\n    print(x * 7 + i)", []);
    report.stdin = await run(sandboxed, "n = input('n? ')\\nprint('got', n)", ["42"]);
    report.error = await run(sandboxed, "def f():\\n    return 1/0\\nf()", []);
    sandboxed.terminate();

    // Runaway loop: wait until Python is actually executing, then kill it the
    // way Playground's Stop/TLE does, and confirm nothing comes back.
    const loop = new TCF.SandboxedPythonWorker("/py-worker.js");
    const events = [];
    await new Promise((resolve) => {
      loop.onmessage = (e) => {
        events.push(e.data.type);
        if (e.data.type === "exec-start") setTimeout(resolve, 2000);
      };
      loop.postMessage({ type: "run", code: "while True:\\n    pass", stdin: [] });
      setTimeout(resolve, 120000);
    });
    const before = events.length;
    loop.terminate();
    await new Promise((r) => setTimeout(r, 3000));
    report.loop = {
      started: events.includes("exec-start"),
      finishedOnItsOwn: events.includes("done"),
      messagesAfterTerminate: events.length - before,
      framesLeft: document.querySelectorAll("iframe").length,
    };
  } catch (e) {
    report.harnessError = String(e && e.stack || e);
  }
  await fetch("/report", { method: "POST", body: JSON.stringify(report) });
})();
</script></body>`;

let resolveReport;
const reportPromise = new Promise((r) => (resolveReport = r));

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const hasCookie = (req.headers.cookie ?? "").includes(SECRET);
  if (url.pathname.startsWith("/whoami")) {
    seen.push({ via: url.searchParams.get("via"), tag: url.searchParams.get("tag"), origin: req.headers.origin ?? "(none)", hasCookie });
    // Like the real app: no Access-Control-Allow-Origin header.
    res.writeHead(200, { "content-type": url.pathname.endsWith(".js") ? "text/javascript" : "text/plain" });
    res.end(url.pathname.endsWith(".js") ? "/* noop */" : hasCookie ? "AUTHENTICATED" : "anonymous");
    return;
  }
  if (url.pathname === "/") {
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "set-cookie": `tcf_session=${SECRET}; Path=/; HttpOnly; SameSite=Lax`,
    });
    res.end(PAGE);
    return;
  }
  if (url.pathname === "/sandbox.js") {
    res.writeHead(200, { "content-type": "text/javascript" });
    res.end(sandboxJs);
    return;
  }
  if (url.pathname === "/py-worker.js") {
    res.writeHead(200, { "content-type": "text/javascript" });
    res.end(workerJs);
    return;
  }
  if (url.pathname === "/report" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      res.end("ok");
      resolveReport(JSON.parse(body));
    });
    return;
  }
  res.writeHead(404).end();
});
server.on("upgrade", (req, socket) => {
  const url = new URL(req.url, "http://x");
  seen.push({
    via: url.searchParams.get("via"),
    tag: url.searchParams.get("tag"),
    origin: req.headers.origin ?? "(none)",
    hasCookie: (req.headers.cookie ?? "").includes(SECRET),
  });
  socket.destroy();
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const browser = findBrowser();
if (!browser) {
  console.error("SKIP: no Chromium-based browser found (set BROWSER=...)");
  process.exit(2);
}
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "tcf-sandbox-"));
const child = spawn(
  browser,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${profile}`,
    `http://127.0.0.1:${port}/`,
  ],
  { stdio: "ignore" }
);

const timeout = setTimeout(() => {
  console.error("FAIL: harness timed out (is cdn.jsdelivr.net reachable?)");
  child.kill();
  process.exit(1);
}, 240000);

const report = await reportPromise;
clearTimeout(timeout);
child.kill();
server.close();

const failures = [];
const check = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) failures.push(msg);
};

if (report.harnessError) failures.push("harness error: " + report.harnessError);
const controlOut = (report.control?.out ?? []).join("\n");
const sandboxOut = (report.sandbox?.out ?? []).join("\n");

console.log("\n--- control (old same-origin worker) output ---\n" + controlOut);
console.log("\n--- sandbox output ---\n" + sandboxOut);
console.log("\n--- requests that reached the server ---");
for (const s of seen) console.log(JSON.stringify(s));
console.log("");

check(/READ (pyfetch|fetch|xhr) AUTHENTICATED/.test(controlOut),
  "control: the old design CAN make a credentialed, readable request (harness is meaningful)");
check(/probe-done/.test(sandboxOut), "sandbox: the probe ran to completion");
check(/origin=null/.test(sandboxOut), "sandbox: student code runs in an opaque (null) origin");
check(!/READ /.test(sandboxOut), "sandbox: no response body from the site origin was readable");
check(!/AUTHENTICATED/.test(sandboxOut), "sandbox: never observed an authenticated response");
const sandboxSeen = seen.filter((x) => x.tag === "sandbox");
const channels = ["pyfetch", "fetch", "xhr", "importScripts", "eventsource", "websocket"];
check(channels.every((c) => seen.some((x) => x.tag === "control" && x.via === c && x.hasCookie)),
  "control: every channel carried the cookie under the old design");
check(channels.every((c) => sandboxSeen.some((x) => x.via === c)),
  "sandbox: every channel's request was actually attempted");
check(sandboxSeen.every((x) => !x.hasCookie),
  "sandbox: no request from student code carried the session cookie (pyfetch/fetch/XHR/importScripts/EventSource/WebSocket)");
const printOut = (report.print?.out ?? []).join("\n");
check(printOut.includes("log:42") && printOut.includes("log:43"), "function: print + loops");
check((report.stdin?.out ?? []).join("\n").includes("got 42"), "function: input() fed from stdin");
check(/ZeroDivisionError/.test((report.error?.out ?? []).join("\n")), "function: Python errors are reported");
check(report.loop?.started === true && report.loop?.finishedOnItsOwn === false,
  "function: an infinite loop really ran inside the sandbox");
check(report.loop?.messagesAfterTerminate === 0 && report.loop?.framesLeft === 0,
  "function: terminate() tears the runaway loop down (no frame left, no further output)");

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll Python sandbox checks passed.");
