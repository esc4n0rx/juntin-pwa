import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeWrapper } from "@/components/theme-wrapper"
import { Toaster } from "@/components/ui/sonner"
import { ServiceWorkerRegister } from "@/components/service-worker-register"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#60A5FA",
}

export const metadata: Metadata = {
  title: "JUNTIN - Controle de Finanças a Dois",
  description: "Gerencie suas finanças sozinho ou em casal",
  generator: "v0.app",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JUNTIN",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeWrapper>
          {children}
          <Toaster />
          <ServiceWorkerRegister />
        </ThemeWrapper>
        <Analytics />
      </body>
    </html>
  )
}
