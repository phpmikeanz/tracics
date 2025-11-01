import { createClient } from "@/lib/supabase/client"
import { createNotification, createBulkNotifications } from "./notifications"

export interface FacultyActivityNotification {
  title: string
  message: string
  type: 'assignment' | 'grade' | 'announcement' | 'quiz' | 'enrollment' | 'course' | 'activity'
}

/**
 * COMPREHENSIVE FACULTY ACTIVITY NOTIFICATIONS
 * Notifies faculty whenever enrolled students perform any activities
 */

/**
 * ASSIGNMENT ACTIVITY NOTIFICATIONS
 */

// Notify faculty when student submits assignment
export async function notifyFacultyAssignmentSubmission(
  instructorId: string,
  studentName: string,
  assignmentTitle: string,
  courseTitle: string,
  submittedAt: string
): Promise<boolean> {
  try {
    await createNotification(instructorId, {
      title: "📚 Assignment Submitted",
      message: `${studentName} submitted "${assignmentTitle}" in ${courseTitle} at ${new Date(submittedAt).toLocaleString()}`,
      type: "assignment"
    })

    console.log(`Faculty notified about assignment submission: ${studentName} - ${assignmentTitle}`)
    return true
  } catch (error) {
    console.error("Error notifying faculty about assignment submission:", error)
    return false
  }
}

// Notify faculty when student resubmits assignment
export async function notifyFacultyAssignmentResubmission(
  instructorId: string,
  studentName: string,
  assignmentTitle: string,
  courseTitle: string,
  resubmittedAt: string
): Promise<boolean> {
  try {
    await createNotification(instructorId, {
      title: "🔄 Assignment Resubmitted",
      message: `${studentName} resubmitted "${assignmentTitle}" in ${courseTitle} at ${new Date(resubmittedAt).toLocaleString()}`,
      type: "assignment"
    })

    console.log(`Faculty notified about assignment resubmission: ${studentName} - ${assignmentTitle}`)
    return true
  } catch (error) {
    console.error("Error notifying faculty about assignment resubmission:", error)
    return false
  }
}

// Notify faculty when student submits late assignment
export async function notifyFacultyLateSubmission(
  instructorId: string,
  studentName: string,
  assignmentTitle: string,
  courseTitle: string,
  submittedAt: string,
  dueDate: string
): Promise<boolean> {
  try {
    const daysLate = Math.ceil((new Date(submittedAt).getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24))
    
    await createNotification(instructorId, {
      title: "⚠️ Late Assignment Submission",
      message: `${studentName} submitted "${assignmentTitle}" in ${courseTitle} ${daysLate} days late (${new Date(submittedAt).toLocaleString()})`,
      type: "assignment"
    })

    console.log(`Faculty notified about late submission: ${studentName} - ${assignmentTitle}`)
    return true
  } catch (error) {
    console.error("Error notifying faculty about late submission:", error)
    return false
  }
}

/**
 * QUIZ ACTIVITY NOTIFICATIONS
 */

// Notify faculty when student starts quiz
export async function notifyFacultyQuizStarted(
  instructorId: string,
  studentName: string,
  quizTitle: string,
  courseTitle: string,
  startedAt: string
): Promise<boolean> {
  try {
    await createNotification(instructorId, {
      title: "📝 Quiz Started",
      message: `${studentName} started "${quizTitle}" in ${courseTitle} at ${new Date(startedAt).toLocaleString()}`,
      type: "quiz"
    })

    console.log(`Faculty notified about quiz start: ${studentName} - ${quizTitle}`)
    return true
  } catch (error) {
    console.error("Error notifying faculty about quiz start:", error)
    return false
  }
}

