"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useSessionTimeout } from "@/hooks/use-session-timeout"
import { PasswordVerificationModal } from "./password-verification-modal"
import { SessionTimeoutWarning } from "./session-timeout-warning"
import { useRouter } from "next/navigation"

interface SessionManagerProps {
  children: React.ReactNode
}

export function SessionManager({ children }: SessionManagerProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  
  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)

  // Session timeout configuration
  const {
    isActive,
    timeLeft,
    showWarning,
    resetTimer,
    formatTime
  } = useSessionTimeout({
    timeoutMinutes: 15, // 15 minutes of inactivity
    warningMinutes: 3,  // Show warning 3 minutes before timeout
    onTimeout: handleTimeout,
    onWarning: handleWarning
  })

  function handleTimeout() {
    console.log("Session timeout - user will be logged out")
    setSessionExpired(true)
    setShowPasswordModal(true)
  }

  function handleWarning() {
    console.log("Session warning - showing timeout warning")
    setShowTimeoutWarning(true)
  }

  // Handle extending session
  const handleExtendSession = () => {
    resetTimer()
    setShowTimeoutWarning(false)
    console.log("Session extended by user activity")
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut()
      setShowTimeoutWarning(false)
      setShowPasswordModal(false)
      router.push("/auth/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  // Handle password verification success
  const handlePasswordSuccess = () => {
    setShowPasswordModal(false)
    setSessionExpired(false)
    resetTimer()
    console.log("Password verified - session restored")
  }

  // Handle password verification close (logout if session expired)
  const handlePasswordClose = () => {
    if (sessionExpired) {
      handleLogout()
    } else {
      setShowPasswordModal(false)
    }
  }

  // Show warning when time is running out
  useEffect(() => {
    if (showWarning && !showTimeoutWarning) {
      setShowTimeoutWarning(true)
    }
  }, [showWarning, showTimeoutWarning])

  // Don't render session management if user is not authenticated
  if (!user) {
    return <>{children}</>
  }

  return (
    <>
      {children}
      
      {/* Session Timeout Warning */}
      <SessionTimeoutWarning
        isOpen={showTimeoutWarning}
        timeLeft={formatTime}
        onExtend={handleExtendSession}
        onLogout={handleLogout}
      />

      {/* Password Verification Modal */}
      <PasswordVerificationModal
        isOpen={showPasswordModal}
        onClose={handlePasswordClose}
        onSuccess={handlePasswordSuccess}
        title={sessionExpired ? "Session Expired - Password Verification Required" : "Password Verification Required"}
        description={sessionExpired 
          ? "Your session has expired due to inactivity. Please enter your password to continue using the system."
          : "Please enter your password to continue using the system."
        }
      />
    </>
  )
}
