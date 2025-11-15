"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { createClient } from "@/lib/client"

export function LoginForm() {
  const router = useRouter()
  const { login, signup, loading, user, isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [isSendingReset, setIsSendingReset] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log("[LoginForm] User already authenticated, redirecting to home...")
      router.push("/")
    }
  }, [isAuthenticated, user, router])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const formData = new FormData(e.currentTarget)
      const email = formData.get("email") as string
      const password = formData.get("password") as string

      console.log("[LoginForm] Attempting login for:", email)
      
      // Add timeout to prevent infinite loading
      const loginPromise = login(email, password)
      const timeoutPromise = new Promise<boolean>((resolve) => 
        setTimeout(() => {
          console.log("[LoginForm] Login timeout reached")
          resolve(false)
        }, 15000)
      )
      
      const success = await Promise.race([loginPromise, timeoutPromise])
      
      if (!success) {
        setError("Invalid credentials or login timeout. Please check your email and password and try again.")
        setIsLoading(false)
      } else {
        console.log("[LoginForm] Login successful, redirecting...")
        setSuccess("Login successful! Redirecting...")
        // Small delay to show success message, then redirect
        setTimeout(() => {
          router.push("/")
        }, 500)
      }
    } catch (error) {
      console.error("[LoginForm] Login error:", error)
      setError("An error occurred during login. Please try again.")
      setIsLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const role = formData.get("role") as "student" | "faculty"

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.")
      setIsLoading(false)
      return
    }

    const success = await signup(name, email, password, role)
    if (success) {
      setSuccess("Account created successfully! Please check your email to verify your account.")
    } else {
      setError("Signup failed. Please try again.")
    }
    setIsLoading(false)
  }

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSendingReset(true)
    setError("")
    setSuccess("")

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/reset-password`,
      })

      if (error) {
        console.error("[LoginForm] Password reset error:", error)
        setError(error.message)
      } else {
        setSuccess("Password reset email sent! Please check your inbox.")
        setResetEmail("")
        setTimeout(() => setShowForgotPassword(false), 3000)
      }
    } catch (error) {
      console.error("[LoginForm] Password reset exception:", error)
      setError("Failed to send reset email. Please try again.")
    } finally {
      setIsSendingReset(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="flex items-center gap-2">
          <LoadingSpinner size="lg" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-sm sm:max-w-md mx-auto px-2 sm:px-4">
        <div className="text-center mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <div className="bg-primary p-2.5 sm:p-3 rounded-full shadow-lg">
              <img src="/ttrac-logo.png" alt="TTRAC Logo" className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10" />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">TTRAC</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-xs sm:text-sm md:text-base">Tawi-Tawi Regional Agricultural College</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Institute Computing Studies</p>
        </div>

        <Card className="shadow-xl border-0 bg-card/95 backdrop-blur-sm">
          <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-base sm:text-lg md:text-xl text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center text-xs sm:text-sm">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6 h-9 sm:h-10">
                <TabsTrigger value="login" className="text-xs sm:text-sm">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-xs sm:text-sm">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                {!showForgotPassword ? (
                  <>
                    <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="email" className="text-xs sm:text-sm font-medium">
                          Email
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="Enter your email"
                          className="h-10 sm:h-11 text-sm sm:text-base touch-manipulation"
                          required
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="password" className="text-xs sm:text-sm font-medium">
                          Password
                        </Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          placeholder="Enter your password"
                          className="h-10 sm:h-11 text-sm sm:text-base touch-manipulation"
                          required
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(true)}
                          className="text-xs sm:text-sm text-primary hover:underline touch-manipulation py-1"
                        >
                          Forgot password?
                        </button>
                      </div>
                      {error && (
                        <div className="text-xs sm:text-sm text-destructive-foreground bg-destructive/10 p-2.5 sm:p-3 rounded-md border border-destructive/20">
                          {error}
                        </div>
                      )}
                      {success && (
                        <div className="text-xs sm:text-sm text-green-700 bg-green-50 p-2.5 sm:p-3 rounded-md border border-green-200">
                          {success}
                        </div>
                      )}
                      <Button type="submit" className="w-full h-10 sm:h-11 text-xs sm:text-sm font-medium touch-manipulation" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span className="ml-2">Signing in...</span>
                          </>
                        ) : (
                          "Sign In"
                        )}
                      </Button>
                    </form>
                  </>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-3 sm:space-y-4">
                    <div className="text-center mb-3 sm:mb-4">
                      <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2">Reset Your Password</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Enter your email address and we'll send you a link to reset your password.
                      </p>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="reset-email" className="text-xs sm:text-sm font-medium">
                        Email
                      </Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="Enter your email"
                        className="h-10 sm:h-11 text-sm sm:text-base touch-manipulation"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                      />
                    </div>
                    {error && (
                      <div className="text-xs sm:text-sm text-destructive-foreground bg-destructive/10 p-2.5 sm:p-3 rounded-md border border-destructive/20">
                        {error}
                      </div>
                    )}
                    {success && (
                      <div className="text-xs sm:text-sm text-green-700 bg-green-50 p-2.5 sm:p-3 rounded-md border border-green-200">
                        {success}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 h-10 sm:h-11 text-xs sm:text-sm touch-manipulation"
                        onClick={() => {
                          setShowForgotPassword(false)
                          setError("")
                          setSuccess("")
                          setResetEmail("")
                        }}
                        disabled={isSendingReset}
                      >
                        Back
                      </Button>
                      <Button type="submit" className="flex-1 h-10 sm:h-11 text-xs sm:text-sm font-medium touch-manipulation" disabled={isSendingReset}>
                        {isSendingReset ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span className="ml-2">Sending...</span>
                          </>
                        ) : (
                          "Send Reset Link"
                        )}
                      </Button>
                    </div>
                  </form>
                )}

                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-xs sm:text-sm text-primary font-medium mb-2 sm:mb-3">Getting Started:</p>
                  <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-primary/80">
                    <p>
                      Create a new account using the Sign Up tab, or contact your administrator for login credentials.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-3 sm:space-y-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="name" className="text-xs sm:text-sm font-medium">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Enter your full name"
                      className="h-10 sm:h-11 text-sm sm:text-base touch-manipulation"
                      required
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="signup-email" className="text-xs sm:text-sm font-medium">
                      Email
                    </Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      className="h-10 sm:h-11 text-sm sm:text-base touch-manipulation"
                      required
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="signup-password" className="text-xs sm:text-sm font-medium">
                      Password
                    </Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="Create a password (min. 6 characters)"
                      className="h-10 sm:h-11 text-sm sm:text-base touch-manipulation"
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="role" className="text-xs sm:text-sm font-medium">
                      Role
                    </Label>
                    <Select name="role" required>
                      <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base touch-manipulation">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="faculty">Faculty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {error && (
                    <div className="text-xs sm:text-sm text-destructive-foreground bg-destructive/10 p-2.5 sm:p-3 rounded-md border border-destructive/20">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="text-xs sm:text-sm text-green-700 bg-green-50 p-2.5 sm:p-3 rounded-md border border-green-200">
                      {success}
                    </div>
                  )}
                  <Button type="submit" className="w-full h-10 sm:h-11 text-xs sm:text-sm font-medium touch-manipulation" disabled>
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
