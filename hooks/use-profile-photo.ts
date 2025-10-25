import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { 
  uploadProfilePhoto, 
  updateProfilePhotoUrl, 
  deleteProfilePhoto, 
  getProfilePhotoUrl,
  validateImageFile,
  getAvatarUrl,
  getInitials
} from "@/lib/profile-photo"

export function useProfilePhoto() {
  const { user } = useAuth()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load current avatar URL
  useEffect(() => {
    if (user?.id) {
      loadAvatarUrl()
    }
  }, [user?.id])

  const loadAvatarUrl = async () => {
    if (!user?.id) return
    
    try {
      const result = await getProfilePhotoUrl(user.id)
      if (result.success) {
        setAvatarUrl(result.url || null)
      }
    } catch (error) {
      console.error("Error loading avatar URL:", error)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!user?.id) {
      setError("User not authenticated")
      return { success: false, error: "User not authenticated" }
    }

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setError(validation.error || "Invalid file")
      return { success: false, error: validation.error }
    }

    setLoading(true)
    setError(null)

    try {
      const result = await uploadProfilePhoto(user.id, file)
      
      if (result.success && result.url) {
        setAvatarUrl(result.url)
        return { success: true, url: result.url }
      } else {
        setError(result.error || "Upload failed")
        return { success: false, error: result.error }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const handleUrlUpdate = async (url: string) => {
    if (!user?.id) {
      setError("User not authenticated")
      return { success: false, error: "User not authenticated" }
    }

    setLoading(true)
    setError(null)

    try {
      const result = await updateProfilePhotoUrl(user.id, url)
      
      if (result.success) {
        setAvatarUrl(url)
        return { success: true }
      } else {
        setError(result.error || "Update failed")
        return { success: false, error: result.error }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Update failed"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!user?.id) {
      setError("User not authenticated")
      return { success: false, error: "User not authenticated" }
    }

    setLoading(true)
    setError(null)

    try {
      const result = await deleteProfilePhoto(user.id)
      
      if (result.success) {
        setAvatarUrl(null)
        return { success: true }
      } else {
        setError(result.error || "Delete failed")
        return { success: false, error: result.error }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Delete failed"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const refresh = async () => {
    await loadAvatarUrl()
  }

  // Get display avatar URL with fallback
  const getDisplayAvatar = (fallbackUrl?: string) => {
    return getAvatarUrl(avatarUrl, fallbackUrl)
  }

  // Get user initials for fallback
  const getUserInitials = () => {
    if (user?.full_name) {
      return getInitials(user.full_name)
    }
    return "U"
  }

  return {
    avatarUrl,
    loading,
    error,
    uploadPhoto: handleFileUpload,
    updatePhotoUrl: handleUrlUpdate,
    deletePhoto: handleDelete,
    refresh,
    getDisplayAvatar,
    getUserInitials,
    clearError: () => setError(null)
  }
}
