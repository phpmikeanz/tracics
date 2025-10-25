"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useProfilePhoto } from "@/hooks/use-profile-photo"
import { Upload, Camera, Trash2, ExternalLink, User } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface ProfilePhotoUploadProps {
  size?: "sm" | "md" | "lg" | "xl"
  showUploadButton?: boolean
  showDeleteButton?: boolean
  showUrlInput?: boolean
  className?: string
}

export function ProfilePhotoUpload({
  size = "md",
  showUploadButton = true,
  showDeleteButton = true,
  showUrlInput = true,
  className = ""
}: ProfilePhotoUploadProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [urlInput, setUrlInput] = useState("")
  const [showUrlDialog, setShowUrlDialog] = useState(false)
  
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
    md: "h-12 w-12",
    lg: "h-16 w-16",
    xl: "h-24 w-24"
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    clearError()
    const result = await uploadPhoto(file)
    
    if (result.success) {
      toast({
        title: "Success",
        description: "Profile photo uploaded successfully!",
      })
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to upload photo",
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
      setShowUrlDialog(false)
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
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete photo",
        variant: "destructive",
      })
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Avatar Display */}
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
        
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        {showUploadButton && (
          <>
            <Button
              onClick={handleUploadClick}
              disabled={loading}
              size="sm"
              variant="outline"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </>
        )}

        {showUrlInput && (
          <Dialog open={showUrlDialog} onOpenChange={setShowUrlDialog}>
            <DialogTrigger asChild>
              <Button
                disabled={loading}
                size="sm"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                URL
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Profile Photo URL</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="photo-url">Image URL</Label>
                  <Input
                    id="photo-url"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowUrlDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUrlSubmit}
                    disabled={!urlInput.trim() || loading}
                  >
                    Update
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {showDeleteButton && avatarUrl && (
          <Button
            onClick={handleDelete}
            disabled={loading}
            size="sm"
            variant="destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        )}
      </div>

      {/* Upload Instructions */}
      <div className="text-xs text-gray-500 text-center max-w-xs">
        <p>Supported formats: JPEG, PNG, GIF, WebP</p>
        <p>Maximum size: 5MB</p>
      </div>
    </div>
  )
}

// Simple Avatar Display Component
export function ProfileAvatar({ 
  userId, 
  size = "md", 
  className = "" 
}: { 
  userId: string
  size?: "sm" | "md" | "lg" | "xl"
  className?: string 
}) {
  const { getDisplayAvatar, getUserInitials } = useProfilePhoto()
  
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
    xl: "h-24 w-24"
  }

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      <AvatarImage 
        src={getDisplayAvatar()} 
        alt="Profile photo"
        className="object-cover"
      />
      <AvatarFallback className="bg-primary text-primary-foreground">
        {getUserInitials()}
      </AvatarFallback>
    </Avatar>
  )
}

// Profile Photo Card Component
export function ProfilePhotoCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Profile Photo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ProfilePhotoUpload 
          size="xl"
          showUploadButton={true}
          showDeleteButton={true}
          showUrlInput={true}
        />
      </CardContent>
    </Card>
  )
}
