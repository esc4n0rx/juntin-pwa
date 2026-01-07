"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

export function ServiceWorkerRegister() {
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
    const [updateAvailable, setUpdateAvailable] = useState(false)

    useEffect(() => {
        if ("serviceWorker" in navigator) {
            // Registra o service worker
            navigator.serviceWorker
                .register("/sw.js")
                .then((reg) => {
                    console.log("SW: Registered successfully")
                    setRegistration(reg)

                    // Verifica atualizações a cada 1 minuto
                    const interval = setInterval(() => {
                        console.log("SW: Checking for updates...")
                        reg.update()
                    }, 60 * 1000) // 1 minuto

                    // Detecta quando há um novo service worker esperando
                    reg.addEventListener("updatefound", () => {
                        const newWorker = reg.installing
                        console.log("SW: Update found!")

                        if (newWorker) {
                            newWorker.addEventListener("statechange", () => {
                                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                                    // Há um novo service worker pronto
                                    console.log("SW: New version ready!")
                                    setUpdateAvailable(true)
                                    showUpdateNotification()
                                }
                            })
                        }
                    })

                    return () => clearInterval(interval)
                })
                .catch((error) => {
                    console.error("SW: Registration failed:", error)
                })

            // Escuta mensagens do service worker
            navigator.serviceWorker.addEventListener("message", (event) => {
                if (event.data && event.data.type === "SW_UPDATED") {
                    console.log(`SW: Updated to version ${event.data.version}`)
                    setUpdateAvailable(true)
                    showUpdateNotification()
                }
            })

            // Detecta quando um novo service worker assume o controle
            navigator.serviceWorker.addEventListener("controllerchange", () => {
                console.log("SW: Controller changed, reloading...")
                window.location.reload()
            })
        }
    }, [])

    const showUpdateNotification = () => {
        toast.success("Nova versão disponível!", {
            description: "Clique aqui para atualizar o aplicativo",
            duration: 10000,
            action: {
                label: "Atualizar",
                onClick: handleUpdate
            }
        })
    }

    const handleUpdate = () => {
        if (registration?.waiting) {
            // Envia mensagem para o service worker pular a espera
            registration.waiting.postMessage({ type: "SKIP_WAITING" })
        } else {
            // Se não há service worker esperando, apenas recarrega
            window.location.reload()
        }
    }

    return null
}
