/* SmartDrop service worker (#528): offline support and static-asset caching.
 *
 * - Navigations: network-first; on failure serve the last cached copy of the
 *   page, else the precached offline page.
 * - Same-origin static assets (/_next/static, images, icons, fonts):
 *   stale-while-revalidate.
 * - Never cached: /api/*, non-GET requests, and every cross-origin request
 *   (Horizon, Soroban RPC, backend). Balances, positions and transactions must
 *   always be live.
 *
 * Bump CACHE_VERSION to invalidate old caches on deploy.
 */
const CACHE_VERSION = "v1";
const PAGE_CACHE = `smartdrop-pages-${CACHE_VERSION}`;
const ASSET_CACHE = `smartdrop-assets-${CACHE_VERSION}`;
const MAX_PAGE_ENTRIES = 30;

// The SW is served from `<basePath>/sw.js`, so its scope already includes
// any basePath (GitHub Pages export).
const SCOPE_PATH = new URL(self.registration.scope).pathname;
const OFFLINE_URL = `${SCOPE_PATH}offline.html`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("smartdrop-") && key !== PAGE_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.includes("/_next/static/") ||
    /\.(?:js|css|woff2?|png|jpe?g|svg|gif|webp|ico)$/i.test(url.pathname)
  );
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  // Never evict the offline fallback.
  const evictable = keys.filter((req) => new URL(req.url).pathname !== OFFLINE_URL);
  for (let i = 0; i < evictable.length - maxEntries; i++) {
    await cache.delete(evictable[i]);
  }
}

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const copy = response.clone();
      caches
        .open(PAGE_CACHE)
        .then((cache) => cache.put(request, copy))
        .then(() => trimCache(PAGE_CACHE, MAX_PAGE_ENTRIES))
        .catch(() => {});
    }
    return response;
  } catch {
    const cache = await caches.open(PAGE_CACHE);
    return (
      (await cache.match(request, { ignoreSearch: true })) ||
      (await cache.match(OFFLINE_URL)) ||
      new Response("You are offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

async function handleAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok && response.type === "basic") {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith(`${SCOPE_PATH}api/`)) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }
  if (isStaticAsset(url)) {
    event.respondWith(handleAsset(request));
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
