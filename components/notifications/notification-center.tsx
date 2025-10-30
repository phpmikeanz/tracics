"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Bell, Check, CheckCheck, Trash2, Calendar, Award, BookOpen, Users, MessageSquare, Activity, AlertTriangle, Clock } from "lucide-react"
import { format } from "date-fns"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import {
  getUserNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from "@/lib/notifications"
import { 
  markSupabaseNotificationAsRead, 
  markAllSupabaseNotificationsAsRead, 
  deleteSupabaseNotification 
} from "@/lib/supabase-notification-integration"
import { useFacultyNotifications } from "@/hooks/use-faculty-notifications"
import type { Database } from "@/lib/types"
import { useSimpleNotifications } from "@/hooks/use-simple-notifications"

type Notification = Database["public"]["Tables"]["notifications"]["Row"]

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'assignment':
      return <BookOpen className="h-4 w-4" />
    case 'grade':
      return <Award className="h-4 w-4" />
    case 'announcement':
      return <MessageSquare className="h-4 w-4" />
    case 'quiz':
      return <Calendar className="h-4 w-4" />
    case 'enrollment':
      return <Users className="h-4 w-4" />
    case 'activity':
      return <Activity className="h-4 w-4" />
    case 'course':
      return <BookOpen className="h-4 w-4" />
    case 'late':
      return <AlertTriangle className="h-4 w-4" />
    case 'time':
      return <Clock className="h-4 w-4" />
    default:
      return <Bell className="h-4 w-4" />
  }
}

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'assignment':
      return 'bg-blue-100 text-blue-800'
    case 'grade':
      return 'bg-green-100 text-green-800'
    case 'announcement':
      return 'bg-purple-100 text-purple-800'
    case 'quiz':
      return 'bg-orange-100 text-orange-800'
    case 'enrollment':
      return 'bg-yellow-100 text-yellow-800'
    case 'activity':
      return 'bg-indigo-100 text-indigo-800'
    case 'course':
      return 'bg-cyan-100 text-cyan-800'
    case 'late':
      return 'bg-red-100 text-red-800'
    case 'time':
      return 'bg-amber-100 text-amber-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function NotificationCenter() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)

  // Use simple notifications hook
  const {
    notifications,
    unreadCount,
    loading,
    loadNotifications
  } = useSimpleNotifications()

  // Enhanced faculty notifications hook (for compatibility)
  const facultyNotifications = useFacultyNotifications()

  // Load notifications on component mount
  useEffect(() => {
    if (user?.id) {
      loadNotifications()
    }
  }, [user?.id])

  // Sync with faculty activity dashboard
  useEffect(() => {
    if (user?.role === 'faculty') {
      // Trigger a custom event to sync with faculty activity dashboard
      const syncEvent = new CustomEvent('notificationCountUpdated', {
        detail: { count: unreadCount }
      })
      window.dispatchEvent(syncEvent)
    }
  }, [unreadCount, user?.role])



  const handleMarkAsRead = async (notificationId: string) => {
    try {
      // Use Supabase integration for marking as read
      const result = await markSupabaseNotificationAsRead(notificationId)
      if (result.success) {
        await loadNotifications() // Refresh notifications
      } else {
        console.error('Error marking notification as read:', result.error)
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return
    
    try {
      // Use Supabase integration for marking all as read
      const result = await markAllSupabaseNotificationsAsRead(user.id)
      if (result.success) {
        await loadNotifications() // Refresh notifications
        toast({
          title: "Success",
          description: "All notifications marked as read",
        })
      } else {
        console.error('Error marking all notifications as read:', result.error)
        toast({
          title: "Error",
          description: "Failed to mark notifications as read",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      })
    }
  }

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      // Use Supabase integration for deleting notification
      const result = await deleteSupabaseNotification(notificationId)
      if (result.success) {
        await loadNotifications() // Refresh notifications
        toast({
          title: "Success",
          description: "Notification deleted",
        })
      } else {
        console.error('Error deleting notification:', result.error)
        toast({
          title: "Error",
          description: "Failed to delete notification",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      })
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`relative p-2 rounded-full hover:bg-gray-100 transition-all duration-200 ${
            unreadCount > 0 ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          <Bell className={`h-6 w-6 ${unreadCount > 0 ? 'animate-pulse' : ''}`} />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs font-semibold bg-red-500 text-white border-2 border-white rounded-full animate-bounce"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-96">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Notifications</span>
            <div className="flex gap-2">
              {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-sm"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
            </div>
          </SheetTitle>
          <SheetDescription>
            {user?.role === 'faculty' ? '' : 'Your Assignments, Quizzes & Course Updates'}
          </SheetDescription>
        </SheetHeader>

        {/* Notification summary for both faculty and students */}
        {notifications.length > 0 && (
          <div className={`mt-4 mb-4 p-3 rounded-lg border ${
            user?.role === 'faculty' 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className={`h-4 w-4 ${user?.role === 'faculty' ? 'text-blue-600' : 'text-green-600'}`} />
                <span className={`text-sm font-medium ${
                  user?.role === 'faculty' ? 'text-blue-800' : 'text-green-800'
                }`}>
                  {user?.role === 'faculty' 
                    ? 'Student Activities & Course Updates' 
                    : 'Your Assignments, Quizzes & Course Updates'
                  }
                </span>
              </div>
              <div className={`flex items-center gap-4 text-sm ${
                user?.role === 'faculty' ? 'text-blue-700' : 'text-green-700'
              }`}>
                <span>Total: {notifications.length}</span>
                <span>Unread: {unreadCount}</span>
                <span>Read: {notifications.length - unreadCount}</span>
              </div>
            </div>
          </div>
        )}


        <div className="mt-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No notifications yet</p>
              <p className="text-sm">
                {user?.role === 'faculty' 
                  ? "You'll see student assignment submissions, quiz completions, and course updates here" 
                  : "You'll see assignment due dates, quiz notifications, grades, and course announcements here"
                }
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`${!notification.read ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{notification.title}</h4>
                          {!notification.read && (
                            <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0" />
                          )}
                        <Badge variant="outline" className="text-xs">
                          {notification.type}
                        </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          <span>{user?.role === 'faculty' ? '📚 Student Activity' : '📝 Course Update'}</span>
                          <span>•</span>
                          <span>{format(new Date(notification.created_at), "MMM d, yyyy")}</span>
                          <span>•</span>
                          <span>{format(new Date(notification.created_at), "h:mm a")}</span>
                        </div>
                        <p className="text-xs text-gray-400">
                          {format(new Date(notification.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="h-8 w-8 p-0"
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNotification(notification.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        title="Delete notification"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

      </SheetContent>
    </Sheet>
  )
}