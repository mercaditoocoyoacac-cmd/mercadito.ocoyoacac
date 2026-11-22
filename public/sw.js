const VERSION = "v2";
const STATIC_CACHE = `mercadito-static-${VERSION}`;
const DYNAMIC_CACHE = `mercadito-dynamic-${VERSION}`;
const IMAGE_CACHE = `mercadito-images-${VERSION}`;
const CACHE_NAMES = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE];
const LIMITS = { [STATIC_CACHE]: 200, [DYNAMIC_CACHE]: 150, [IMAGE_CACHE]: 300 };

const PRECACHE_URLS = [
  "/",
  "/tiendas",
  "/login",
  "/registro",
  "/promociones",
  "/offline.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon-32x32.png",
  "/logo.svg"
];

const IMAGE_HOSTS = new Set(["res.cloudinary.com"]);
const STATIC_PREFIXES = ["/_next/static/", "/icons/", "/images/", "/fonts/", "/favicon", "/icon-", "/logo.", "/apple-touch-icon"];
const NO_CACHE_PREFIXES = ["/api/auth/", "/api/webhooks/", "/api/upload"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await precacheStatic();
      await self.skipWaiting();
    })()
  );
});

async function precacheStatic() {
  const cache = await caches.open(STATIC_CACHE);
  await Promise.allSettled(
    PRECACHE_URLS.map(async (url) => {
      const response = await fetch(url, { cache: "reload" });
      if (!response.ok) return;
      await cache.put(url, response.clone());
      const html = await response.text();
      const assets = [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((match) => match[1]);
      await Promise.allSettled(
        assets.map(async (asset) => {
          const assetResponse = await fetch(asset, { cache: "reload" });
          if (assetResponse.ok) await cache.put(asset, assetResponse);
        })
      );
    })
  );
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("mercadito-") && !CACHE_NAMES.includes(key))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      (async () => {
        await Promise.all(CACHE_NAMES.map((name) => caches.delete(name)));
      })()
    );
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  const isCloudinaryImage =
    url.origin !== self.location.origin &&
    IMAGE_HOSTS.has(url.hostname) &&
    request.destination === "image";

  if (url.origin !== self.location.origin && !isCloudinaryImage) return;
  if (NO_CACHE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;

  if (request.mode === "navigate") {
    event.respondWith(pageStrategy(request, event));
    return;
  }

  if (isCloudinaryImage) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, event, true));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE, event));
    return;
  }

  if (request.destination === "image") {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, event, false));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE, event, false));
    return;
  }

  event.respondWith(networkFirst(request, DYNAMIC_CACHE, event));
});

function isStaticAsset(pathname) {
  return STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function cacheFirst(request, cacheName, event, allowOpaque) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && (response.ok || (allowOpaque && response.type === "opaque"))) {
      event.waitUntil(cache.put(request, response.clone()));
      event.waitUntil(trimCache(cacheName));
    }
    return response;
  } catch {
    if (request.destination === "image") return Response.error();
    return offlineFallback();
  }
}

async function networkFirst(request, cacheName, event) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response && response.ok && !hasSetCookie(response)) {
      event.waitUntil(cache.put(request, response.clone()));
      event.waitUntil(trimCache(cacheName));
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") return offlineFallback();
    return new Response(JSON.stringify({ ok: false, error: "Sin conexión" }), {
      status: 503,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}

async function pageStrategy(request, event) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response && response.ok && !hasSetCookie(response)) {
        event.waitUntil(cache.put(request, response.clone()));
        event.waitUntil(trimCache(DYNAMIC_CACHE));
      }
      return response;
    })
    .catch(() => cached || offlineFallback());

  event.waitUntil(network);
  return cached || network;
}

function hasSetCookie(response) {
  try {
    return response.headers.has("set-cookie");
  } catch {
    return false;
  }
}

async function trimCache(cacheName) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const limit = LIMITS[cacheName] || 100;
  if (keys.length <= limit) return;
  await Promise.all(keys.slice(0, keys.length - limit).map((key) => cache.delete(key)));
}

async function offlineFallback() {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match("/offline.html");
  if (cached) return cached;
  return new Response("<!doctype html><html lang=\"es\"><meta charset=\"utf-8\"><title>Sin conexión</title><h1>Sin conexión</h1><p>Revisa tu conexión e intenta de nuevo.</p></html>", {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  const title = payload.title || "Mercadito Ocoyoacac";
  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: payload.data || {},
    requireInteraction: false
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = event.notification.data && event.notification.data.url;
  const target = typeof raw === "string" && raw.startsWith("/") ? raw : "/mis-pedidos";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (new URL(client.url).pathname === target && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
