import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Authentication - TTRAC LMS",
  description: "Sign in to Tawi-Tawi Regional Agricultural College Learning Management System",
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">{children}</div>
}
