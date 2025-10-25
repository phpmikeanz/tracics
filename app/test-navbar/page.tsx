"use client"

import { SimpleUserNav, SimpleUserAvatar, SimpleUserAvatarOnly } from "@/components/navigation/simple-user-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Bell, Menu, Search, User } from "lucide-react"
import Link from "next/link"

export default function TestNavbarPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Test Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">LMS</span>
              </div>
              <span className="font-semibold text-lg">Learning Management System</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                3
              </span>
            </Button>

            {/* Clickable Avatar - THIS IS WHAT YOU NEED */}
            <SimpleUserNav />
          </div>
        </div>
      </nav>

      {/* Test Content */}
      <div className="max-w-6xl mx-auto p-6">
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
              Test Clickable Avatar
            </h1>
            <p className="text-gray-600">
              Click on the avatar in the navigation above to test photo upload
            </p>
          </div>
        </div>

        {/* Test Components */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Navigation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Current Navigation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-100 p-4 rounded-md">
                <p className="text-sm text-gray-600 mb-2">Your current navigation looks like this:</p>
                <div className="flex items-center gap-3 p-3 bg-white border rounded-md">
                  <span className="text-gray-600">mrgohan208</span>
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    [→] Logout
                  </button>
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                <p><strong>Problem:</strong> No click functionality</p>
                <p><strong>Issue:</strong> Cannot update photo</p>
                <p><strong>Result:</strong> Static text only</p>
              </div>
            </CardContent>
          </Card>

          {/* New Clickable Avatar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                New Clickable Avatar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 p-4 rounded-md">
                <p className="text-sm text-green-700 mb-2">New navigation with clickable avatar:</p>
                <div className="flex items-center gap-3 p-3 bg-white border rounded-md">
                  <SimpleUserNav />
                </div>
              </div>
              
              <div className="text-sm text-green-600">
                <p><strong>✅ Solution:</strong> Clickable avatar</p>
                <p><strong>✅ Feature:</strong> Photo upload modal</p>
                <p><strong>✅ Result:</strong> Interactive navigation</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Test Different Avatar Types */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Test Different Avatar Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Full Navigation */}
                <div className="text-center space-y-4">
                  <h4 className="font-medium">Full Navigation</h4>
                  <div className="flex justify-center">
                    <SimpleUserNav />
                  </div>
                  <p className="text-xs text-gray-500">
                    Avatar + Name + Logout
                  </p>
                </div>

                {/* Avatar with Name */}
                <div className="text-center space-y-4">
                  <h4 className="font-medium">Avatar with Name</h4>
                  <div className="flex justify-center">
                    <SimpleUserAvatar />
                  </div>
                  <p className="text-xs text-gray-500">
                    Avatar + Name only
                  </p>
                </div>

                {/* Avatar Only */}
                <div className="text-center space-y-4">
                  <h4 className="font-medium">Avatar Only</h4>
                  <div className="flex justify-center">
                    <SimpleUserAvatarOnly />
                  </div>
                  <p className="text-xs text-gray-500">
                    Just the avatar
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How to Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Step 1: Click on Avatar</h4>
              <p className="text-sm text-gray-600">
                Click on any of the avatars above. A modal should open with photo upload options.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Step 2: Upload a Photo</h4>
              <p className="text-sm text-gray-600">
                Click "Upload from Device" and select an image file from your computer.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Step 3: Check Navigation</h4>
              <p className="text-sm text-gray-600">
                Go back to the navigation bar at the top and check if your photo appears.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Important Notes</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Make sure you're logged in to your app</li>
                <li>• Check if the database setup is complete</li>
                <li>• Look for any error messages in the console</li>
                <li>• Try uploading a small image file first</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
