"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Clock, AlertTriangle } from "lucide-react"

interface SessionTimeoutWarningProps {
  isOpen: boolean
  timeLeft: string
  onExtend: () => void
  onLogout: () => void
}

export function SessionTimeoutWarning({
  isOpen,
  timeLeft,
  onExtend,
  onLogout
}: SessionTimeoutWarningProps) {
  const [progress, setProgress] = useState(100)

  // Calculate progress based on time left
  useEffect(() => {
    if (isOpen) {
      const [minutes, seconds] = timeLeft.split(':').map(Number)
      const totalSeconds = minutes * 60 + seconds
      const maxSeconds = 5 * 60 // 5 minutes warning
      const progressValue = (totalSeconds / maxSeconds) * 100
      setProgress(Math.max(0, progressValue))
    }
  }, [timeLeft, isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Session Timeout Warning
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-lg font-semibold text-orange-600 mb-2">
              <Clock className="h-5 w-5" />
              {timeLeft}
            </div>
            <p className="text-sm text-gray-600">
              Your session will expire soon due to inactivity.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Time remaining</span>
              <span>{timeLeft}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm text-orange-800">
              <strong>What happens next:</strong> If you don't take action, you'll be automatically logged out and will need to verify your password to continue.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onLogout}
              variant="outline"
              className="flex-1"
            >
              Logout Now
            </Button>
            <Button
              onClick={onExtend}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              Stay Logged In
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            Click "Stay Logged In" to reset the timer, or "Logout Now" to end your session.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
