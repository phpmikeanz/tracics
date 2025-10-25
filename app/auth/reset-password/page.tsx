"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { createClient } from "@/lib/client"
import { useRouter, useSearchParams } from "next/navigation"

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isValidating, setIsValidating] = useState(true)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Validate the reset token on mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          setError("Invalid or expired reset link. Please request a new password reset.")
          setIsValidating(false)
        } else {
          setIsValidating(false)
        }
      } catch (error) {
        console.error("[ResetPassword] Token validation error:", error)
        setError("Failed to validate reset link. Please try again.")
        setIsValidating(false)
      }
    }

    validateToken()
  }, [])

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.")
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        console.error("[ResetPassword] Password update error:", error)
        setError(error.message)
      } else {
        setSuccess("Password updated successfully! Redirecting to login...")
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push("/auth/login")
        }, 2000)
      }
    } catch (error) {
      console.error("[ResetPassword] Password update exception:", error)
      setError("Failed to update password. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="flex items-center gap-2">
          <LoadingSpinner size="lg" />
          <span>Validating reset link...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-0 px-24">
      <div className="max-w-md mx-auto w-96">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary p-3 rounded-full shadow-lg">
              <img src="/ttrac-logo.png" alt="TTRAC Logo" className="h-8 w-8 sm:h-10 sm:w-10" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">TTRAC</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">Tawi-Tawi Regional Agricultural College</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Institute Computing Studies</p>
        </div>

        <Card className="shadow-xl border-0 bg-card/95 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl text-center">Reset Your Password</CardTitle>
            <CardDescription className="text-center text-sm">
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  New Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your new password (min. 6 characters)"
                  className="h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-medium">
                  Confirm Password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm your new password"
                  className="h-11"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {error && (
                <div className="text-sm text-destructive-foreground bg-destructive/10 p-3 rounded-md border border-destructive/20">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-sm text-green-700 bg-green-50 p-3 rounded-md border border-green-200">
                  {success}
                </div>
              )}
              <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Updating password...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => router.push("/auth/login")}
                  className="text-sm text-primary hover:underline"
                >
                  Back to Login
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