// Notify faculty when student completes quiz
export async function notifyFacultyQuizCompleted(
  instructorId: string,
  studentName: string,
  quizTitle: string,
  courseTitle: string,
  completedAt: string,
  score?: number,
  maxScore?: number
): Promise<boolean> {
  try {
    const scoreText = score !== undefined && maxScore !== undefined 
      ? ` (Score: ${score}/${maxScore})`
      : ""

    await createNotification(instructorId, {
      title: "✅ Quiz Completed",
      message: `${studentName} completed "${quizTitle}" in ${courseTitle} at ${new Date(completedAt).toLocaleString()}${scoreText}`,
      type: "quiz"
    })

    console.log(`Faculty notified about quiz completion: ${studentName} - ${quizTitle}`)
    return true
  } catch (error) {
    console.error("Error notifying faculty about quiz completion:", error)
    return false
  }
}

// Notify faculty when student attempts quiz multiple times
export async function notifyFacultyQuizRetake(
  instructorId: string,
  studentName: string,
  quizTitle: string,
  courseTitle: string,
  attemptNumber: number,
  attemptedAt: string
): Promise<boolean> {
  try {
    await createNotification(instructorId, {
      title: "🔄 Quiz Retake",
      message: `${studentName} retook "${quizTitle}" in ${courseTitle} (Attempt #${attemptNumber}) at ${new Date(attemptedAt).toLocaleString()}`,
      type: "quiz"
    })

    console.log(`Faculty notified about quiz retake: ${studentName} - ${quizTitle} (Attempt #${attemptNumber})`)
    return true
  } catch (error) {
    console.error("Error notifying faculty about quiz retake:", error)
    return false
  }
}

/**
 * ENROLLMENT ACTIVITY NOTIFICATIONS
 */

// Notify faculty when student enrolls in course
export async function notifyFacultyStudentEnrollment(
  instructorId: string,
  studentName: string,
  courseTitle: string,
  enrolledAt: string
): Promise<boolean> {
  try {
    await createNotification(instructorId, {
      title: "👥 New Student Enrollment",
      message: `${studentName} enrolled in "${courseTitle}" at ${new Date(enrolledAt).toLocaleString()}`,
      type: "enrollment"
    })

    console.log(`Faculty notified about student enrollment: ${studentName} - ${courseTitle}`)
    return true
  } catch (error) {
    console.error("Error notifying faculty about student enrollment:", error)
    return false
  }
}

// Notify faculty when student drops course
export async function notifyFacultyStudentDrop(
  instructorId: string,
  studentName: string,
  courseTitle: string,
  droppedAt: string
): Promise<boolean> {
  try {
    await createNotification(instructorId, {
      title: "👋 Student Dropped Course",
      message: `${studentName} dropped "${courseTitle}" at ${new Date(droppedAt).toLocaleString()}`,
      type: "enrollment"
    })

    console.log(`Faculty notified about student drop: ${studentName} - ${courseTitle}`)
    return true
  } catch (error) {
    console.error("Error notifying faculty about student drop:", error)
    return false
  }
}

/**
 * GENERAL STUDENT ACTIVITY NOTIFICATIONS
 */

// Notify faculty when student logs in to course
export async function notifyFacultyStudentLogin(
  instructorId: string,
  studentName: string,
  courseTitle: string,
  loggedInAt: string
): Promise<boolean> {
  try {
    await createNotification(instructorId, {
      title: "🔐 Student Activity",
      message: `${studentName} accessed "${courseTitle}" at ${new Date(loggedInAt).toLocaleString()}`,
      type: "activity"
    })

    console.log(`Faculty notified about student login: ${studentName} - ${courseTitle}`)
    return true
  } catch (error) {
    console.error("Error notifying faculty about student login:", error)
    return false
  }
}

// Notify faculty when student views course materials
export async function notifyFacultyStudentActivity(
  instructorId: string,
  studentName: string,
  activityType: string,
  courseTitle: string,
  activityAt: string
): Promise<boolean> {
  try {
    await createNotification(instructorId, {
      title: "📖 Student Activity",
      message: `${studentName} ${activityType} in "${courseTitle}" at ${new Date(activityAt).toLocaleString()}`,
      type: "activity"
    })

    console.log(`Faculty notified about student activity: ${studentName} - ${activityType} in ${courseTitle}`)
    return true
  } catch (error) {
    console.error("Error notifying faculty about student activity:", error)
    return false
  }
}

