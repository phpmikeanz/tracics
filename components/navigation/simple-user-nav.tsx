"use client"

import { SimpleClickableAvatar } from "@/components/profile/simple-clickable-avatar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

export function SimpleUserNav() {
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
    <div className="flex items-center gap-2 sm:gap-3">
      {/* Clickable Avatar with Name - Hidden on mobile */}
      <div className="hidden sm:block">
        <SimpleClickableAvatar 
          size="md" 
          showName={true}
          className="hover:bg-gray-50 p-2 rounded-md touch-target"
        />
      </div>
      
      {/* Mobile: Avatar only */}
      <div className="sm:hidden">
        <SimpleClickableAvatar 
          size="sm" 
          showName={false}
          className="hover:bg-gray-50 p-2 rounded-md touch-target"
        />
      </div>
      
      {/* Logout Button */}
      <Button
        onClick={handleLogout}
        variant="ghost"
        size="sm"
        className="text-gray-600 hover:text-gray-900 touch-target"
      >
        <span className="mr-1 hidden sm:inline">[→]</span>
        <span className="sm:hidden">[→]</span>
        <span className="hidden sm:inline">Logout</span>
      </Button>
    </div>
  )
}

// Alternative: Just the avatar without logout button
export function SimpleUserAvatar() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <SimpleClickableAvatar 
      size="md" 
      showName={true}
      className="hover:bg-gray-50 p-2 rounded-md"
    />
  )
}

// Alternative: Avatar only (no name)
export function SimpleUserAvatarOnly() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <SimpleClickableAvatar 
      size="sm" 
      showName={false}
      className="hover:bg-gray-50 p-2 rounded-md"
    />
  )
}
