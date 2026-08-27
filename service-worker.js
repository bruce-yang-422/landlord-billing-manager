const CACHE_PREFIX = "landlord-billing-";
const CACHE_NAME = `${CACHE_PREFIX}v2`;

const APP_FILES = [
    "./",
    "./index.html",
    "./css/style.css",
    "./js/data.js",
    "./js/units.js",
    "./js/calculation.js",
    "./js/storage.js",
    "./js/ui.js",
    "./js/theme.js",
    "./js/pwa-install.js",
    "./js/app.js",
    "./manifest.webmanifest",
    "./icons/icon.ico",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/icon-maskable-192.png",
    "./icons/icon-maskable-512.png",
    "./screenshots/app-mobile.jpg",
    "./screenshots/app-desktop-wide.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)));
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => Promise.all(
            cacheNames
                .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
                .map((name) => caches.delete(name))
        ))
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    const requestUrl = new URL(request.url);
    const scopeUrl = new URL(self.registration.scope);

    if (
        request.method !== "GET" ||
        requestUrl.origin !== scopeUrl.origin ||
        !requestUrl.pathname.startsWith(scopeUrl.pathname)
    ) {
        return;
    }

    event.respondWith(
        fetch(request)
            .then(async (response) => {
                if (response.ok && response.type === "basic") {
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(request, response.clone());
                }
                return response;
            })
            .catch(async () => {
                const cachedResponse = await caches.match(request);
                if (cachedResponse) return cachedResponse;

                if (request.mode === "navigate") {
                    return caches.match("./index.html");
                }

                return Response.error();
            })
    );
});
