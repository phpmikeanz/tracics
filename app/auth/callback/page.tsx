"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Auth callback error:", error)
          setStatus("error")
          setMessage("Authentication failed. Please try again.")
          setTimeout(() => router.push("/auth/login"), 3000)
          return
        }

        if (data.session) {
          setStatus("success")
          setMessage("Email verified successfully! Redirecting to dashboard...")
          setTimeout(() => router.push("/dashboard"), 2000)
        } else {
          setStatus("error")
          setMessage("No valid session found. Please try signing up again.")
          setTimeout(() => router.push("/auth/signup"), 3000)
        }
      } catch (error) {
        console.error("Auth callback exception:", error)
        setStatus("error")
        setMessage("An unexpected error occurred. Please try again.")
        setTimeout(() => router.push("/auth/login"), 3000)
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {status === "loading" && "Verifying Email..."}
            {status === "success" && "Email Verified!"}
            {status === "error" && "Verification Failed"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Please wait while we verify your email address."}
            {status === "success" && "Your account has been successfully verified."}
            {status === "error" && "There was a problem verifying your email."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex justify-center mb-4">
            {status === "loading" && <Loader2 className="h-12 w-12 animate-spin text-blue-600" />}
            {status === "success" && <CheckCircle className="h-12 w-12 text-green-600" />}
            {status === "error" && <XCircle className="h-12 w-12 text-red-600" />}
          </div>
          <p className="text-sm text-gray-600">{message}</p>
        </CardContent>
      </Card>
    </div>
  )
}
