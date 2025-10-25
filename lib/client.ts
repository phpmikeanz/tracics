import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hdogujyfbjvvewwotman.supabase.co"
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhkb2d1anlmYmp2dmV3d290bWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDYyNTksImV4cCI6MjA3Mjg4MjI1OX0.dJBQAU0eHSr1hThSC1eZPpIJwzlqRm7LUfB-p4qepAo"

  // Validate that we have valid values
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[v0] Missing Supabase configuration")
    throw new Error("Missing Supabase environment variables. Please check your environment configuration.")
  }

  try {
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    console.error("[v0] Failed to create Supabase client:", error)
    throw error
  }
}
