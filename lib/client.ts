import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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
