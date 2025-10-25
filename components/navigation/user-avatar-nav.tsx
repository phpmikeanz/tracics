"use client"

import { ClickableAvatar, ClickableAvatarWithLogout } from "@/components/profile/clickable-avatar"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

export function UserAvatarNav() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await signOut()
      router.push("/auth/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  if (!user) {
    return null
  }

  return (
    <ClickableAvatarWithLogout 
      size="md"
      onLogout={handleLogout}
      className="ml-auto"
    />
  )
}

// Alternative: Simple avatar without logout
export function UserAvatarSimple() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <ClickableAvatar 
      size="md"
      showName={true}
      className="ml-auto"
    />
  )
}

// Alternative: Avatar only (no name)
export function UserAvatarOnly() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <ClickableAvatar 
      size="sm"
      showName={false}
      className="ml-auto"
    />
  )
}
