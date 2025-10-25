"use client"

import { ClickableAvatar, ClickableAvatarWithLogout } from "@/components/profile/clickable-avatar"
import { UserAvatarNav } from "@/components/navigation/user-avatar-nav"

// Example 1: Replace "mrgohan208" text with clickable avatar
export function AvatarReplacementExample() {
  return (
    <div className="flex items-center gap-4 p-4">
      {/* OLD: Text-based user display */}
      <div className="text-gray-600">
        <span>OLD: mrgohan208</span>
      </div>

      {/* NEW: Clickable avatar */}
      <ClickableAvatar 
        size="md" 
        showName={true}
        className="hover:bg-gray-50 p-2 rounded-md"
      />
    </div>
  )
}

// Example 2: Navigation bar with avatar
export function NavigationWithAvatar() {
  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-lg">LMS</span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button className="p-2 hover:bg-gray-100 rounded-md">
            <span className="text-sm">🔔</span>
          </button>
          
          {/* User Avatar with Logout */}
          <ClickableAvatarWithLogout 
            size="md"
            onLogout={() => console.log("Logout clicked")}
          />
        </div>
      </div>
    </nav>
  )
}

// Example 3: Sidebar with avatar
export function SidebarWithAvatar() {
  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 p-4">
      <div className="space-y-4">
        <div className="text-center">
          <ClickableAvatar 
            size="lg" 
            showName={true}
            className="justify-center"
          />
        </div>
        
        <nav className="space-y-2">
          <a href="#" className="block p-2 hover:bg-gray-100 rounded-md">Dashboard</a>
          <a href="#" className="block p-2 hover:bg-gray-100 rounded-md">Courses</a>
          <a href="#" className="block p-2 hover:bg-gray-100 rounded-md">Assignments</a>
          <a href="#" className="block p-2 hover:bg-gray-100 rounded-md">Profile</a>
        </nav>
      </div>
    </aside>
  )
}

// Example 4: Header bar (like your image)
export function HeaderBarExample() {
  return (
    <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="font-semibold">LMS Dashboard</span>
      </div>
      
      <div className="flex items-center gap-3">
        {/* This replaces the "mrgohan208" text */}
        <ClickableAvatar 
          size="sm" 
          showName={true}
          className="hover:bg-white p-1 rounded-md"
        />
        
        <button className="text-blue-600 hover:text-blue-800 text-sm">
          [→] Logout
        </button>
      </div>
    </div>
  )
}

// Example 5: Compact user info
export function CompactUserInfo() {
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
      <ClickableAvatar 
        size="sm" 
        showName={false}
      />
      <span className="text-sm font-medium">mrgohan208</span>
      <button className="text-blue-600 hover:text-blue-800 text-sm ml-auto">
        [→] Logout
      </button>
    </div>
  )
}
