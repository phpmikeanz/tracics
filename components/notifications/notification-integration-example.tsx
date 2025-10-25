"use client"

import { useComprehensiveNotifications } from "@/hooks/use-comprehensive-notifications"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

/**
 * Example component showing how to integrate comprehensive notifications
 * with assignment and quiz submissions
 */
export function NotificationIntegrationExample() {
  const { user } = useAuth()
  const { toast } = useToast()
  const {
    notifyFacultyOfAssignmentSubmission,
    notifyFacultyOfQuizCompletion,
    notifyStudentOfAssignmentSubmission,
    notifyStudentOfQuizCompletion,
    notifyStudentOfAssignmentDue,
    notifyStudentOfQuizAvailable,
    notifyStudentOfGrade,
    createCourseAnnouncement,
    notifyFacultyOfEnrollmentRequest,
    notifyFacultyOfEnrollmentStatusChange,
    notifyStudentOfEnrollmentRequest,
    notifyStudentOfEnrollmentStatus,
    notifyStudentOfDirectEnrollment
  } = useComprehensiveNotifications()

  // Example: Student submits assignment
  const handleStudentSubmitAssignment = async () => {
    if (user?.role !== 'student') return
    
    try {
      // Simulate assignment submission
      const assignmentId = "assignment-123"
      const courseId = "course-456"
      const isLate = false // or calculate based on due date
      
      // Notify student of their submission
      const studentResult = await notifyStudentOfAssignmentSubmission(
        assignmentId,
        courseId,
        isLate
      )
      
      if (studentResult.success) {
        toast({
          title: "Assignment Submitted",
          description: "You have been notified of your submission",
        })
      }
      
      // Note: Faculty notification would be triggered by the backend
      // when the assignment is actually submitted to the database
      
    } catch (error) {
      console.error("Error submitting assignment:", error)
      toast({
        title: "Error",
        description: "Failed to submit assignment",
        variant: "destructive",
      })
    }
  }

  // Example: Student completes quiz
  const handleStudentCompleteQuiz = async () => {
    if (user?.role !== 'student') return
    
    try {
      // Simulate quiz completion
      const quizId = "quiz-789"
      const courseId = "course-456"
      const score = 85
      const maxScore = 100
      
      // Notify student of their completion
      const studentResult = await notifyStudentOfQuizCompletion(
        quizId,
        courseId,
        score,
        maxScore
      )
      
      if (studentResult.success) {
        toast({
          title: "Quiz Completed",
          description: "You have been notified of your quiz completion",
        })
      }
      
    } catch (error) {
      console.error("Error completing quiz:", error)
      toast({
        title: "Error",
        description: "Failed to complete quiz",
        variant: "destructive",
      })
    }
  }

  // Example: Faculty creates announcement
  const handleFacultyCreateAnnouncement = async () => {
    if (user?.role !== 'faculty') return
    
    try {
      const courseId = "course-456"
      const title = "Important Course Update"
      const message = "Please review the updated syllabus for next week's assignments."
      
      const result = await createCourseAnnouncement(courseId, title, message)
      
      if (result.success) {
        toast({
          title: "Announcement Created",
          description: `Notification sent to ${result.notificationsCreated} students`,
        })
      }
      
    } catch (error) {
      console.error("Error creating announcement:", error)
      toast({
        title: "Error",
        description: "Failed to create announcement",
        variant: "destructive",
      })
    }
  }

  // Example: Student requests enrollment
  const handleStudentRequestEnrollment = async () => {
    if (user?.role !== 'student') return
    
    try {
      const courseId = "course-456"
      
      const result = await notifyStudentOfEnrollmentRequest(courseId)
      
      if (result.success) {
        toast({
          title: "Enrollment Requested",
          description: "You have been notified of your enrollment request",
        })
      }
      
    } catch (error) {
      console.error("Error requesting enrollment:", error)
      toast({
        title: "Error",
        description: "Failed to request enrollment",
        variant: "destructive",
      })
    }
  }

  // Example: Faculty approves/declines enrollment
  const handleFacultyApproveEnrollment = async () => {
    if (user?.role !== 'faculty') return
    
    try {
      const studentId = "student-123"
      const courseId = "course-456"
      const status = 'approved' as 'approved' | 'declined'
      
      const result = await notifyFacultyOfEnrollmentStatusChange(studentId, courseId, status)
      
      if (result.success) {
        toast({
          title: "Enrollment Status Updated",
          description: `Enrollment ${status} notification sent`,
        })
      }
      
    } catch (error) {
      console.error("Error updating enrollment status:", error)
      toast({
        title: "Error",
        description: "Failed to update enrollment status",
        variant: "destructive",
      })
    }
  }

  // Example: Student gets enrollment status update
  const handleStudentEnrollmentStatus = async () => {
    if (user?.role !== 'student') return
    
    try {
      const courseId = "course-456"
      const status = 'approved' as 'approved' | 'declined'
      const facultyName = "Dr. Smith"
      
      const result = await notifyStudentOfEnrollmentStatus(courseId, status, facultyName)
      
      if (result.success) {
        toast({
          title: "Enrollment Status Update",
          description: `You have been notified of your enrollment ${status}`,
        })
      }
      
    } catch (error) {
      console.error("Error notifying enrollment status:", error)
      toast({
        title: "Error",
        description: "Failed to notify enrollment status",
        variant: "destructive",
      })
    }
  }

  // Example: Faculty directly enrolls student
  const handleFacultyDirectEnrollment = async () => {
    if (user?.role !== 'faculty') return
    
    try {
      const studentId = "student-123"
      const courseId = "course-456"
      const facultyName = "Dr. Smith"
      
      // This would typically be called by the backend when faculty directly enrolls a student
      const result = await notifyStudentOfDirectEnrollment(courseId, facultyName)
      
      if (result.success) {
        toast({
          title: "Student Enrolled",
          description: "Student has been notified of direct enrollment",
        })
      }
      
    } catch (error) {
      console.error("Error with direct enrollment:", error)
      toast({
        title: "Error",
        description: "Failed to notify direct enrollment",
        variant: "destructive",
      })
    }
  }

  // Example: Notify student of assignment due date
  const handleNotifyAssignmentDue = async () => {
    if (user?.role !== 'student') return
    
    try {
      const assignmentId = "assignment-123"
      const courseId = "course-456"
      const hoursUntilDue = 12 // Less than 24 hours
      
      const result = await notifyStudentOfAssignmentDue(
        assignmentId,
        courseId,
        hoursUntilDue
      )
      
      if (result.success) {
        toast({
          title: "Due Date Reminder",
          description: "You have been notified of the upcoming due date",
        })
      }
      
    } catch (error) {
      console.error("Error notifying assignment due:", error)
    }
  }

  // Example: Notify student of grade
  const handleNotifyGrade = async () => {
    if (user?.role !== 'student') return
    
    try {
      const assignmentId = "assignment-123"
      const courseId = "course-456"
      const grade = 92
      const maxGrade = 100
      const isQuiz = false
      
      const result = await notifyStudentOfGrade(
        assignmentId,
        courseId,
        grade,
        maxGrade,
        isQuiz
      )
      
      if (result.success) {
        toast({
          title: "Grade Posted",
          description: "You have been notified of your grade",
        })
      }
      
    } catch (error) {
      console.error("Error notifying grade:", error)
    }
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Please log in to see notification examples.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Integration Examples</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          These examples show how to integrate comprehensive notifications with your assignment and quiz systems.
        </div>
        
        {user.role === 'student' && (
          <div className="space-y-2">
            <h4 className="font-medium">Student Examples:</h4>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleStudentSubmitAssignment} variant="outline" size="sm">
                📚 Submit Assignment
              </Button>
              <Button onClick={handleStudentCompleteQuiz} variant="outline" size="sm">
                📝 Complete Quiz
              </Button>
              <Button onClick={handleNotifyAssignmentDue} variant="outline" size="sm">
                ⏰ Assignment Due Reminder
              </Button>
              <Button onClick={handleNotifyGrade} variant="outline" size="sm">
                🎉 Grade Notification
              </Button>
              <Button onClick={handleStudentRequestEnrollment} variant="outline" size="sm">
                👥 Request Enrollment
              </Button>
              <Button onClick={handleStudentEnrollmentStatus} variant="outline" size="sm">
                📝 Enrollment Status
              </Button>
            </div>
          </div>
        )}
        
        {user.role === 'faculty' && (
          <div className="space-y-2">
            <h4 className="font-medium">Faculty Examples:</h4>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleFacultyCreateAnnouncement} variant="outline" size="sm">
                📢 Create Announcement
              </Button>
              <Button onClick={handleFacultyApproveEnrollment} variant="outline" size="sm">
                ✅ Approve Enrollment
              </Button>
              <Button onClick={handleFacultyDirectEnrollment} variant="outline" size="sm">
                🎓 Direct Enrollment
              </Button>
            </div>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground mt-4">
          <p><strong>Note:</strong> These are example functions. In a real application, these would be called:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>When a student submits an assignment</li>
            <li>When a student completes a quiz</li>
            <li>When faculty grades an assignment/quiz</li>
            <li>When faculty creates course announcements</li>
            <li>When assignments are due soon</li>
            <li>When a student requests enrollment in a course</li>
            <li>When faculty approves/declines enrollment requests</li>
            <li>When faculty directly enrolls a student</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
