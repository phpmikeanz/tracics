"use client"

import { SimpleUserNav } from "@/components/navigation/simple-user-nav"
import { SimpleClickableAvatar } from "@/components/profile/simple-clickable-avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, User, Camera } from "lucide-react"
import Link from "next/link"

export default function TestProfilePhotosPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Test Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to App
              </Button>
            </Link>
            <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">LMS</span>
            </div>
            <span className="font-semibold text-lg">Profile Photo Test</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Test the navbar component */}
            <SimpleUserNav />
          </div>
        </div>
      </nav>

      {/* Test Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Profile Photo Test Page
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-sm text-gray-600">
                This page tests the clickable profile photo functionality in the navbar.
                Click on the profile photo in the navbar above to test the upload functionality.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Test different avatar sizes */}
                <div className="space-y-4">
                  <h3 className="font-medium">Different Avatar Sizes</h3>
                  <div className="flex items-center gap-4">
                    <div className="text-sm">Small:</div>
                    <SimpleClickableAvatar size="sm" showName={false} />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm">Medium:</div>
                    <SimpleClickableAvatar size="md" showName={false} />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm">Large:</div>
                    <SimpleClickableAvatar size="lg" showName={false} />
                  </div>
                </div>

                {/* Test with names */}
                <div className="space-y-4">
                  <h3 className="font-medium">With Names</h3>
                  <div className="space-y-2">
                    <SimpleClickableAvatar size="sm" showName={true} />
                    <SimpleClickableAvatar size="md" showName={true} />
                    <SimpleClickableAvatar size="lg" showName={true} />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">How to Test:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Click on any profile photo above</li>
                  <li>A dialog should open with upload options</li>
                  <li>Try uploading an image from your device</li>
                  <li>Try entering an image URL</li>
                  <li>Test the delete functionality if you have a photo</li>
                </ol>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Features:</h4>
                <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                  <li>Clickable profile photos with camera icon overlay</li>
                  <li>Upload from device (JPEG, PNG, GIF, WebP)</li>
                  <li>Upload from URL</li>
                  <li>Delete existing photos</li>
                  <li>Automatic fallback to initials or default avatar</li>
                  <li>Loading states and error handling</li>
                  <li>File size validation (max 5MB)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
