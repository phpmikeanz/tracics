"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"

export function LoginForm() {
  const { login, signup, loading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const success = await login(email, password)
    if (!success) {
      setError("Invalid credentials. Please check your email and password.")
    }
    setIsLoading(false)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-2 xs:p-3 sm:p-4 md:p-6 lg:p-8 relative overflow-hidden">
      {/* Background decorative elements - Responsive positioning */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 xs:-top-32 xs:-right-32 sm:-top-40 sm:-right-40 w-40 h-40 xs:w-60 xs:h-60 sm:w-80 sm:h-80 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-2xl xs:blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 xs:-bottom-32 xs:-left-32 sm:-bottom-40 sm:-left-40 w-40 h-40 xs:w-60 xs:h-60 sm:w-80 sm:h-80 bg-gradient-to-tr from-green-400/20 to-emerald-600/20 rounded-full blur-2xl xs:blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 xs:w-72 xs:h-72 sm:w-96 sm:h-96 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-2xl xs:blur-3xl"></div>
      </div>

      <div className="w-full max-w-xs xs:max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto relative z-10">
        {/* Header Section - Enhanced Mobile Responsiveness */}
        <div className="text-center mb-6 xs:mb-8 sm:mb-10 lg:mb-12">
          <div className="flex items-center justify-center mb-4 xs:mb-6 sm:mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl xs:rounded-2xl blur-md xs:blur-lg opacity-75"></div>
              <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-3 xs:p-4 sm:p-5 rounded-xl xs:rounded-2xl shadow-xl xs:shadow-2xl">
                <img src="/ttrac-logo.png" alt="TTRAC Logo" className="h-8 w-8 xs:h-10 xs:w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 high-dpi" />
              </div>
            </div>
          </div>
          <h1 className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-1 xs:mb-2">
            TTRAC
          </h1>
          <p className="text-gray-600 text-xs xs:text-sm sm:text-base lg:text-lg font-medium mb-1">
            Tawi-Tawi Regional Agricultural College
          </p>
          <p className="text-gray-500 text-xs xs:text-sm lg:text-base">
            Institute Computing Studies
          </p>
        </div>

        {/* Main Card */}
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-xl w-full relative overflow-hidden">
          {/* Card gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 rounded-xl blur-sm -z-10"></div>
          
          <CardHeader className="pb-4 xs:pb-6 sm:pb-8 pt-6 xs:pt-8 sm:pt-10">
            <CardTitle className="text-lg xs:text-xl sm:text-2xl lg:text-3xl text-center font-bold text-gray-900">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-center text-xs xs:text-sm sm:text-base text-gray-600 mt-1 xs:mt-2">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 xs:px-6 sm:px-8 lg:px-10 pb-6 xs:pb-8 sm:pb-10">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 xs:mb-8 h-10 xs:h-12 sm:h-14 bg-gray-100/50 p-1 rounded-lg xs:rounded-xl">
                <TabsTrigger 
                  value="login" 
                  className="text-xs xs:text-sm sm:text-base lg:text-lg font-medium touch-target data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 transition-all duration-200 rounded-md xs:rounded-lg"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="text-xs xs:text-sm sm:text-base lg:text-lg font-medium touch-target data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 transition-all duration-200 rounded-md xs:rounded-lg"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 xs:space-y-6 sm:space-y-8">
                  <div className="space-y-2 xs:space-y-3">
                    <Label htmlFor="email" className="text-xs xs:text-sm sm:text-base font-semibold text-gray-700">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email address"
                      className="h-10 xs:h-12 sm:h-14 touch-target border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg xs:rounded-xl text-xs xs:text-sm sm:text-base transition-all duration-200"
                      required
                    />
                  </div>
                  <div className="space-y-2 xs:space-y-3">
                    <Label htmlFor="password" className="text-xs xs:text-sm sm:text-base font-semibold text-gray-700">
                      Password
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      className="h-10 xs:h-12 sm:h-14 touch-target border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg xs:rounded-xl text-xs xs:text-sm sm:text-base transition-all duration-200"
                      required
                    />
                  </div>
                  {error && (
                    <div className="text-xs xs:text-sm text-red-700 bg-red-50 p-3 xs:p-4 rounded-lg xs:rounded-xl border border-red-200 flex items-center gap-2">
                      <div className="w-1.5 xs:w-2 h-1.5 xs:h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                      {error}
                    </div>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full h-10 xs:h-12 sm:h-14 text-xs xs:text-sm sm:text-base font-semibold touch-target bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg xs:rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-1 xs:mr-2 h-4 xs:h-5 w-4 xs:w-5 animate-spin" />
                        <span className="hidden xs:inline">Signing in...</span>
                        <span className="xs:hidden">Signing in...</span>
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>

                <div className="mt-6 xs:mt-8 p-4 xs:p-6 sm:p-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl xs:rounded-2xl border border-blue-100">
                  <div className="flex items-start gap-2 xs:gap-3">
                    <div className="w-6 xs:w-8 h-6 xs:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 xs:w-3 h-2 xs:h-3 bg-blue-600 rounded-full"></div>
                    </div>
                    <div>
                      <p className="text-xs xs:text-sm sm:text-base text-gray-800 font-semibold mb-1 xs:mb-2">Getting Started</p>
                      <p className="text-xs xs:text-sm text-gray-600 leading-relaxed">
                        Create a new account using the Sign Up tab, or contact your administrator for login credentials.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4 xs:space-y-6 sm:space-y-8">
                  <div className="space-y-2 xs:space-y-3">
                    <Label htmlFor="name" className="text-xs xs:text-sm sm:text-base font-semibold text-gray-700">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Enter your full name"
                      className="h-10 xs:h-12 sm:h-14 touch-target border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg xs:rounded-xl text-xs xs:text-sm sm:text-base transition-all duration-200"
                      required
                    />
                  </div>
                  <div className="space-y-2 xs:space-y-3">
                    <Label htmlFor="signup-email" className="text-xs xs:text-sm sm:text-base font-semibold text-gray-700">
                      Email Address
                    </Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email address"
                      className="h-10 xs:h-12 sm:h-14 touch-target border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg xs:rounded-xl text-xs xs:text-sm sm:text-base transition-all duration-200"
                      required
                    />
                  </div>
                  <div className="space-y-2 xs:space-y-3">
                    <Label htmlFor="signup-password" className="text-xs xs:text-sm sm:text-base font-semibold text-gray-700">
                      Password
                    </Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="Create a password (min. 6 characters)"
                      className="h-10 xs:h-12 sm:h-14 touch-target border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg xs:rounded-xl text-xs xs:text-sm sm:text-base transition-all duration-200"
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2 xs:space-y-3">
                    <Label htmlFor="role" className="text-xs xs:text-sm sm:text-base font-semibold text-gray-700">
                      Role
                    </Label>
                    <Select name="role" required>
                      <SelectTrigger className="h-10 xs:h-12 sm:h-14 touch-target border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg xs:rounded-xl text-xs xs:text-sm sm:text-base transition-all duration-200">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="faculty">Faculty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {error && (
                    <div className="text-xs xs:text-sm text-red-700 bg-red-50 p-3 xs:p-4 rounded-lg xs:rounded-xl border border-red-200 flex items-center gap-2">
                      <div className="w-1.5 xs:w-2 h-1.5 xs:h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="text-xs xs:text-sm text-green-700 bg-green-50 p-3 xs:p-4 rounded-lg xs:rounded-xl border border-green-200 flex items-center gap-2">
                      <div className="w-1.5 xs:w-2 h-1.5 xs:h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                      {success}
                    </div>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full h-10 xs:h-12 sm:h-14 text-xs xs:text-sm sm:text-base font-semibold touch-target bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg xs:rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-1 xs:mr-2 h-4 xs:h-5 w-4 xs:w-5 animate-spin" />
                        <span className="hidden xs:inline">Creating account...</span>
                        <span className="xs:hidden">Creating...</span>
                      </>
                    ) : (
                      "Create Account"
                    )}
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
