// Service Worker for Mercadito Ocoyoacac
// Provides offline support and caching strategies

const CACHE_NAME = 'mercadito-v1';
const STATIC_CACHE = 'mercadito-static-v1';
const DYNAMIC_CACHE = 'mercadito-dynamic-v1';
const IMAGE_CACHE = 'mercadito-images-v1';

const STATIC_ASSETS = [
  '/',
  '/tiendas',
  '/login',
  '/registro',
  '/carrito',
  '/mis-pedidos',
  '/promociones',
  '/perfil',
  '/manifest.json',
];

const CACHE_STRATEGIES = {
  // Cache first for static assets
  static: ['/icons/', '/images/', '/fonts/', '/_next/static/'],
  // Network first for API calls
  networkFirst: ['/api/'],
  // Stale while revalidate for pages
  staleWhileRevalidate: ['/tienda/', '/vendor/', '/admin/', '/delivery/'],
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== IMAGE_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external requests
  if (url.origin !== location.origin) return;

  // Handle different caching strategies
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isApiCall(url.pathname)) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  } else if (isImageRequest(request)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
  } else if (isPageRequest(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
  } else {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  }
});

function isStaticAsset(pathname: string): boolean {
  return CACHE_STRATEGIES.static.some((prefix) => pathname.startsWith(prefix));
}

function isApiCall(pathname: string): boolean {
  return CACHE_STRATEGIES.networkFirst.some((prefix) => pathname.startsWith(prefix));
}

function isImageRequest(request: Request): boolean {
  return request.destination === 'image' || request.headers.get('accept')?.includes('image/');
}

function isPageRequest(pathname: string): boolean {
  return CACHE_STRATEGIES.staleWhileRevalidate.some((prefix) => pathname.startsWith(prefix));
}

async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function staleWhileRevalidate(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}

// Background sync for offline orders
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

async function syncOrders(): Promise<void> {
  // Implementation would sync pending orders when online
  console.log('Syncing pending orders...');
}

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options: NotificationOptions = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: data.data,
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action) {
    // Handle action buttons
    const actionData = event.notification.data?.actions?.[event.action];
    if (actionData?.url) {
      event.waitUntil(clients.openWindow(actionData.url));
    }
  } else {
    // Default click - open app
    event.waitUntil(clients.openWindow('/'));
  }
});