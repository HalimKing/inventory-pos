const CACHE_NAME = 'pos-inventory-v2';
const RUNTIME_CACHE = 'pos-inventory-runtime-v2';

const STATIC_ASSETS = [
    '/manifest.json',
    '/apple-touch-icon.png',
    '/favicon.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) =>
                cache.addAll(STATIC_ASSETS).catch((error) => {
                    console.warn('[ServiceWorker] Error caching static assets:', error);
                }),
            )
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) =>
                Promise.all(
                    cacheNames.map((cacheName) => {
                        if (
                            cacheName !== CACHE_NAME &&
                            cacheName !== RUNTIME_CACHE
                        ) {
                            return caches.delete(cacheName);
                        }
                    }),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== location.origin) {
        return;
    }

    // Never intercept Inertia partial reloads or XHR — avoids blank pages and bad caches.
    if (
        request.headers.get('X-Inertia') ||
        request.headers.get('X-Inertia-Version') ||
        request.headers.get('X-Requested-With') === 'XMLHttpRequest'
    ) {
        return;
    }

    // App routes are handled by Inertia; only cache static build assets.
    if (isStaticAsset(url.pathname)) {
        event.respondWith(handleStaticAsset(request));
        return;
    }

    // Offline product lookup for POS (optional cache).
    if (isOfflineProductApi(url.pathname)) {
        event.respondWith(handleOfflineProductApi(request));
        return;
    }

    // All other requests: browser network stack only.
});

function isStaticAsset(pathname) {
    return (
        pathname.startsWith('/build/') ||
        [
            '.js',
            '.css',
            '.png',
            '.jpg',
            '.jpeg',
            '.gif',
            '.svg',
            '.webp',
            '.woff',
            '.woff2',
            '.ttf',
            '.eot',
            '.ico',
        ].some((ext) => pathname.endsWith(ext))
    );
}

function isOfflineProductApi(pathname) {
    return (
        pathname.startsWith('/api/products') ||
        pathname.includes('/products/fetch-all-products')
    );
}

function handleStaticAsset(request) {
    return caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
            if (cached) {
                return cached;
            }

            return fetch(request).then((response) => {
                if (response.ok) {
                    cache.put(request, response.clone());
                }
                return response;
            });
        }),
    );
}

function handleOfflineProductApi(request) {
    return fetch(request)
        .then((response) => {
            if (response.ok) {
                const clone = response.clone();
                caches.open(RUNTIME_CACHE).then((cache) => {
                    cache.put(request, clone);
                });
            }
            return response;
        })
        .catch(() =>
            caches.match(request).then(
                (cached) =>
                    cached ??
                    new Response(
                        JSON.stringify({
                            error: 'offline',
                            message: 'API unavailable offline.',
                        }),
                        {
                            status: 503,
                            headers: { 'Content-Type': 'application/json' },
                        },
                    ),
            ),
        );
}

self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
