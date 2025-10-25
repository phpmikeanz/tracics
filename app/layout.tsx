import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"
import { NotificationProvider } from "@/contexts/notification-context"
import { EnrollmentProvider } from "@/contexts/enrollment-context"
import { SessionManager } from "@/components/auth/session-manager"
import { Suspense } from "react"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "TTRAC Learning Management System",
  description: "Tawi-Tawi Regional Agricultural College LMS",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="antialiased">
      <body className={`font-sans ${inter.variable}`}>
        <Suspense fallback={null}>
          <AuthProvider>
            <NotificationProvider>
              <EnrollmentProvider>
                <SessionManager>
                  {children}
                </SessionManager>
              </EnrollmentProvider>
            </NotificationProvider>
          </AuthProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
