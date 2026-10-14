import type React from "react"
import type { Metadata } from "next"
import { Roboto } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
})

const description = "Бронирование ассистентов для курсов Data Culture НИУ ВШЭ"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000"),
  title: "DC Assist",
  description,
  icons: {
    icon: "/logo.png",
  },
  // Превью ссылки в Telegram и других мессенджерах
  openGraph: {
    title: "DC Assist",
    description,
    siteName: "DC Assist",
    locale: "ru_RU",
    type: "website",
    images: [{ url: "/logo.png", width: 300, height: 198 }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru">
      <body className={`${roboto.className} antialiased`}>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
