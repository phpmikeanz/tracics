"use client"
import React from "react"
import { LoginForm } from "@/components/auth/login-form"
import { StudentDashboard } from "@/components/dashboard/student-dashboard"
import { FacultyDashboard } from "@/components/dashboard/faculty-dashboard"
import { FullScreenLoader } from "@/components/ui/full-screen-loader"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { useAuth } from "@/hooks/use-auth"
import { AuthProvider } from "@/contexts/auth-context"

function AppContent() {
  const { user, isAuthenticated, loading } = useAuth()

  console.log("[App] Render state:", { user: !!user, isAuthenticated, loading })

  if (loading) {
    return <FullScreenLoader />
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <LoginForm />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {user?.role === "student" ? <StudentDashboard /> : <FacultyDashboard />}
    </div>
  )
}

export default function Home() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  )
}
