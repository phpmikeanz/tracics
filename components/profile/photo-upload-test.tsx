"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"
import { Upload, Camera, User } from "lucide-react"

export function PhotoUploadTest() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  // Load current avatar URL
  const loadAvatarUrl = async () => {
    if (!user?.id) return
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single()
      
      if (error) {
        console.error("Error loading avatar URL:", error)
        return
      }
      
      setAvatarUrl(data.avatar_url)
    } catch (error) {
      console.error("Error in loadAvatarUrl:", error)
    }
  }

  // Load avatar on component mount
  useState(() => {
    loadAvatarUrl()
  })

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      })
      return
    }

    // Validate file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Please select a valid image file (JPEG, PNG, GIF, or WebP)",
        variant: "destructive",
      })
      return
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast({
        title: "Error",
        description: "Image file size must be less than 5MB",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      
      // Create a unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`
      
      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) {
        console.error("Error uploading file:", error)
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        })
        return
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
        toast({
          title: "Error",
          description: updateError.message,
          variant: "destructive",
        })
        return
      }
      
      setAvatarUrl(publicUrl)
      toast({
        title: "Success",
        description: "Profile photo uploaded successfully!",
      })
      
    } catch (error) {
      console.error("Error in handleFileUpload:", error)
      toast({
        title: "Error",
        description: "Failed to upload photo",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getInitials = () => {
    if (user?.full_name) {
      return user.full_name
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
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=random&color=fff&size=128`
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Profile Photo Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Avatar Display */}
        <div className="flex flex-col items-center space-y-4">
          <Avatar className="h-20 w-20">
            <AvatarImage 
              src={getDisplayAvatar()} 
              alt="Profile photo"
              className="object-cover"
            />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {avatarUrl ? "Photo uploaded" : "No photo uploaded"}
            </p>
            {avatarUrl && (
              <p className="text-xs text-gray-500 break-all">
                {avatarUrl}
              </p>
            )}
          </div>
        </div>

        {/* Upload Button */}
        <div className="space-y-2">
          <Button
            onClick={() => document.getElementById('file-input')?.click()}
            disabled={loading}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {loading ? "Uploading..." : "Upload Photo"}
          </Button>
          
          <input
            id="file-input"
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Debug Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>User ID:</strong> {user?.id}</p>
          <p><strong>Full Name:</strong> {user?.full_name}</p>
          <p><strong>Avatar URL:</strong> {avatarUrl || "None"}</p>
          <p><strong>Display URL:</strong> {getDisplayAvatar()}</p>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500">
          <p>Supported formats: JPEG, PNG, GIF, WebP</p>
          <p>Maximum size: 5MB</p>
        </div>
      </CardContent>
    </Card>
  )
}
