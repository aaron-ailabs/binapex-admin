import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/react"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/contexts/auth-context"
import { ErrorBoundary } from "@/components/error-boundary"
import { GlobalAdminNotificationListener } from "@/components/notifications/global-admin-listener"
import "./globals.css"

export const dynamic = "force-dynamic"


const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
})

export const metadata: Metadata = {
  title: "Binapex - Trade the Future of Finance",
  description: "Professional multi-asset trading platform for Crypto, Forex, Stocks, and Commodities",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/logo-icon.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/logo-icon.png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: "/logo-icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0a",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark bg-binapex-dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-binapex-dark text-foreground`}
      >
        <ErrorBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ErrorBoundary>
        <Analytics />
        <Toaster position="top-right" />
        <GlobalAdminNotificationListener />
      </body>
    </html>
  )
}
