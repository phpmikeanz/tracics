"use client"

import { PhotoUploadTest } from "@/components/profile/photo-upload-test"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Camera } from "lucide-react"
import Link from "next/link"

export default function TestPhotoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Profile Photo Test
            </h1>
            <p className="text-gray-600">
              Upload and test your profile photo here
            </p>
          </div>
        </div>

        {/* Test Component */}
        <div className="flex justify-center">
          <PhotoUploadTest />
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              How to Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Step 1: Check Database Setup</h4>
              <p className="text-sm text-gray-600">
                Make sure you've run the profile photo setup script:
              </p>
              <code className="block p-2 bg-gray-100 rounded text-sm">
                \i scripts/setup-profile-photos.sql
              </code>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Step 2: Upload a Photo</h4>
              <p className="text-sm text-gray-600">
                Click "Upload Photo" and select an image file from your device.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Step 3: Check the Avatar</h4>
              <p className="text-sm text-gray-600">
                The avatar should now show your uploaded photo instead of just initials.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Step 4: Test in Navigation</h4>
              <p className="text-sm text-gray-600">
                Go back to your main navigation and check if the avatar shows your photo.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Troubleshooting</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Make sure the "avatars" bucket exists in Supabase Storage</li>
                <li>• Check if RLS policies are set up correctly</li>
                <li>• Verify the file upload was successful</li>
                <li>• Check the browser console for any errors</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
