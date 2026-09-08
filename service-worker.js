// 每次發布（包含 HTML、CSS、JS 修改）都必須遞增版本。
const CACHE_PREFIX = `landlord-billing-${self.registration.scope}-`;
const CACHE_NAME = `${CACHE_PREFIX}v27`;

const APP_FILES = [
    "./",
    "./index.html",
    "./css/style.css",
    "./css/flat.css",
    "./js/data.js",
    "./js/units.js",
    "./js/calculation.js",
    "./js/storage.js",
    "./js/csv.js",
    "./js/ui.js",
    "./js/meter.js",
    "./js/navigation.js",
    "./js/theme.js",
    "./js/pwa-install.js",
    "./js/pwa.js",
    "./js/app.js",
    "./manifest.webmanifest",
    "./icons/icon.ico",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/icon-maskable-192.png",
    "./icons/icon-maskable-512.png"
];

const APP_URLS = new Set(APP_FILES.map((path) => new URL(path, self.registration.scope).href));

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(
        [...APP_URLS].map((url) => new Request(url, { cache: "reload" }))
    )));
    // 等舊版視窗全部關閉後才啟用，保留使用者正在輸入的內容。
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => Promise.all(
            cacheNames
                .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
                .map((name) => caches.delete(name))
        )).then(() => self.clients.claim())
    );
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

    const isAppNavigation = request.mode === "navigate" &&
        (requestUrl.pathname === scopeUrl.pathname ||
         requestUrl.pathname === new URL("index.html", scopeUrl).pathname);
    const assetUrl = new URL(requestUrl);
    assetUrl.search = "";
    if (!isAppNavigation && !APP_URLS.has(assetUrl.href)) return;

    event.respondWith((async () => {
        // 整個應用使用同一版本，離線或連線緩慢都立即從快取啟動。
        const cache = await caches.open(CACHE_NAME);
        const key = isAppNavigation ? new URL("index.html", scopeUrl).href : assetUrl.href;
        const cachedResponse = await cache.match(key);
        if (cachedResponse) return cachedResponse;
        return fetch(request);
    })());
});
