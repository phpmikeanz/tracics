"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  BookOpen, 
  Calendar, 
  Users, 
  Activity, 
  Bell, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Award,
  MessageSquare,
  RefreshCw,
  Loader2,
  Eye
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
import { useFacultyNotifications } from "@/hooks/use-faculty-notifications"
import { getRealStudentActivities, getRealActivitySummary } from "@/lib/real-student-activities"
import { checkDatabaseNotifications, createRealNotification, getNotificationStats } from "@/lib/check-database-notifications"
import { getUnreadNotificationsCount, getUserNotifications } from "@/lib/notifications"
import { useToast } from "@/hooks/use-toast"

interface NotificationSummary {
  total: number
  unread: number
  assignments: number
  quizzes: number
  enrollments: number
  activities: number
  late: number
  today: number
}

interface FacultyNotificationSummaryProps {
  onNavigateToTab?: (tabId: string) => void
}

export function FacultyNotificationSummary({ onNavigateToTab }: FacultyNotificationSummaryProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const facultyNotifications = useFacultyNotifications()
  const [summary, setSummary] = useState<NotificationSummary>({
    total: 0,
    unread: 0,
    assignments: 0,
    quizzes: 0,
    enrollments: 0,
    activities: 0,
    late: 0,
    today: 0
  })
  const [dataLoaded, setDataLoaded] = useState(false)
  const [realActivities, setRealActivities] = useState<any[]>([])
  const [loadingRealActivities, setLoadingRealActivities] = useState(false)

  // Load real student activities from database
  const loadRealActivities = async () => {
    if (!user?.id) return
    
    try {
      setLoadingRealActivities(true)
      const activities = await getRealStudentActivities(user.id)
      const activitySummary = await getRealActivitySummary(user.id)
      
      setRealActivities(activities)
      
      // Get accurate unread count from database
      const accurateUnreadCount = await getUnreadNotificationsCount(user.id)
      
      // Always merge in bell-derived counts to ensure parity
      const notifications = await getUserNotifications(user.id)
      const notifAssignments = notifications.filter((n: any) => n.type === 'assignment').length
      const notifQuizzes = notifications.filter((n: any) => n.type === 'quiz').length
      const notifEnrollments = notifications.filter((n: any) => n.type === 'enrollment').length
      const notifActivities = notifications.filter((n: any) => n.type === 'activity').length

      setSummary({
        total: Math.max(activitySummary.total || 0, notifications.length),
        unread: accurateUnreadCount || 0,
        assignments: Math.max(activitySummary.assignments || 0, notifAssignments),
        quizzes: Math.max(activitySummary.quizzes || 0, notifQuizzes),
        enrollments: Math.max(activitySummary.enrollments || 0, notifEnrollments),
        activities: Math.max(activities.length || 0, notifActivities),
        late: activitySummary.late || 0,
        today: activitySummary.today || 0
      })
      
      setDataLoaded(true)
      console.log("Real activities loaded:", activities.length)
      console.log("Activity summary:", activitySummary)
      console.log("Activities data:", activities)
    } catch (error) {
      console.error("Error loading real activities:", error)
    } finally {
      setLoadingRealActivities(false)
    }
  }

  // Load real activities on component mount
  useEffect(() => {
    if (user?.id && user.role === 'faculty') {
      loadRealActivities()
    }
  }, [user?.id, user?.role])

  // Debug logging
  useEffect(() => {
    console.log("FacultyNotificationSummary - facultyNotifications:", facultyNotifications)
    console.log("FacultyNotificationSummary - notifications length:", facultyNotifications.notifications?.length)
    console.log("FacultyNotificationSummary - unreadCount:", facultyNotifications.unreadCount)
  }, [facultyNotifications])

  // Update unread count when notifications change (but don't update other summary data)
  useEffect(() => {
    if (user?.role === 'faculty' && dataLoaded && user?.id) {
      // Use the same accurate counting method as the navbar bell
      getUnreadNotificationsCount(user.id).then(accurateCount => {
        setSummary(prev => ({
          ...prev,
          unread: accurateCount
        }))
      }).catch(error => {
        console.error("Error getting accurate unread count:", error)
        // Fallback to faculty notifications count if there's an error
        setSummary(prev => ({
          ...prev,
          unread: facultyNotifications.unreadCount || 0
        }))
      })
    }
  }, [user?.role, user?.id, facultyNotifications.unreadCount, dataLoaded])

  if (user?.role !== 'faculty') {
    return null
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'assignment':
        return <BookOpen className="h-4 w-4" />
      case 'quiz':
        return <Calendar className="h-4 w-4" />
      case 'enrollment':
        return <Users className="h-4 w-4" />
      case 'activity':
        return <Activity className="h-4 w-4" />
      case 'late':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'assignment':
        return 'bg-blue-100 text-blue-800'
      case 'quiz':
        return 'bg-orange-100 text-orange-800'
      case 'enrollment':
        return 'bg-yellow-100 text-yellow-800'
      case 'activity':
        return 'bg-indigo-100 text-indigo-800'
      case 'late':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Student Activity Notifications
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                setDataLoaded(false)
                await facultyNotifications.loadNotifications()
                await loadRealActivities()
              }}
              disabled={facultyNotifications.loading || loadingRealActivities}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${(facultyNotifications.loading || loadingRealActivities) ? 'animate-spin' : ''}`} />
              {(facultyNotifications.loading || loadingRealActivities) ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {(facultyNotifications.loading || loadingRealActivities) && !dataLoaded ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading student activities...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Assignment Notifications */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="p-2 bg-blue-100 rounded-full">
              <BookOpen className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">Assignments</p>
              <p className="text-lg font-bold text-blue-700">{summary.assignments}</p>
            </div>
          </div>

          {/* Quiz Notifications */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200">
            <div className="p-2 bg-orange-100 rounded-full">
              <Calendar className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-orange-900">Quizzes</p>
              <p className="text-lg font-bold text-orange-700">{summary.quizzes}</p>
            </div>
          </div>

          {/* Enrollment Notifications */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
            <div className="p-2 bg-yellow-100 rounded-full">
              <Users className="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-yellow-900">Enrollments</p>
              <p className="text-lg font-bold text-yellow-700">{summary.enrollments}</p>
            </div>
          </div>

          {/* Activity Notifications */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50 border border-indigo-200">
            <div className="p-2 bg-indigo-100 rounded-full">
              <Activity className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-indigo-900">Activities</p>
              <p className="text-lg font-bold text-indigo-700">{summary.activities}</p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-gray-50">
            <p className="text-sm text-gray-600">Total Notifications</p>
            <p className="text-xl font-bold text-gray-900">{summary.total}</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-red-50">
            <p className="text-sm text-red-600">Late Submissions</p>
            <p className="text-xl font-bold text-red-700">{summary.late}</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-green-50">
            <p className="text-sm text-green-600">Today's Activities</p>
            <p className="text-xl font-bold text-green-700">{summary.today}</p>
          </div>
        </div>

        {/* Recent Activity Preview - Real Database Data */}
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Student Activities</h4>
          {realActivities.length > 0 ? (
            <div className="space-y-2">
              {realActivities.slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  className={`flex items-center gap-3 p-2 rounded-lg border ${
                    activity.status === 'late' ? 'bg-red-50 border-red-200' : 
                    activity.status === 'completed' ? 'bg-green-50 border-green-200' : 
                    'bg-blue-50 border-blue-200'
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage 
                      src={activity.student_avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(activity.student_name)}&background=random&color=fff&size=128`} 
                      alt={activity.student_name}
                    />
                    <AvatarFallback className="text-xs">
                      {activity.student_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.student_name} - {activity.activity_type}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {activity.course_title}
                      {activity.assignment_title && ` • ${activity.assignment_title}`}
                      {activity.quiz_title && ` • ${activity.quiz_title}`}
                      {activity.score !== undefined && ` • Score: ${activity.score}/${activity.max_score}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {activity.is_late && (
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => {
                        // Navigate based on activity type
                        if (activity.activity_type.includes('Assignment')) {
                          onNavigateToTab?.('assignments')
                        } else if (activity.activity_type.includes('Quiz')) {
                          onNavigateToTab?.('quizzes')
                        } else if (activity.activity_type.includes('Enrollment')) {
                          onNavigateToTab?.('enrollment')
                        } else {
                          onNavigateToTab?.('activities')
                        }
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : dataLoaded ? (
            <div className="text-center py-4 text-gray-500">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No student activities found yet.</p>
              <p className="text-xs">Activities will appear here when students submit assignments or complete quizzes.</p>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p className="text-sm">Loading student activities...</p>
            </div>
          )}
        </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
