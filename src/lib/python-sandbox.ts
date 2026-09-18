// Security boundary for the Python playground (client-only).
//
// Student Python runs in Pyodide, which exposes JS bridges (`from js import
// fetch`, `pyodide.http.pyfetch`, XMLHttpRequest, WebSocket, importScripts…).
// A Worker created directly from the page (`new Worker("/py-worker.js")`)
// shares The Code Fix origin, so those bridges could send CREDENTIALED
// same-origin requests (session cookie attached, response readable) — i.e.
// act as the signed-in learner or admin.
//
// Instead the worker is started INSIDE a `sandbox="allow-scripts"` iframe
// (no allow-same-origin → a unique opaque origin), from a Blob URL created
// there, so the worker inherits that opaque origin. From there:
//   - requests to thecodefix.net are cross-site: SameSite=Lax session
//     cookies are not attached, and CORS blocks reading any response;
//   - no access to the parent DOM, cookies, localStorage/IndexedDB of the
//     site, or its service worker scope;
//   - the iframe can't navigate the top page, open popups or submit forms.
// Network to third-party hosts remains possible, exactly like any website
// the learner could open — it simply carries no Code Fix credentials.
//
// SandboxedPythonWorker mimics the tiny Worker surface Playground uses
// (postMessage / onmessage / onerror / terminate), so the existing run,
// timeout (TLE), stop and output-cap logic is unchanged. terminate() removes
// the iframe, which destroys its document and therefore the worker.

// Runs inside the opaque-origin iframe. It only accepts messages from its
// parent window and only relays the worker protocol.
export const PY_SANDBOX_SRCDOC = `<!doctype html><html><head><meta charset="utf-8"></head><body><script>
(function () {
  var worker = null;
  function toParent(m) { parent.postMessage(m, "*"); }
  window.addEventListener("message", function (e) {
    if (e.source !== parent) return;
    var d = e.data;
    if (!d || d.__tcfpy !== true) return;
    if (d.kind === "init" && !worker && typeof d.source === "string") {
      try {
        var url = URL.createObjectURL(new Blob([d.source], { type: "text/javascript" }));
        worker = new Worker(url);
        worker.onmessage = function (m) { toParent({ __tcfpy: true, kind: "msg", data: m.data }); };
        worker.onerror = function () { toParent({ __tcfpy: true, kind: "error" }); };
      } catch (err) {
        toParent({ __tcfpy: true, kind: "error" });
      }
    } else if (d.kind === "post" && worker) {
      worker.postMessage(d.data);
    }
  });
  toParent({ __tcfpy: true, kind: "ready" });
})();
<\/script></body></html>`;

export class SandboxedPythonWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;

  private frame: HTMLIFrameElement | null;
  private ready = false;
  private pending: unknown[] = [];
  private readonly source: Promise<string>;
  private readonly listener: (e: MessageEvent) => void;

  constructor(workerUrl = "/py-worker.js") {
    // The worker source is fetched by the (trusted) page, same-origin, and
    // handed to the sandbox — the opaque-origin frame can't fetch it itself.
    this.source = fetch(workerUrl).then((res) => {
      if (!res.ok) throw new Error(`worker source ${res.status}`);
      return res.text();
    });
    // Don't surface an unhandled rejection before "ready" arrives.
    this.source.catch(() => {});

    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts");
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("tabindex", "-1");
    frame.title = "python-sandbox";
    frame.style.display = "none";
    frame.srcdoc = PY_SANDBOX_SRCDOC;
    this.frame = frame;

    this.listener = (e: MessageEvent) => {
      // Only this instance's sandbox may talk to it — never another frame,
      // another Playground, or a foreign window.
      if (!this.frame || e.source !== this.frame.contentWindow) return;
      const d = e.data as { __tcfpy?: boolean; kind?: string; data?: unknown } | null;
      if (!d || d.__tcfpy !== true) return;
      if (d.kind === "ready") {
        this.source.then(
          (source) => {
            if (!this.frame) return;
            this.send({ __tcfpy: true, kind: "init", source });
            this.ready = true;
            for (const data of this.pending) this.send({ __tcfpy: true, kind: "post", data });
            this.pending = [];
          },
          () => this.onerror?.()
        );
      } else if (d.kind === "msg") {
        this.onmessage?.(new MessageEvent("message", { data: d.data }));
      } else if (d.kind === "error") {
        this.onerror?.();
      }
    };
    window.addEventListener("message", this.listener);
    document.body.appendChild(frame);
  }

  private send(message: unknown) {
    // "*" is required: an opaque origin can't be named as a target origin.
    // The recipient is pinned by holding this exact frame's contentWindow.
    this.frame?.contentWindow?.postMessage(message, "*");
  }

  postMessage(data: unknown) {
    if (this.ready) this.send({ __tcfpy: true, kind: "post", data });
    else this.pending.push(data);
  }

  terminate() {
    window.removeEventListener("message", this.listener);
    this.frame?.remove();
    this.frame = null;
    this.ready = false;
    this.pending = [];
  }
}
