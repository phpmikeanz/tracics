"use client"

import { useState, useEffect, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"
import { Camera, Upload, ExternalLink, Trash2, Key } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Swal from 'sweetalert2'

interface SimpleClickableAvatarProps {
  size?: "sm" | "md" | "lg"
  showName?: boolean
  className?: string
}

export function SimpleClickableAvatar({ 
  size = "md", 
  showName = true, 
  className = "" 
}: SimpleClickableAvatarProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [showDialog, setShowDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState("")
  const [isDragOver, setIsDragOver] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load current avatar URL
  const loadAvatarUrl = async () => {
    if (!user?.id) {
      console.log("[SimpleClickableAvatar] No user ID, skipping avatar load")
      return
    }
    
    console.log("[SimpleClickableAvatar] Loading avatar for user:", user.id)
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single()
      
      if (error) {
        console.error("[SimpleClickableAvatar] Error loading avatar URL:", error)
        return
      }
      
      console.log("[SimpleClickableAvatar] Avatar URL loaded:", data.avatar_url)
      setAvatarUrl(data.avatar_url)
    } catch (error) {
      console.error("[SimpleClickableAvatar] Error in loadAvatarUrl:", error)
    }
  }

  // Load avatar on component mount
  useEffect(() => {
    if (user?.id) {
      loadAvatarUrl()
    }
  }, [user?.id])

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10", 
    lg: "h-12 w-12"
  }

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  }

  const handleAvatarClick = () => {
    setShowDialog(true)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    // Handle multiple files (take the first one)
    const file = files[0]
    await handleDeviceUpload(file)
    
    // Clear the file input so the same file can be selected again
    if (event.target) {
      event.target.value = ''
    }
  }

  // Function to handle file selection from various sources
  const handleFileSelection = async (file: File) => {
    await handleDeviceUpload(file)
  }

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return

    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlInput.trim() })
        .eq('id', user.id)
      
      if (updateError) {
        console.error("Error updating profile:", updateError)
        toast({
          title: "Error",
          description: updateError.message,
          variant: "destructive",
        })
        return
      }
      
      setAvatarUrl(urlInput.trim())
      toast({
        title: "Success",
        description: "Profile photo updated successfully!",
      })
      setShowDialog(false)
      setUrlInput("")
      
    } catch (error) {
      console.error("Error in handleUrlSubmit:", error)
      toast({
        title: "Error",
        description: "Failed to update photo",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id)
      
      if (updateError) {
        console.error("Error updating profile:", updateError)
        toast({
          title: "Error",
          description: updateError.message,
          variant: "destructive",
        })
        return
      }
      
      setAvatarUrl(null)
      toast({
        title: "Success",
        description: "Profile photo deleted successfully!",
      })
      setShowDialog(false)
      
    } catch (error) {
      console.error("Error in handleDelete:", error)
      toast({
        title: "Error",
        description: "Failed to delete photo",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "User email not found",
        variant: "destructive",
      })
      return
    }

    if (!currentPassword.trim()) {
      await Swal.fire({
        title: 'Error!',
        text: 'Please enter your current password',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#ef4444'
      })
      return
    }

    if (!newPassword.trim()) {
      await Swal.fire({
        title: 'Error!',
        text: 'Please enter a new password',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#ef4444'
      })
      return
    }

    if (newPassword.length < 6) {
      await Swal.fire({
        title: 'Error!',
        text: 'New password must be at least 6 characters',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#ef4444'
      })
      return
    }

    if (newPassword !== confirmPassword) {
      await Swal.fire({
        title: 'Error!',
        text: 'New passwords do not match',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#ef4444'
      })
      return
    }

    setPasswordLoading(true)

    try {
      const supabase = createClient()
      
      // First verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      })

      if (signInError) {
        await Swal.fire({
          title: 'Error!',
          text: 'Current password is incorrect',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#ef4444'
        })
        return
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        await Swal.fire({
          title: 'Error!',
          text: updateError.message || 'Failed to update password',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#ef4444'
        })
        return
      }

      // Show SweetAlert success notification
      await Swal.fire({
        title: 'Success!',
        text: 'Your password has been changed successfully!',
        icon: 'success',
        confirmButtonText: 'Great!',
        confirmButtonColor: '#10b981',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: true,
        allowOutsideClick: false,
        allowEscapeKey: false
      })

      // Reset form
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setShowChangePassword(false)
      
    } catch (error) {
      console.error("Error changing password:", error)
      await Swal.fire({
        title: 'Error!',
        text: 'Failed to change password. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#ef4444'
      })
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleUploadClick = () => {
    console.log("[SimpleClickableAvatar] Upload button clicked")
    if (fileInputRef.current) {
      console.log("[SimpleClickableAvatar] Triggering file input")
      fileInputRef.current.click()
    } else {
      console.error("[SimpleClickableAvatar] File input ref is null")
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      await handleFileSelection(file)
    }
  }

  // Utility function to validate file
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: "Please select a valid image file (JPEG, PNG, GIF, or WebP)" }
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return { valid: false, error: "Image file size must be less than 5MB" }
    }

    return { valid: true }
  }

  // Enhanced device upload function
  const handleDeviceUpload = async (file: File) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      })
      return { success: false, error: "User not authenticated" }
    }

    // Enhanced file validation using utility function
    const validation = validateFile(file)
    if (!validation.valid) {
      toast({
        title: "Error",
        description: validation.error,
        variant: "destructive",
      })
      return { success: false, error: validation.error }
    }

    setLoading(true)

    try {
      const supabase = createClient()
      
      // Create a unique filename with better naming
      const fileExt = file.name.split('.').pop()?.toLowerCase()
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 8)
      const fileName = `${user.id}-${timestamp}-${randomId}.${fileExt}`
      const filePath = `avatars/${fileName}`
      
      // Upload file to Supabase Storage with better options
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        })
      
      if (error) {
        console.error("Error uploading file:", error)
        const errorMsg = error.message || "Failed to upload file"
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        })
        return { success: false, error: errorMsg }
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
        .eq('id', user.id)
      
      if (updateError) {
        console.error("Error updating profile:", updateError)
        const errorMsg = updateError.message || "Failed to update profile"
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        })
        return { success: false, error: errorMsg }
      }
      
      setAvatarUrl(publicUrl)
      toast({
        title: "Success",
        description: "Profile photo uploaded successfully!",
      })
      setShowDialog(false)
      
      return { success: true, url: publicUrl }
      
    } catch (error) {
      console.error("Error in handleDeviceUpload:", error)
      const errorMsg = "Failed to upload photo"
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      })
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }

  const getInitials = () => {
    const fullName = user?.full_name || user?.name
    if (fullName) {
      return fullName
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return "U"
  }

  const getDisplayAvatar = () => {
    if (avatarUrl) {
      return avatarUrl
    }
    const fullName = user?.full_name || user?.name || 'User'
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random&color=fff&size=128`
  }

  return (
    <>
      {/* Clickable Avatar */}
      <div 
        className={`flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity ${className}`}
        onClick={handleAvatarClick}
      >
        <div className="relative">
          <Avatar className={sizeClasses[size]}>
            <AvatarImage 
              src={getDisplayAvatar()} 
              alt="Profile photo"
              className="object-cover"
            />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          
          {/* Camera icon overlay */}
          <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1">
            <Camera className="h-3 w-3" />
          </div>
          
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
            </div>
          )}
        </div>
        
        {showName && (
          <span className={`font-medium ${textSizeClasses[size]}`}>
            {user?.full_name || user?.name || "User"}
          </span>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileUpload}
        className="hidden"
        multiple={false}
      />

      {/* Photo Update Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Update Profile Photo
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Current Avatar Preview */}
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-20 w-20">
                <AvatarImage 
                  src={getDisplayAvatar()} 
                  alt="Current profile photo"
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Upload Options */}
            <div className="space-y-4">
              {/* Upload from device with drag and drop */}
              <div className="space-y-2">
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragOver 
                      ? "border-primary bg-primary/5" 
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drag and drop an image here, or
                  </p>
                  <Button
                    onClick={handleUploadClick}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {loading ? "Uploading..." : "Choose File"}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    Supports JPEG, PNG, GIF, WebP (max 5MB)
                  </p>
                </div>
              </div>

              {/* Upload from URL */}
              <div className="space-y-2">
                <Label htmlFor="photo-url">Or enter image URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="photo-url"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    disabled={loading}
                  />
                  <Button
                    onClick={handleUrlSubmit}
                    disabled={!urlInput.trim() || loading}
                    size="sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Delete option */}
              {avatarUrl && (
                <Button
                  onClick={handleDelete}
                  disabled={loading}
                  variant="destructive"
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Photo
                </Button>
              )}

              {/* Change Password option */}
              <div className="border-t pt-4">
                <Button
                  onClick={() => setShowChangePassword(true)}
                  variant="outline"
                  className="w-full"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>Supported formats: JPEG, PNG, GIF, WebP</p>
              <p>Maximum size: 5MB</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Change Password
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="Enter your current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={passwordLoading}
              />
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter your new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={passwordLoading}
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={passwordLoading}
              />
            </div>

            {/* Password Requirements */}
            <div className="text-xs text-gray-500 space-y-1">
              <p>Password requirements:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>At least 6 characters long</li>
                <li>Must match confirmation</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => setShowChangePassword(false)}
                variant="outline"
                className="flex-1"
                disabled={passwordLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={passwordLoading || !currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()}
                className="flex-1"
              >
                {passwordLoading ? "Changing..." : "Change Password"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
