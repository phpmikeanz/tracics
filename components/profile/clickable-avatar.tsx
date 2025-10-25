"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useProfilePhoto } from "@/hooks/use-profile-photo"
import { Camera, Upload, ExternalLink, Trash2, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ClickableAvatarProps {
  size?: "sm" | "md" | "lg"
  showName?: boolean
  className?: string
}

export function ClickableAvatar({ 
  size = "md", 
  showName = true, 
  className = "" 
}: ClickableAvatarProps) {
  const { toast } = useToast()
  const [showDialog, setShowDialog] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const fileInputRef = useState<HTMLInputElement | null>(null)[0]
  
  const {
    avatarUrl,
    loading,
    error,
    uploadPhoto,
    updatePhotoUrl,
    deletePhoto,
    getDisplayAvatar,
    getUserInitials,
    clearError
  } = useProfilePhoto()

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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    clearError()
    const result = await uploadPhoto(file)
    
    if (result.success) {
      toast({
        title: "Success",
        description: "Profile photo updated successfully!",
      })
      setShowDialog(false)
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update photo",
        variant: "destructive",
      })
    }
  }

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return

    clearError()
    const result = await updatePhotoUrl(urlInput.trim())
    
    if (result.success) {
      toast({
        title: "Success",
        description: "Profile photo updated successfully!",
      })
      setShowDialog(false)
      setUrlInput("")
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update photo",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    clearError()
    const result = await deletePhoto()
    
    if (result.success) {
      toast({
        title: "Success",
        description: "Profile photo deleted successfully!",
      })
      setShowDialog(false)
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete photo",
        variant: "destructive",
      })
    }
  }

  const handleUploadClick = () => {
    fileInputRef?.click()
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
              {getUserInitials()}
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
            mrgohan208
          </span>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
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
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md text-center">
                  {error}
                </div>
              )}
            </div>

            {/* Upload Options */}
            <div className="space-y-4">
              {/* Upload from device */}
              <div className="space-y-2">
                <Button
                  onClick={handleUploadClick}
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload from Device
                </Button>
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
            </div>

            {/* Instructions */}
            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>Supported formats: JPEG, PNG, GIF, WebP</p>
              <p>Maximum size: 5MB</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Simple clickable avatar without name
export function ClickableAvatarOnly({ 
  size = "md", 
  className = "" 
}: { 
  size?: "sm" | "md" | "lg"
  className?: string 
}) {
  return (
    <ClickableAvatar 
      size={size} 
      showName={false} 
      className={className} 
    />
  )
}

// Avatar with logout functionality
export function ClickableAvatarWithLogout({ 
  size = "md", 
  className = "",
  onLogout
}: { 
  size?: "sm" | "md" | "lg"
  className?: string
  onLogout?: () => void
}) {
  const { toast } = useToast()

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout()
    } else {
      // Default logout behavior
      toast({
        title: "Logout",
        description: "Logout functionality not implemented",
      })
    }
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <ClickableAvatar size={size} showName={true} />
      <Button
        onClick={handleLogout}
        variant="ghost"
        size="sm"
        className="text-gray-600 hover:text-gray-900"
      >
        <span className="mr-1">[→]</span>
        Logout
      </Button>
    </div>
  )
}
