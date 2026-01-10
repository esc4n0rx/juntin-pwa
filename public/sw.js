// Versão do cache - IMPORTANTE: Atualize este número sempre que fizer alterações no app
const VERSION = "1.0.4"
const CACHE_NAME = `juntin-pwa-v${VERSION}`
const RUNTIME_CACHE = `juntin-runtime-v${VERSION}`

// Arquivos essenciais para cache (apenas recursos estáticos)
const STATIC_FILES = [
    "/manifest.json",
    "/icon-192x192.png",
    "/icon-512x512.png",
    "/apple-icon.png",
]

// Tempo máximo de cache para recursos dinâmicos (1 hora)
const MAX_AGE = 60 * 60 * 1000

// Install - Cachear apenas arquivos estáticos essenciais
self.addEventListener("install", (event) => {
    console.log(`SW: Installing version ${VERSION}`)

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("SW: Caching static files")
            return cache.addAll(STATIC_FILES)
        }).then(() => {
            // Força o novo SW a assumir imediatamente
            return self.skipWaiting()
        })
    )
})

// Activate - Limpar caches antigos
self.addEventListener("activate", (event) => {
    console.log(`SW: Activating version ${VERSION}`)

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Remove todos os caches que não são da versão atual
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        console.log("SW: Removing old cache:", cacheName)
                        return caches.delete(cacheName)
                    }
                })
            )
        }).then(() => {
            // Assume o controle de todos os clientes imediatamente
            return self.clients.claim()
        }).then(() => {
            // Notifica todos os clientes que há uma nova versão
            return self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({
                        type: "SW_UPDATED",
                        version: VERSION
                    })
                })
            })
        })
    )
})

// Fetch - Estratégia híbrida otimizada
self.addEventListener("fetch", (event) => {
    const { request } = event
    const url = new URL(request.url)

    // Apenas processa requisições GET
    if (request.method !== "GET") return

    // Pula requisições cross-origin
    if (url.origin !== self.location.origin) return

    // Pula requisições de API (sempre busca da rede)
    if (url.pathname.startsWith("/api/")) {
        event.respondWith(fetch(request))
        return
    }

    // Estratégia baseada no tipo de recurso
    if (shouldUseNetworkFirst(url)) {
        // Network-First: Para HTML, JS, CSS - sempre busca da rede primeiro
        event.respondWith(networkFirst(request))
    } else {
        // Cache-First: Para imagens e recursos estáticos
        event.respondWith(cacheFirst(request))
    }
})

// Determina se deve usar Network-First
function shouldUseNetworkFirst(url) {
    const pathname = url.pathname

    // Páginas HTML e recursos Next.js
    if (pathname === "/" || pathname.startsWith("/_next/")) {
        return true
    }

    // Arquivos JS e CSS
    if (pathname.endsWith(".js") || pathname.endsWith(".css")) {
        return true
    }

    return false
}

// Estratégia Network-First
async function networkFirst(request) {
    try {
        // Tenta buscar da rede primeiro
        const networkResponse = await fetch(request)

        // Se sucesso, atualiza o cache
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(RUNTIME_CACHE)
            cache.put(request, networkResponse.clone())
        }

        return networkResponse
    } catch (error) {
        // Se falhar, busca do cache
        const cachedResponse = await caches.match(request)

        if (cachedResponse) {
            console.log("SW: Serving from cache (offline):", request.url)
            return cachedResponse
        }

        // Se não há cache, retorna erro
        throw error
    }
}

// Estratégia Cache-First
async function cacheFirst(request) {
    // Busca do cache primeiro
    const cachedResponse = await caches.match(request)

    if (cachedResponse) {
        // Verifica se o cache está muito antigo
        const dateHeader = cachedResponse.headers.get("date")
        const cachedTime = dateHeader ? new Date(dateHeader).getTime() : 0
        const now = Date.now()

        // Se o cache está fresco, retorna
        if (now - cachedTime < MAX_AGE) {
            return cachedResponse
        }
    }

    try {
        // Busca da rede
        const networkResponse = await fetch(request)

        // Atualiza o cache
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(RUNTIME_CACHE)
            cache.put(request, networkResponse.clone())
        }

        return networkResponse
    } catch (error) {
        // Se falhar e há cache (mesmo antigo), retorna
        if (cachedResponse) {
            return cachedResponse
        }

        throw error
    }
}

// Escuta mensagens dos clientes
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        console.log("SW: Skipping waiting")
        self.skipWaiting()
    }

    if (event.data && event.data.type === "CHECK_UPDATE") {
        // Força verificação de atualização
        self.registration.update()
    }
})
