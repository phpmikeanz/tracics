import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables:")
    console.error("- NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✓ Set" : "✗ Missing")
    console.error("- NEXT_PUBLIC_SUPABASE_ANON_KEY:", supabaseAnonKey ? "✓ Set" : "✗ Missing")
    console.error("Please add these environment variables to your Vercel deployment.")
    throw new Error("Missing Supabase environment variables. Please check your environment configuration.")
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
