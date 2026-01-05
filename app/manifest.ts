import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JUNTIN - Controle de Finanças a Dois",
    short_name: "JUNTIN",
    description: "Gerencie suas finanças sozinho ou em casal",
    start_url: "/",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#60A5FA",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  }
}
