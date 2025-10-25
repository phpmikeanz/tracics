"use client"

import { UserAvatarNav } from "@/components/navigation/user-avatar-nav"
import { Button } from "@/components/ui/button"
import { Bell, Menu, Search } from "lucide-react"

export function HeaderWithAvatar() {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Logo and navigation */}
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

        {/* Center - Search */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses, assignments..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Right side - Notifications and User */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              3
            </span>
          </Button>

          {/* User Avatar with Logout */}
          <UserAvatarNav />
        </div>
      </div>
    </header>
  )
}

// Alternative: Simple header with just avatar
export function SimpleHeaderWithAvatar() {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">LMS</span>
          </div>
          <span className="font-semibold">LMS</span>
        </div>

        <UserAvatarNav />
      </div>
    </header>
  )
}

// Alternative: Minimal header
export function MinimalHeaderWithAvatar() {
  return (
    <div className="flex items-center justify-end p-4">
      <UserAvatarNav />
    </div>
  )
}
