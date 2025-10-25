"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, CheckCircle, AlertCircle, Clock, Users, BookOpen, Award } from "lucide-react"
import { format } from "date-fns"
import { useAuth } from "@/hooks/use-auth"
import { useAssignmentNotifications, useFacultyAssignmentNotifications, useStudentAssignmentNotifications } from "@/hooks/use-assignment-notifications"

interface NotificationSyncProps {
  assignmentId?: string
  showDetails?: boolean
}

export function AssignmentNotificationSync({ assignmentId, showDetails = false }: NotificationSyncProps) {
  const { user } = useAuth()
  const { notifications, unreadCount, markAsRead, loading } = useAssignmentNotifications(assignmentId)
  
  // Role-specific notifications
  const facultyNotifications = useFacultyAssignmentNotifications()
  const studentNotifications = useStudentAssignmentNotifications()

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'assignment':
        return <BookOpen className="h-4 w-4" />
      case 'grade':
        return <Award className="h-4 w-4" />
      case 'announcement':
        return <Bell className="h-4 w-4" />
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
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!showDetails) {
    return (
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge variant="destructive" className="animate-pulse">
            {unreadCount}
          </Badge>
        )}
        {user?.role === "faculty" && facultyNotifications.hasNewSubmissions && (
          <Badge variant="outline" className="text-orange-600 border-orange-200">
            New Submissions
          </Badge>
        )}
        {user?.role === "student" && studentNotifications.hasNewAssignments && (
          <Badge variant="outline" className="text-blue-600 border-blue-200">
            New Assignments
          </Badge>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Assignment Notifications
          {unreadCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {unreadCount} unread
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Role-specific status indicators */}
        {user?.role === "faculty" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
              <Users className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">New Submissions</p>
                <p className="text-xs text-orange-600">
                  {facultyNotifications.submissionNotifications.length} pending
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <Award className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Graded</p>
                <p className="text-xs text-green-600">
                  {facultyNotifications.gradeNotifications.length} completed
                </p>
              </div>
            </div>
          </div>
        )}

        {user?.role === "student" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">New Assignments</p>
                <p className="text-xs text-blue-600">
                  {studentNotifications.assignmentNotifications.length} available
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <Award className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Grades</p>
                <p className="text-xs text-green-600">
                  {studentNotifications.gradeNotifications.length} received
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recent notifications */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recent Notifications</h4>
          {loading ? (
            <div className="text-center py-4 text-gray-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                  }`}
                >
                  <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium">{notification.title}</p>
                      {!notification.read && (
                        <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{notification.message}</p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(notification.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                      className="h-6 w-6 p-0"
                    >
                      <CheckCircle className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAsRead()}
            disabled={unreadCount === 0}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="flex-1"
          >
            <Clock className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Real-time notification indicator for headers
 */
export function NotificationIndicator({ assignmentId }: { assignmentId?: string }) {
  const { user } = useAuth()
  const { unreadCount } = useAssignmentNotifications(assignmentId)
  const facultyNotifications = useFacultyAssignmentNotifications()
  const studentNotifications = useStudentAssignmentNotifications()

  const getIndicatorCount = () => {
    let count = unreadCount
    
    if (user?.role === "faculty") {
      count += facultyNotifications.submissionNotifications.length
    } else if (user?.role === "student") {
      count += studentNotifications.assignmentNotifications.length
    }
    
    return count
  }

  const totalCount = getIndicatorCount()

  if (totalCount === 0) return null

  return (
    <div className="relative">
      <Bell className="h-5 w-5" />
      <Badge 
        variant="destructive" 
        className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs font-semibold animate-pulse"
      >
        {totalCount > 99 ? '99+' : totalCount}
      </Badge>
    </div>
  )
}

/**
 * Assignment activity feed component
 */
export function AssignmentActivityFeed({ assignmentId }: { assignmentId: string }) {
  const { notifications, loading } = useAssignmentNotifications(assignmentId)

  if (loading) {
    return (
      <div className="text-center py-4 text-gray-500">
        Loading activity...
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>No activity yet</p>
        <p className="text-sm">Activity will appear here as students submit and you grade assignments</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="flex items-start gap-3 p-3 rounded-lg border bg-white"
        >
          <div className="p-2 rounded-full bg-blue-100">
            <Bell className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{notification.title}</p>
            <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
            <p className="text-xs text-gray-400 mt-1">
              {format(new Date(notification.created_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
          {!notification.read && (
            <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
          )}
        </div>
      ))}
    </div>
  )
}

