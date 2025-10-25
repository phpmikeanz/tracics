"use client"

import { SimpleUserNav, SimpleUserAvatar, SimpleUserAvatarOnly } from "@/components/navigation/simple-user-nav"

// Example 1: Replace your current navigation
export function NavigationReplacementExample() {
  return (
    <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="font-semibold">LMS Dashboard</span>
      </div>
      
      {/* OLD: Text-based navigation */}
      <div className="text-gray-600">
        <span>OLD: mrgohan208 [→] Logout</span>
      </div>
      
      {/* NEW: Clickable avatar navigation */}
      <SimpleUserNav />
    </div>
  )
}

// Example 2: Simple header with avatar
export function SimpleHeaderExample() {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">LMS</span>
          </div>
          <span className="font-semibold">LMS</span>
        </div>

        <SimpleUserNav />
      </div>
    </header>
  )
}

// Example 3: Sidebar with avatar
export function SidebarExample() {
  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 p-4">
      <div className="space-y-4">
        <div className="text-center">
          <SimpleUserAvatar />
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

// Example 4: Compact navigation
export function CompactNavigationExample() {
  return (
    <div className="flex items-center gap-3 p-2 bg-white border-b">
      <div className="flex items-center gap-2">
        <span className="font-semibold">LMS</span>
      </div>
      
      <div className="ml-auto">
        <SimpleUserAvatarOnly />
      </div>
    </div>
  )
}

// Example 5: Full navigation bar
export function FullNavigationExample() {
  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-md">
            <span className="text-sm">☰</span>
          </button>
          <span className="font-semibold text-lg">LMS</span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button className="p-2 hover:bg-gray-100 rounded-md">
            <span className="text-sm">🔔</span>
          </button>
          
          {/* User Avatar with Logout */}
          <SimpleUserNav />
        </div>
      </div>
    </nav>
  )
}
