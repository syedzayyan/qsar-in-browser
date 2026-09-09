// Service worker for QITB. Three strategies:
//
// 1. Cache-first for genuinely immutable payloads - the RDKit WASM build and
//    the pyodide runtime (+ scikit-learn/xgboost/scipy wheels) it lazy-loads
//    from a version-pinned jsdelivr URL. These never change content at a
//    given URL (a pyodide version bump changes the URL itself), and they're
//    large (tens of MB combined), so serving them straight from cache after
//    the first load is the whole point.
// 2. Network-first for anything at a stable URL whose *content* can change
//    across deployments: page navigations (the HTML documents) AND this
//    app's own worker/python scripts under /workers/ and /python/, which
//    get edited in place same as any other app code. Treating those as
//    cache-forever (like an earlier version of this file did) meant a
//    browser that had ever cached them could get stuck running stale worker
//    code indefinitely even after everything else updated - falls back to
//    cache only when the network is actually unavailable.
// 3. Stale-while-revalidate for everything else same-origin (hashed JS/CSS
//    chunks - safe, since a given hashed filename's content never changes).
//    There's no build-time asset manifest to precache here (static export,
//    content-hashed filenames), so the cache is built up opportunistically
//    as pages are visited, enough to make previously-visited pages work
//    offline.

const CACHE_VERSION = "qitb-v3";
const HEAVY_CACHE = `${CACHE_VERSION}-heavy`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = ["/", "/manifest.json", "/rdkit/RDKit_minimal.js", "/rdkit/RDKit_minimal.wasm"];

function isImmutableAsset(url) {
  return url.hostname === "cdn.jsdelivr.net" || url.pathname.startsWith("/rdkit/");
}

function isAppScript(url) {
  return url.pathname.startsWith("/workers/") || url.pathname.startsWith("/python/");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(HEAVY_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch((err) => {
        // Don't fail install over one missing precache URL (e.g. dev server layout differs)
        console.warn("SW precache: some URLs failed to cache", err);
      })
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("qitb-") && key !== HEAVY_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (isImmutableAsset(url)) {
    // Cache-first: these URLs are stable and large - once cached, never refetch.
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok || response.type === "opaque") {
            const copy = response.clone();
            caches.open(HEAVY_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return; // don't touch other cross-origin requests

  if (request.mode === "navigate" || isAppScript(url)) {
    // Network-first: always try to get the current version when online, so
    // a rebuild/deploy is visible on the very next load/worker-spawn instead
    // of requiring a second one (SWR's usual "this one's stale, next one
    // catches up" gap) - or, for these specific stable-URL-but-editable
    // files, potentially never catching up at all.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || (request.mode === "navigate" ? caches.match("/") : undefined))
        )
    );
    return;
  }

  // Stale-while-revalidate for same-origin JS/CSS chunks etc.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
