"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Upload, CheckCircle, XCircle, AlertCircle } from "lucide-react"

export default function TestSimpleUploadPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<any>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      })
      return
    }

    if (!user?.id) {
      toast({
        title: "Not authenticated",
        description: "Please log in first",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setUploadStatus(null)

    try {
      console.log("🚀 Starting upload process...")
      console.log("📁 File details:", {
        name: file.name,
        size: file.size,
        type: file.type
      })
      console.log("👤 User ID:", user.id)

      const supabase = createClient()
      
      // Step 1: Test authentication
      console.log("🔐 Testing authentication...")
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        throw new Error(`Authentication failed: ${authError?.message || 'No user'}`)
      }
      console.log("✅ Authentication successful")

      // Step 2: Test storage bucket access
      console.log("🪣 Testing storage bucket...")
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
      if (bucketsError) {
        throw new Error(`Bucket access failed: ${bucketsError.message}`)
      }
      
      const avatarsBucket = buckets?.find(b => b.id === 'avatars')
      if (!avatarsBucket) {
        throw new Error("Avatars bucket not found")
      }
      console.log("✅ Storage bucket accessible")

      // Step 3: Create unique filename
      const fileExt = file.name.split('.').pop()?.toLowerCase()
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 8)
      const fileName = `${user.id}-${timestamp}-${randomId}.${fileExt}`
      const filePath = `avatars/${fileName}`
      
      console.log("📝 Upload details:", {
        fileName,
        filePath,
        fileSize: file.size,
        fileType: file.type
      })

      // Step 4: Upload file
      console.log("⬆️ Uploading file to storage...")
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }
      console.log("✅ File uploaded successfully:", uploadData.path)

      // Step 5: Get public URL
      console.log("🔗 Getting public URL...")
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)
      
      const publicUrl = urlData.publicUrl
      console.log("✅ Public URL:", publicUrl)

      // Step 6: Update profile
      console.log("👤 Updating profile...")
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) {
        throw new Error(`Profile update failed: ${updateError.message}`)
      }
      console.log("✅ Profile updated successfully")

      // Success!
      setUploadStatus({
        success: true,
        message: "Upload completed successfully!",
        url: publicUrl,
        steps: [
          { step: "Authentication", status: "success" },
          { step: "Storage Access", status: "success" },
          { step: "File Upload", status: "success" },
          { step: "URL Generation", status: "success" },
          { step: "Profile Update", status: "success" }
        ]
      })

      toast({
        title: "Success!",
        description: "Profile photo uploaded successfully!",
      })

    } catch (error) {
      console.error("❌ Upload failed:", error)
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      setUploadStatus({
        success: false,
        message: `Upload failed: ${errorMessage}`,
        error: errorMessage,
        steps: [
          { step: "Authentication", status: "error" },
          { step: "Storage Access", status: "error" },
          { step: "File Upload", status: "error" },
          { step: "URL Generation", status: "error" },
          { step: "Profile Update", status: "error" }
        ]
      })

      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-6 w-6" />
              Simple Upload Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Select Image File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={loading}
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Choose a small image file (JPEG, PNG, GIF, WebP) under 5MB
                </p>
              </div>

              {user ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    ✅ Logged in as: {user.name} ({user.email})
                  </p>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">
                    ❌ Not logged in - Please log in first
                  </p>
                </div>
              )}

              {loading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800 flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Uploading... Check browser console for details
                  </p>
                </div>
              )}

              {uploadStatus && (
                <div className={`border rounded-lg p-4 ${
                  uploadStatus.success 
                    ? "bg-green-50 border-green-200" 
                    : "bg-red-50 border-red-200"
                }`}>
                  <h3 className="font-semibold mb-2">
                    {uploadStatus.success ? "✅ Upload Successful" : "❌ Upload Failed"}
                  </h3>
                  <p className="text-sm mb-3">{uploadStatus.message}</p>
                  
                  {uploadStatus.url && (
                    <div className="mb-3">
                      <p className="text-sm font-medium">Image URL:</p>
                      <p className="text-xs text-gray-600 break-all">{uploadStatus.url}</p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-sm font-medium">Upload Steps:</p>
                    {uploadStatus.steps?.map((step: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        {getStatusIcon(step.status)}
                        <span>{step.step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <h4 className="font-medium text-yellow-900 mb-2">Debug Instructions:</h4>
                <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                  <li>Open browser console (F12)</li>
                  <li>Select a small image file</li>
                  <li>Watch the console for detailed upload steps</li>
                  <li>Check which step fails (if any)</li>
                  <li>Report any error messages you see</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
