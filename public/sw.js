const CACHE_NAME = 'pos-inventory-v1';
const RUNTIME_CACHE = 'pos-inventory-runtime-v1';
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/apple-touch-icon.png',
    '/favicon.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] Caching static assets');
                return cache.addAll(STATIC_ASSETS).catch((error) => {
                    console.warn(
                        '[ServiceWorker] Error caching static assets:',
                        error,
                    );
                });
            })
            .then(() => self.skipWaiting()),
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (
                            cacheName !== CACHE_NAME &&
                            cacheName !== RUNTIME_CACHE
                        ) {
                            console.log(
                                '[ServiceWorker] Deleting old cache:',
                                cacheName,
                            );
                            return caches.delete(cacheName);
                        }
                    }),
                );
            })
            .then(() => self.clients.claim()),
    );
});

// Fetch event - implement caching strategy
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip external requests and APIs
    if (url.origin !== location.origin) {
        return;
    }

    // Skip API requests - handle them separately
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // Handle static assets with cache-first strategy
    if (isStaticAsset(url.pathname)) {
        event.respondWith(handleStaticAsset(request));
        return;
    }

    // Handle HTML pages with network-first strategy
    if (
        request.destination === 'document' ||
        request.mode === 'navigate' ||
        url.pathname.endsWith('.html')
    ) {
        event.respondWith(handleHtmlRequest(request));
        return;
    }

    // Default: network-first with cache fallback
    event.respondWith(handleGenericRequest(request));
});

/**
 * Cache-first strategy for static assets
 */
function handleStaticAsset(request) {
    return caches
        .open(CACHE_NAME)
        .then((cache) => {
            return cache.match(request).then((response) => {
                if (response) {
                    return response;
                }

                return fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                });
            });
        })
        .catch(() => {
            // Return offline fallback
            return caches.match(request).catch(() => createOfflineResponse());
        });
}

/**
 * Network-first strategy for HTML pages
 */
function handleHtmlRequest(request) {
    return fetch(request)
        .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
                caches.open(RUNTIME_CACHE).then((cache) => {
                    cache.put(request, networkResponse.clone());
                });
            }
            return networkResponse;
        })
        .catch(() => {
            return caches.match(request).catch(() => createOfflineResponse());
        });
}

/**
 * Network-first strategy for API requests
 */
function handleApiRequest(request) {
    return fetch(request)
        .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
                // Cache successful API responses
                caches.open(RUNTIME_CACHE).then((cache) => {
                    cache.put(request, networkResponse.clone());
                });
            }
            return networkResponse;
        })
        .catch(() => {
            // Try to return cached response for API
            return caches.match(request).catch(() => {
                // Return offline API error response for product endpoints
                if (request.url.includes('/api/products')) {
                    return new Response(
                        JSON.stringify({
                            error: 'offline',
                            message:
                                'API unavailable offline. Using cached data if available.',
                        }),
                        {
                            status: 500,
                            headers: { 'Content-Type': 'application/json' },
                        },
                    );
                }
                return undefined;
            });
        });
}

/**
 * Generic network-first strategy
 */
function handleGenericRequest(request) {
    return fetch(request)
        .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
                caches.open(RUNTIME_CACHE).then((cache) => {
                    cache.put(request, networkResponse.clone());
                });
            }
            return networkResponse;
        })
        .catch(() => {
            return caches.match(request).catch(() => createOfflineResponse());
        });
}

/**
 * Check if URL is a static asset
 */
function isStaticAsset(pathname) {
    const staticExtensions = [
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
    ];
    return staticExtensions.some((ext) => pathname.endsWith(ext));
}

/**
 * Create offline fallback response
 */
function createOfflineResponse() {
    return new Response(
        `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Offline</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
                text-align: center;
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                max-width: 400px;
            }
            h1 {
                color: #333;
                margin: 0 0 10px 0;
            }
            p {
                color: #666;
                margin: 0;
                line-height: 1.6;
            }
            .icon {
                font-size: 48px;
                margin-bottom: 20px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">📵</div>
            <h1>You are Offline</h1>
            <p>It looks like you lost your internet connection. This page is not available offline.</p>
            <p style="margin-top: 20px; font-size: 12px; color: #999;">Please check your connection and try again.</p>
        </div>
    </body>
    </html>
    `,
        {
            status: 503,
            headers: { 'Content-Type': 'text/html' },
        },
    );
}

// Handle messages from clients
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