/**
 * BULK NOTIFICATIONS FOR FACULTY
 */

// Notify faculty about multiple student activities
export async function notifyFacultyBulkActivity(
  instructorId: string,
  activities: Array<{
    studentName: string
    activityType: string
    courseTitle: string
    timestamp: string
  }>
): Promise<boolean> {
  try {
    if (activities.length === 0) return true

    const activitySummary = activities
      .map(activity => `${activity.studentName}: ${activity.activityType}`)
      .join(", ")

    await createNotification(instructorId, {
      title: "📊 Multiple Student Activities",
      message: `Recent activities in your courses: ${activitySummary}`,
      type: "activity"
    })

    console.log(`Faculty notified about bulk activities: ${activities.length} activities`)
    return true
  } catch (error) {
    console.error("Error notifying faculty about bulk activities:", error)
    return false
  }
}

/**
 * UTILITY FUNCTIONS
 */

// Get course instructor by course ID
export async function getCourseInstructor(courseId: string): Promise<string | null> {
  try {
    const supabase = createClient()
    
    const { data: course, error } = await supabase
      .from("courses")
      .select("instructor_id")
      .eq("id", courseId)
      .single()

    if (error) throw error
    return course?.instructor_id || null
  } catch (error) {
    console.error("Error getting course instructor:", error)
    return null
  }
}

// Get student name by ID
export async function getStudentName(studentId: string): Promise<string> {
  try {
    const supabase = createClient()
    
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", studentId)
      .single()

    if (error) throw error
    return profile?.full_name || "Student"
  } catch (error) {
    console.error("Error getting student name:", error)
    return "Student"
  }
}

// Get course title by ID
export async function getCourseTitle(courseId: string): Promise<string> {
  try {
    const supabase = createClient()
    
    const { data: course, error } = await supabase
      .from("courses")
      .select("title")
      .eq("id", courseId)
      .single()

    if (error) throw error
    return course?.title || "Course"
  } catch (error) {
    console.error("Error getting course title:", error)
    return "Course"
  }
}

/**
 * COMPREHENSIVE ACTIVITY TRACKING
 */

// Track and notify faculty about all student activities
export async function trackStudentActivity(
  studentId: string,
  courseId: string,
  activityType: string,
  details?: any
): Promise<boolean> {
  try {
    const instructorId = await getCourseInstructor(courseId)
    if (!instructorId) return false

    const studentName = await getStudentName(studentId)
    const courseTitle = await getCourseTitle(courseId)
    const timestamp = new Date().toISOString()

    // Notify faculty based on activity type
    switch (activityType) {
      case 'assignment_submitted':
        await notifyFacultyAssignmentSubmission(
          instructorId,
          studentName,
          details?.assignmentTitle || "Assignment",
          courseTitle,
          timestamp
        )
        break
      
      case 'quiz_started':
        await notifyFacultyQuizStarted(
          instructorId,
          studentName,
          details?.quizTitle || "Quiz",
          courseTitle,
          timestamp
        )
        break
      
      case 'quiz_completed':
        await notifyFacultyQuizCompleted(
          instructorId,
          studentName,
          details?.quizTitle || "Quiz",
          courseTitle,
          timestamp,
          details?.score,
          details?.maxScore
        )
        break
      
      case 'enrollment':
        await notifyFacultyStudentEnrollment(
          instructorId,
          studentName,
          courseTitle,
          timestamp
        )
        break
      
      default:
        await notifyFacultyStudentActivity(
          instructorId,
          studentName,
          activityType,
          courseTitle,
          timestamp
        )
    }

    return true
  } catch (error) {
    console.error("Error tracking student activity:", error)
    return false
  }
}





















