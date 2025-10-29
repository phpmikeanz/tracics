"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createClient } from "@/lib/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export interface User {
  id: string
  name: string
  email: string
  role: "student" | "faculty"
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  signOut: () => Promise<void>
  signup: (name: string, email: string, password: string, role: "student" | "faculty") => Promise<boolean>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  console.log("[Auth] AuthProvider component rendered")
  
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  console.log("[Auth] State initialized - loading:", loading)
  
  let supabase
  try {
    supabase = createClient()
    console.log("[Auth] Supabase client created successfully")
  } catch (error) {
    console.error("[Auth] Error creating Supabase client:", error)
    setLoading(false)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Configuration Error</h2>
          <p className="text-gray-600 mb-4">Missing Supabase environment variables</p>
          <p className="text-sm text-gray-500">
            Please check your environment configuration and try again.
          </p>
        </div>
      </div>
    )
  }


  useEffect(() => {
    console.log("[Auth] Main auth useEffect running...")
    
    const initAuth = async () => {
      try {
        console.log("[Auth] Getting initial session...")
        
        const {
          data: { session },
          error
        } = await supabase.auth.getSession()
        
        if (error) {
          console.error("[Auth] Error getting session:", error)
          setLoading(false)
          return
        }
        
        if (session?.user) {
          console.log("[Auth] Session found, user logged in")
          // Fetch user profile to get the correct role
          await fetchUserProfile(session.user)
        } else {
          console.log("[Auth] No session found, user not logged in")
          setUser(null)
          setLoading(false) // Immediately stop loading if no session
        }
      } catch (error) {
        console.error("[Auth] Error in initAuth:", error)
        setLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    console.log("[Auth] Setting up auth state listener...")
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[Auth] Auth state changed:", event, "Session exists:", !!session)
      
      try {
        if (session?.user) {
          console.log("[Auth] User authenticated, fetching profile...")
          // Fetch user profile to get the correct role
          await fetchUserProfile(session.user)
        } else {
          console.log("[Auth] No session, user logged out")
          setUser(null)
        }
      } catch (error) {
        console.error("[Auth] Error handling auth state change:", error)
        setUser(null)
      } finally {
        console.log("[Auth] Setting loading to false after auth state change")
        setLoading(false)
      }
    })

    return () => {
      console.log("[Auth] Cleaning up auth subscription")
      subscription.unsubscribe()
    }
  }, [])

  // Helper function to create profile from auth data (async, non-blocking)
  const createProfileFromAuth = async (authUser: SupabaseUser) => {
    try {
      const userMetadata = authUser.user_metadata || {}
      const role = userMetadata.role || "student"
      const fullName = userMetadata.full_name || authUser.email?.split("@")[0] || "User"
      
      const { error } = await supabase.from("profiles").upsert({
        id: authUser.id,
        email: authUser.email || "",
        full_name: fullName,
        role: role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      
      if (error) {
        console.warn("[Auth] Failed to create/update profile:", error)
      } else {
        console.log("[Auth] Profile created/updated successfully")
      }
    } catch (error) {
      console.warn("[Auth] Exception creating profile:", error)
    }
  }

  const fetchUserProfile = async (authUser: SupabaseUser) => {
    try {
      console.log("[Auth] Fetching profile for user:", authUser.id)
      
      // Try direct profile fetch first with shorter timeout
      const profilePromise = supabase.from("profiles").select("*").eq("id", authUser.id).single()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Profile fetch timeout")), 5000) // Reduced to 5 seconds
      )
      
      const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]) as any

      if (error) {
        console.error("[Auth] Error fetching user profile:", error)
        console.error("[Auth] Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        
        // Check if it's a timeout or RLS issue
        if (error.message.includes("timeout")) {
          console.warn("[Auth] Profile fetch timed out, using auth metadata")
        } else if (error.code === '42501' || error.message.includes('policy')) {
          console.warn("[Auth] RLS policy blocking profile access, using auth metadata")
        } else {
          console.warn("[Auth] Profile not found, using auth metadata")
        }
        
        // Try to create profile from auth metadata if it doesn't exist
        const userMetadata = authUser.user_metadata || {}
        const role = userMetadata.role || "student"
        const fullName = userMetadata.full_name || authUser.email?.split("@")[0] || "User"
        
        console.log("[Auth] Creating user with role from metadata:", role)
        setUser({
          id: authUser.id,
          name: fullName,
          email: authUser.email || "",
          role: role as "student" | "faculty",
          avatar: undefined,
        })
        setLoading(false) // Stop loading immediately after setting user
        
        // Try to create the profile in the database asynchronously (don't wait)
        createProfileFromAuth(authUser).catch(err => 
          console.warn("[Auth] Failed to create profile in database:", err)
        )
        return
      }

      if (profile) {
        console.log("[Auth] Profile found with role:", profile.role)
        setUser({
          id: profile.id,
          name: profile.full_name || authUser.email?.split("@")[0] || "User",
          email: profile.email || authUser.email || "",
          role: profile.role || "student",
          avatar: profile.avatar_url,
        })
        setLoading(false) // Stop loading immediately after setting user
      } else {
        console.log("[Auth] No profile data returned, using default")
        // Fallback when no profile data
        setUser({
          id: authUser.id,
          name: authUser.email?.split("@")[0] || "User",
          email: authUser.email || "",
          role: "student",
          avatar: undefined,
        })
        setLoading(false) // Stop loading immediately after setting user
      }
    } catch (error) {
      console.error("[Auth] Exception while fetching user profile:", error)
      // Fallback to basic user object from auth data with role from metadata
      const userMetadata = authUser.user_metadata || {}
      const role = userMetadata.role || "student"
      
      console.log("[Auth] Using fallback with metadata role:", role)
      setUser({
        id: authUser.id,
        name: authUser.email?.split("@")[0] || "User",
        email: authUser.email || "",
        role: role as "student" | "faculty",
        avatar: undefined,
      })
      setLoading(false) // Stop loading immediately after setting user
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log("[Auth] Starting login for:", email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("[Auth] Login error:", error.message)
        console.error("[Auth] Full error:", error)
        return false
      }

      if (data.user) {
        console.log("[Auth] Login successful, user:", data.user.id)
        console.log("[Auth] User metadata:", data.user.user_metadata)
        
        // Immediately set a basic user from auth data while we fetch the profile
        const userMetadata = data.user.user_metadata || {}
        const role = userMetadata.role || "student"
        const fullName = userMetadata.full_name || data.user.email?.split("@")[0] || "User"
        
        console.log("[Auth] Setting temporary user with role:", role)
        setUser({
          id: data.user.id,
          name: fullName,
          email: data.user.email || "",
          role: role as "student" | "faculty",
          avatar: undefined,
        })
        
        // Force fetch the profile to update with complete data
        // Don't await - let it complete in background
        fetchUserProfile(data.user).then(() => {
          console.log("[Auth] Profile fetch completed")
        }).catch((err) => {
          console.error("[Auth] Profile fetch failed, using auth data:", err)
        })
        
        return true
      }

      console.log("[Auth] Login failed: no user returned")
      return false
    } catch (error) {
      console.error("[Auth] Login exception:", error)
      return false
    }
  }

  const logout = async () => {
    try {
      console.log("[Auth] Logging out user...")
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error("[Auth] SignOut error:", error)
        throw error
      }
      setUser(null)
      console.log("[Auth] Logout successful")
    } catch (error) {
      console.error("[Auth] Logout error:", error)
      throw error
    }
  }

  const signOut = logout // Alias for signOut

  const signup = async (
    name: string,
    email: string,
    password: string,
    role: "student" | "faculty",
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: role,
          },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error("Signup error:", error.message)
        return false
      }

      return !!data.user
    } catch (error) {
      console.error("Signup error:", error)
      return false
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        signOut,
        signup,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
