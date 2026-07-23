const CACHE = "tcf-v1";
const STATIC = [
  "/",
  "/learn",
  "/playground",
  "/leaderboard",
  "/offline",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // API calls — network first
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/progress-actions")) {
    e.respondWith(networkFirst(request));
    return;
  }

  // Lesson content — cache first
  if (url.pathname.startsWith("/learn/")) {
    e.respondWith(cacheFirst(request));
    return;
  }

  // Static assets — cache first
  if (request.destination === "style" || request.destination === "script" || request.destination === "font" || request.destination === "image") {
    e.respondWith(cacheFirst(request));
    return;
  }

  // Navigation — stale-while-revalidate
  if (request.mode === "navigate") {
    e.respondWith(networkFirst(request));
    return;
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    return caches.match("/offline");
  }
}

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match("/offline");
  }
}
