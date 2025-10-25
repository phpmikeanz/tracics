"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSessionTimeout } from "@/hooks/use-session-timeout"
import { useAuth } from "@/hooks/use-auth"
import { Clock, Shield, AlertTriangle, CheckCircle } from "lucide-react"

export default function TestSessionTimeoutPage() {
  const { user } = useAuth()
  const [showTestWarning, setShowTestWarning] = useState(false)
  
  // Test with shorter timeout for demonstration
  const {
    isActive,
    timeLeft,
    showWarning,
    resetTimer,
    formatTime
  } = useSessionTimeout({
    timeoutMinutes: 15, // 15 minutes for testing
    warningMinutes: 3,  // 3 minutes warning
    onTimeout: () => {
      console.log("Test timeout triggered")
      setShowTestWarning(true)
    },
    onWarning: () => {
      console.log("Test warning triggered")
    }
  })

  const handleResetTimer = () => {
    resetTimer()
    setShowTestWarning(false)
  }

  const getStatusColor = (active: boolean) => {
    return active ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
  }

  const getStatusIcon = (active: boolean) => {
    return active ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Session Timeout Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {user ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Session Status</h3>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(isActive)}
                      <Badge className={getStatusColor(isActive)}>
                        {isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold">Time Remaining</h3>
                    <div className="flex items-center gap-2 text-lg font-mono">
                      <Clock className="h-5 w-5" />
                      {formatTime}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Warning Status</h3>
                    <div className="flex items-center gap-2">
                      {showWarning ? (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      <span className={showWarning ? "text-orange-600" : "text-green-600"}>
                        {showWarning ? "Warning Active" : "No Warning"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold">Test Controls</h3>
                    <Button onClick={handleResetTimer} className="w-full">
                      Reset Timer
                    </Button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">How to Test:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Wait for 12 minutes to see the warning appear</li>
                    <li>Wait for 15 minutes total to see the timeout</li>
                    <li>Move your mouse or click to reset the timer</li>
                    <li>Try leaving the page idle to test automatic logout</li>
                  </ol>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">Test Configuration:</h4>
                  <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                    <li><strong>Timeout:</strong> 15 minutes (for testing)</li>
                    <li><strong>Warning:</strong> 3 minutes before timeout</li>
                    <li><strong>Production:</strong> 30 minutes timeout, 5 minutes warning</li>
                  </ul>
                </div>

                {showTestWarning && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-900 mb-2">⚠️ Test Timeout Triggered!</h4>
                    <p className="text-sm text-red-800">
                      In the real application, this would show a password verification modal.
                    </p>
                    <Button 
                      onClick={handleResetTimer} 
                      className="mt-2"
                      variant="outline"
                    >
                      Reset for Testing
                    </Button>
                  </div>
                )}

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">Security Features:</h4>
                  <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                    <li>✅ Automatic logout after 30 minutes of inactivity</li>
                    <li>✅ Warning 5 minutes before timeout</li>
                    <li>✅ Password verification required to continue</li>
                    <li>✅ Activity detection (mouse, keyboard, touch)</li>
                    <li>✅ Secure session management</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">Please log in to test session timeout functionality.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
