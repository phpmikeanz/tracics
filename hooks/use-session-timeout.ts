import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './use-auth'

interface SessionTimeoutConfig {
  timeoutMinutes: number
  warningMinutes: number
  onTimeout: () => void
  onWarning: () => void
}

export function useSessionTimeout({
  timeoutMinutes = 30,
  warningMinutes = 5,
  onTimeout,
  onWarning
}: SessionTimeoutConfig) {
  const { user } = useAuth()
  const [isActive, setIsActive] = useState(true)
  const [timeLeft, setTimeLeft] = useState(timeoutMinutes * 60)
  const [showWarning, setShowWarning] = useState(false)

  // Reset timer on user activity
  const resetTimer = useCallback(() => {
    setIsActive(true)
    setTimeLeft(timeoutMinutes * 60)
    setShowWarning(false)
  }, [timeoutMinutes])

  // Handle user activity
  const handleActivity = useCallback(() => {
    if (user) {
      resetTimer()
    }
  }, [user, resetTimer])

  // Set up activity listeners
  useEffect(() => {
    if (!user) return

    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ]

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [user, handleActivity])

  // Timer countdown
  useEffect(() => {
    if (!user || !isActive) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          setIsActive(false)
          onTimeout()
          return 0
        }

        // Show warning when time is running out
        if (prev <= warningMinutes * 60 && !showWarning) {
          setShowWarning(true)
          onWarning()
        }

        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [user, isActive, warningMinutes, showWarning, onTimeout, onWarning])

  // Format time left
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return {
    isActive,
    timeLeft,
    showWarning,
    resetTimer,
    formatTime: formatTime(timeLeft)
  }
}
