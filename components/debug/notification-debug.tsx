"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { createNotification, getUserNotifications, getUnreadNotificationsCount, notifyNewCourseMaterial } from "@/lib/notifications"
import { createClient } from "@/lib/supabase/client"
import { 
  triggerNotificationsForPublishedQuizzes, 
  checkQuizNotificationStatus 
} from "@/lib/manual-quiz-notification-trigger"
import { 
  debugCourseMaterialsNotifications, 
  getCourseDebugInfo 
} from "@/lib/debug-course-materials-notifications"

export function NotificationDebug() {
  const { user } = useAuth()
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [courseId, setCourseId] = useState("")

  const runDebug = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      console.log('🔍 Starting notification debug...')
      
      // 1. Check current notifications
      const notifications = await getUserNotifications(user.id)
      const unreadCount = await getUnreadNotificationsCount(user.id)
      
      console.log('📊 Current notifications:', notifications)
      console.log('📊 Unread count:', unreadCount)
      
      // 2. Check database directly
      const supabase = createClient()
      const { data: dbNotifications, error: dbError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (dbError) {
        console.error('❌ Database error:', dbError)
      }
      
      console.log('🗄️ Database notifications:', dbNotifications)
      
      // 3. Create a test notification
      const testNotification = await createNotification(user.id, {
        title: '🧪 Debug Test Notification',
        message: 'This is a test notification created by the debug system to verify notifications are working.',
        type: 'quiz'
      })
      
      console.log('✅ Test notification created:', testNotification)
      
      // 4. Check notifications again
      const updatedNotifications = await getUserNotifications(user.id)
      const updatedUnreadCount = await getUnreadNotificationsCount(user.id)
      
      console.log('📊 Updated notifications:', updatedNotifications)
      console.log('📊 Updated unread count:', updatedUnreadCount)
      
      setResult({
        success: true,
        user: {
          id: user.id,
          role: user.role,
          full_name: user.full_name
        },
        initialNotifications: notifications?.length || 0,
        initialUnreadCount: unreadCount,
        dbNotifications: dbNotifications?.length || 0,
        testNotificationCreated: !!testNotification,
        finalNotifications: updatedNotifications?.length || 0,
        finalUnreadCount: updatedUnreadCount,
        recentNotifications: updatedNotifications?.slice(0, 3) || []
      })
      
    } catch (error) {
      console.error('❌ Debug error:', error)
      setResult({ success: false, error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const createQuizNotification = async () => {
    if (!user?.id) return
    
    try {
      const result = await createNotification(user.id, {
        title: '📝 New Quiz Available',
        message: 'A new quiz "Test Quiz" is now available for you to take.',
        type: 'quiz'
      })
      
      console.log('✅ Quiz notification created:', result)
      alert('Quiz notification created! Check the bell icon.')
    } catch (error) {
      console.error('❌ Error creating quiz notification:', error)
      alert('Error creating quiz notification: ' + error.message)
    }
  }

  const createAssignmentNotification = async () => {
    if (!user?.id) return
    
    try {
      const result = await createNotification(user.id, {
        title: '📚 New Assignment Available',
        message: 'A new assignment "Test Assignment" has been posted and is due next week.',
        type: 'assignment'
      })
      
      console.log('✅ Assignment notification created:', result)
      alert('Assignment notification created! Check the bell icon.')
    } catch (error) {
      console.error('❌ Error creating assignment notification:', error)
      alert('Error creating assignment notification: ' + error.message)
    }
  }

  const checkQuizStatus = async () => {
    setLoading(true)
    try {
      const status = await checkQuizNotificationStatus()
      setResult({ 
        success: true, 
        message: "Quiz notification status checked",
        status 
      })
      console.log('📊 Quiz notification status:', status)
    } catch (error) {
      setResult({ success: false, error: error.message })
      console.error('❌ Error checking quiz status:', error)
    } finally {
      setLoading(false)
    }
  }

  const triggerQuizNotifications = async () => {
    setLoading(true)
    try {
      const result = await triggerNotificationsForPublishedQuizzes()
      setResult({ 
        success: result.success, 
        message: `Triggered notifications for ${result.processed} quizzes`,
        processed: result.processed,
        errors: result.errors
      })
      console.log('🔔 Quiz notifications triggered:', result)
    } catch (error) {
      setResult({ success: false, error: error.message })
      console.error('❌ Error triggering quiz notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const createCourseMaterialNotification = async () => {
    if (!user?.id) return
    
    try {
      const result = await createNotification(user.id, {
        title: '📚 New Course Material Available',
        message: 'A new document "Sample Course Material" has been uploaded to your course.',
        type: 'course_material'
      })
      
      console.log('✅ Course material notification created:', result)
      alert('Course material notification created! Check the bell icon.')
    } catch (error) {
      console.error('❌ Error creating course material notification:', error)
      alert('Error creating course material notification: ' + error.message)
    }
  }

  const testCourseMaterialNotification = async () => {
    setLoading(true)
    try {
      // Get a course ID for testing
      const supabase = createClient()
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .limit(1)
      
      if (!courses || courses.length === 0) {
        setResult({ success: false, error: 'No courses found for testing' })
        return
      }
      
      const courseId = courses[0].id
      const result = await notifyNewCourseMaterial(
        courseId,
        'Test Course Material',
        'document',
        true
      )
      
      setResult({ 
        success: result, 
        message: result ? 'Course material notification sent successfully' : 'Failed to send course material notification'
      })
      console.log('📚 Course material notification test result:', result)
    } catch (error) {
      setResult({ success: false, error: error.message })
      console.error('❌ Error testing course material notification:', error)
    } finally {
      setLoading(false)
    }
  }

  const debugCourseMaterials = async () => {
    if (!courseId) {
      setResult({ success: false, error: 'Please enter a course ID' })
      return
    }
    
    setLoading(true)
    try {
      const result = await debugCourseMaterialsNotifications(courseId)
      setResult({ 
        success: result.success, 
        message: result.success ? 'Course materials debug completed' : 'Debug failed',
        debugInfo: result.debugInfo,
        error: result.error
      })
      console.log('🔍 Course materials debug result:', result)
    } catch (error) {
      setResult({ success: false, error: error.message })
      console.error('❌ Error debugging course materials:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCourseInfo = async () => {
    if (!courseId) {
      setResult({ success: false, error: 'Please enter a course ID' })
      return
    }
    
    setLoading(true)
    try {
      const result = await getCourseDebugInfo(courseId)
      setResult({ 
        success: result.success, 
        message: result.success ? 'Course info retrieved' : 'Failed to get course info',
        courseInfo: result.courseInfo,
        error: result.error
      })
      console.log('📋 Course info result:', result)
    } catch (error) {
      setResult({ success: false, error: error.message })
      console.error('❌ Error getting course info:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🔍 Notification Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please log in to use the debug tools.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🔍 Notification Debug Tools</CardTitle>
        <p className="text-sm text-gray-600">
          Debug the notification system for user: {user.full_name} ({user.role})
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="courseId" className="block text-sm font-medium text-gray-700 mb-1">
                Course ID (for course materials debugging)
              </label>
              <input
                id="courseId"
                type="text"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                placeholder="Enter course ID to debug course materials"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button onClick={runDebug} disabled={loading}>
                {loading ? 'Running...' : '🔍 Run Full Debug'}
              </Button>
              <Button onClick={createQuizNotification} variant="outline">
                📝 Create Quiz Notification
              </Button>
              <Button onClick={createAssignmentNotification} variant="outline">
                📚 Create Assignment Notification
              </Button>
              <Button onClick={checkQuizStatus} variant="outline" disabled={loading}>
                📊 Check Quiz Status
              </Button>
              <Button onClick={triggerQuizNotifications} variant="outline" disabled={loading}>
                🔔 Trigger Quiz Notifications
              </Button>
              <Button onClick={createCourseMaterialNotification} variant="outline">
                📚 Create Course Material Notification
              </Button>
              <Button onClick={testCourseMaterialNotification} variant="outline" disabled={loading}>
                🧪 Test Course Material Notification
              </Button>
              <Button onClick={debugCourseMaterials} variant="outline" disabled={loading || !courseId}>
                🔍 Debug Course Materials
              </Button>
              <Button onClick={getCourseInfo} variant="outline" disabled={loading || !courseId}>
                📋 Get Course Info
              </Button>
            </div>
          </div>

        {result && (
          <div className="mt-4 space-y-2">
            <h4 className="font-semibold">Debug Results:</h4>
            
            {result.error ? (
              <div className="p-3 bg-red-100 border border-red-300 rounded">
                <p className="text-red-800">❌ Error: {result.error}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {result.message && (
                  <div className="p-3 bg-green-100 border border-green-300 rounded">
                    <p className="text-green-800">✅ {result.message}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Initial Notifications:</strong> {result.initialNotifications || 0}
                  </div>
                  <div>
                    <strong>Initial Unread:</strong> {result.initialUnreadCount || 0}
                  </div>
                  <div>
                    <strong>DB Notifications:</strong> {result.dbNotifications || 0}
                  </div>
                  <div>
                    <strong>Test Created:</strong> {result.testNotificationCreated ? '✅' : '❌'}
                  </div>
                  <div>
                    <strong>Final Notifications:</strong> {result.finalNotifications || 0}
                  </div>
                  <div>
                    <strong>Final Unread:</strong> {result.finalUnreadCount || 0}
                  </div>
                </div>

                {result.status && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                    <h5 className="font-semibold text-blue-800">Quiz Status:</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm text-blue-700 mt-1">
                      <div>Published Quizzes: {result.status.publishedQuizzes}</div>
                      <div>Enrolled Students: {result.status.enrolledStudents}</div>
                      <div>Existing Notifications: {result.status.existingNotifications}</div>
                      <div>Courses with Students: {result.status.coursesWithStudents}</div>
                    </div>
                  </div>
                )}

                {result.processed !== undefined && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <h5 className="font-semibold text-yellow-800">Notification Trigger Results:</h5>
                    <div className="text-sm text-yellow-700 mt-1">
                      <div>Processed Quizzes: {result.processed}</div>
                      {result.errors && result.errors.length > 0 && (
                        <div className="mt-1">
                          <strong>Errors:</strong>
                          <ul className="list-disc list-inside ml-2">
                            {result.errors.map((error: string, index: number) => (
                              <li key={index} className="text-xs">{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {result.recentNotifications && result.recentNotifications.length > 0 && (
                  <div>
                    <strong>Recent Notifications:</strong>
                    <div className="mt-1 space-y-1">
                      {result.recentNotifications.map((notif: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                          <Badge variant={notif.read ? "secondary" : "default"}>
                            {notif.type}
                          </Badge>
                          <span>{notif.title}</span>
                          <span className="text-gray-500">
                            {new Date(notif.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <h4 className="font-semibold text-blue-800">Instructions:</h4>
          <ol className="text-sm text-blue-700 mt-1 space-y-1">
            <li>1. <strong>For Course Materials Debug:</strong> Enter a course ID and click "Debug Course Materials"</li>
            <li>2. Click "Get Course Info" to see course details, enrollments, and materials</li>
            <li>3. Click "Check Quiz Status" to see published quizzes and enrolled students</li>
            <li>4. Click "Trigger Quiz Notifications" to send notifications for all published quizzes</li>
            <li>5. Click "Test Course Material Notification" to test course materials notifications</li>
            <li>6. Click "Run Full Debug" to check the current notification state</li>
            <li>7. Click "Create Quiz/Assignment/Course Material Notification" to test individual notifications</li>
            <li>8. Check the notification bell icon to see if notifications appear</li>
            <li>9. Check the browser console for detailed logs</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
