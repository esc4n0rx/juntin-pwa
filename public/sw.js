const CACHE_NAME = "juntin-pwa-v1"

const FILES_TO_CACHE = [
    "/",
    "/manifest.json",
    "/icon-192x192.png",
    "/icon-512x512.png",
    "/apple-icon.png",
]

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // console.log("SW: Caching files", FILES_TO_CACHE)
            return cache.addAll(FILES_TO_CACHE)
        }),
    )
    self.skipWaiting()
})

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        // console.log("SW: Removing old cache", key)
                        return caches.delete(key)
                    }
                }),
            )
        }),
    )
    self.clients.claim()
})

self.addEventListener("fetch", (event) => {
    // Only handle GET requests
    if (event.request.method !== "GET") return

    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) return

    // Optimized strategy: Stale-While-Revalidate
    // 1. Return from cache immediately if available
    // 2. Fetch from network in background and update cache
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const networkFetch = fetch(event.request).then((response) => {
                // Clone response to put in cache
                const responseClone = response.clone()

                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone)
                })

                return response
            }).catch(() => {
                // Fallback if network fails (already handled by returning cachedResponse if it exists)
                // If both fail, we might want to show an offline page, but for now just returning undefined
            })

            return cachedResponse || networkFetch
        })
    )
})
