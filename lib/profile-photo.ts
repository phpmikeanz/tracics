import { createClient } from "@/lib/supabase/client"

/**
 * Profile Photo Management
 * Handles uploading, updating, and managing user profile photos
 */

export interface ProfilePhoto {
  id: string
  user_id: string
  avatar_url: string
  created_at: string
  updated_at: string
}

/**
 * Upload profile photo to Supabase Storage
 */
export async function uploadProfilePhoto(
  userId: string,
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = createClient()
    
    // Create a unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`
    
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) {
      console.error("Error uploading profile photo:", error)
      return { success: false, error: error.message }
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)
    
    const publicUrl = urlData.publicUrl
    
    // Update profile with new avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId)
    
    if (updateError) {
      console.error("Error updating profile with avatar URL:", updateError)
      return { success: false, error: updateError.message }
    }
    
    console.log("✅ Profile photo uploaded successfully:", publicUrl)
    return { success: true, url: publicUrl }
    
  } catch (error) {
    console.error("Error in uploadProfilePhoto:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Update profile photo URL
 */
export async function updateProfilePhotoUrl(
  userId: string,
  avatarUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId)
    
    if (error) {
      console.error("Error updating profile photo URL:", error)
      return { success: false, error: error.message }
    }
    
    console.log("✅ Profile photo URL updated successfully")
    return { success: true }
    
  } catch (error) {
    console.error("Error in updateProfilePhotoUrl:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete profile photo
 */
export async function deleteProfilePhoto(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // Get current avatar URL
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single()
    
    if (fetchError) {
      console.error("Error fetching profile:", fetchError)
      return { success: false, error: fetchError.message }
    }
    
    if (profile.avatar_url) {
      // Extract file path from URL
      const url = new URL(profile.avatar_url)
      const filePath = url.pathname.split('/').slice(-2).join('/') // Get 'avatars/filename'
      
      // Delete file from storage
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([filePath])
      
      if (deleteError) {
        console.error("Error deleting file from storage:", deleteError)
        // Continue with profile update even if storage deletion fails
      }
    }
    
    // Update profile to remove avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', userId)
    
    if (updateError) {
      console.error("Error removing avatar URL from profile:", updateError)
      return { success: false, error: updateError.message }
    }
    
    console.log("✅ Profile photo deleted successfully")
    return { success: true }
    
  } catch (error) {
    console.error("Error in deleteProfilePhoto:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Get profile photo URL
 */
export async function getProfilePhotoUrl(
  userId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error("Error fetching profile photo URL:", error)
      return { success: false, error: error.message }
    }
    
    return { success: true, url: data.avatar_url }
    
  } catch (error) {
    console.error("Error in getProfilePhotoUrl:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Get all profile photos (for admin purposes)
 */
export async function getAllProfilePhotos(): Promise<{ success: boolean; photos: ProfilePhoto[]; error?: string }> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, avatar_url, created_at, updated_at')
      .not('avatar_url', 'is', null)
      .order('updated_at', { ascending: false })
    
    if (error) {
      console.error("Error fetching profile photos:", error)
      return { success: false, photos: [], error: error.message }
    }
    
    const photos: ProfilePhoto[] = data.map(profile => ({
      id: profile.id,
      user_id: profile.id,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    }))
    
    return { success: true, photos }
    
  } catch (error) {
    console.error("Error in getAllProfilePhotos:", error)
    return { success: false, photos: [], error: error.message }
  }
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Please select a valid image file (JPEG, PNG, GIF, or WebP)' }
  }
  
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024 // 5MB in bytes
  if (file.size > maxSize) {
    return { valid: false, error: 'Image file size must be less than 5MB' }
  }
  
  // Check dimensions (optional - you can add this if needed)
  // This would require creating an Image object and checking dimensions
  
  return { valid: true }
}

/**
 * Generate avatar URL with fallback
 */
export function getAvatarUrl(avatarUrl: string | null, fallbackUrl?: string): string {
  if (avatarUrl) {
    return avatarUrl
  }
  
  // Default fallback avatar
  const defaultAvatar = fallbackUrl || `https://ui-avatars.com/api/?name=User&background=random&color=fff&size=128`
  return defaultAvatar
}

/**
 * Generate initials from name
 */
export function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
