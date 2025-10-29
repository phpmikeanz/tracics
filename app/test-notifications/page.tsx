"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import { 
  createNotification, 
  notifyNewQuiz, 
  notifyNewAssignmentPublished,
  getEnrolledStudents,
  getUserNotifications,
  getUnreadNotificationsCount
} from "@/lib/notifications"
import { createClient } from "@/lib/supabase/client"

export default function TestNotificationsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [courseId, setCourseId] = useState("")
  const [quizTitle, setQuizTitle] = useState("Test Quiz")
  const [assignmentTitle, setAssignmentTitle] = useState("Test Assignment")

  const testCreateNotification = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const notification = await createNotification(user.id, {
        title: "🧪 Test Notification",
        message: "This is a test notification created from the test page.",
        type: "quiz"
      })
      
      setResult({ success: true, notification })
      console.log("✅ Test notification created:", notification)
    } catch (error) {
      setResult({ success: false, error: error.message })
      console.error("❌ Error creating notification:", error)
    } finally {
      setLoading(false)
    }
  }

  const testNotifyNewQuiz = async () => {
    if (!courseId) {
      setResult({ success: false, error: "Please enter a course ID" })
      return
    }
    
    setLoading(true)
    try {
      const success = await notifyNewQuiz(courseId, quizTitle)
      setResult({ success, message: success ? "Quiz notification sent" : "Failed to send quiz notification" })
      console.log("✅ Quiz notification result:", success)
    } catch (error) {
      setResult({ success: false, error: error.message })
      console.error("❌ Error sending quiz notification:", error)
    } finally {
      setLoading(false)
    }
  }

  const testNotifyNewAssignment = async () => {
    if (!courseId) {
      setResult({ success: false, error: "Please enter a course ID" })
      return
    }
    
    setLoading(true)
    try {
      const success = await notifyNewAssignmentPublished(courseId, assignmentTitle)
      setResult({ success, message: success ? "Assignment notification sent" : "Failed to send assignment notification" })
      console.log("✅ Assignment notification result:", success)
    } catch (error) {
      setResult({ success: false, error: error.message })
      console.error("❌ Error sending assignment notification:", error)
    } finally {
      setLoading(false)
    }
  }

  const testGetEnrolledStudents = async () => {
    if (!courseId) {
      setResult({ success: false, error: "Please enter a course ID" })
      return
    }
    
    setLoading(true)
    try {
      const students = await getEnrolledStudents(courseId)
      setResult({ success: true, students, count: students.length })
      console.log("✅ Enrolled students:", students)
    } catch (error) {
      setResult({ success: false, error: error.message })
      console.error("❌ Error getting enrolled students:", error)
    } finally {
      setLoading(false)
    }
  }

  const testGetNotifications = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const notifications = await getUserNotifications(user.id)
      const unreadCount = await getUnreadNotificationsCount(user.id)
      setResult({ 
        success: true, 
        notifications, 
        unreadCount,
        count: notifications.length 
      })
      console.log("✅ User notifications:", notifications)
    } catch (error) {
      setResult({ success: false, error: error.message })
      console.error("❌ Error getting notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadCourses = async () => {
    try {
      const supabase = createClient()
      const { data: courses, error } = await supabase
        .from('courses')
        .select('id, title, course_code')
        .limit(10)
      
      if (error) {
        console.error("Error loading courses:", error)
        return
      }
      
      console.log("Available courses:", courses)
      setResult({ success: true, courses })
    } catch (error) {
      console.error("Error loading courses:", error)
    }
  }


  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please log in to test notifications.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Notification System Test Page</CardTitle>
          <p className="text-sm text-gray-600">
            Test the notification system for user: {user.full_name} ({user.role})
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="courseId">Course ID</Label>
              <Input
                id="courseId"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                placeholder="Enter course ID"
              />
            </div>
            <div>
              <Label htmlFor="quizTitle">Quiz Title</Label>
              <Input
                id="quizTitle"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="Enter quiz title"
              />
            </div>
            <div>
              <Label htmlFor="assignmentTitle">Assignment Title</Label>
              <Input
                id="assignmentTitle"
                value={assignmentTitle}
                onChange={(e) => setAssignmentTitle(e.target.value)}
                placeholder="Enter assignment title"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={testCreateNotification} disabled={loading}>
              {loading ? 'Testing...' : '🧪 Test Create Notification'}
            </Button>
            <Button onClick={testNotifyNewQuiz} disabled={loading || !courseId}>
              {loading ? 'Testing...' : '📝 Test Quiz Notification'}
            </Button>
            <Button onClick={testNotifyNewAssignment} disabled={loading || !courseId}>
              {loading ? 'Testing...' : '📚 Test Assignment Notification'}
            </Button>
            <Button onClick={testGetEnrolledStudents} disabled={loading || !courseId}>
              {loading ? 'Testing...' : '👥 Get Enrolled Students'}
            </Button>
            <Button onClick={testGetNotifications} disabled={loading}>
              {loading ? 'Testing...' : '📊 Get My Notifications'}
            </Button>
            <Button onClick={loadCourses} variant="outline">
              📋 Load Courses
            </Button>
          </div>

          {result && (
            <div className="mt-4 p-4 bg-gray-50 border rounded">
              <h4 className="font-semibold mb-2">Test Result:</h4>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-semibold text-blue-800">Instructions:</h4>
            <ol className="text-sm text-blue-700 mt-2 space-y-1">
              <li>1. First, click "Load Courses" to see available courses</li>
              <li>2. Copy a course ID and paste it in the Course ID field</li>
              <li>3. Click "Get Enrolled Students" to see if there are students enrolled</li>
              <li>4. Click "Test Quiz Notification" to send a quiz notification to enrolled students</li>
              <li>5. Click "Get My Notifications" to see if notifications were created</li>
              <li>6. Check the notification bell icon in the main app</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
