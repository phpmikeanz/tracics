import { createClient } from "@/lib/supabase/client"
import { createNotification, createBulkNotifications } from "./notifications"

export interface TTRACNotificationData {
  title: string
  message: string
  type: 'assignment' | 'grade' | 'announcement' | 'quiz' | 'enrollment' | 'course'
}

/**
 * COURSE NOTIFICATIONS
 */

// Notify students when a new course is created
export async function notifyNewCourse(
  courseId: string,
  courseTitle: string,
  instructorName: string
): Promise<boolean> {
  try {
    const supabase = createClient()
    
    // Get all enrolled students for the course
    const { data: enrollments, error } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("course_id", courseId)
      .eq("status", "approved")

    if (error || !enrollments || enrollments.length === 0) {
      console.log("No enrolled students found for course:", courseId)
      return false
    }

    const studentIds = enrollments.map(e => e.student_id)
    
    await createBulkNotifications(studentIds, {
      title: `New Course: ${courseTitle}`,
      message: `You have been enrolled in "${courseTitle}" by ${instructorName}. Check your dashboard for course materials.`,
      type: "course"
    })

    console.log(`Notified ${studentIds.length} students about new course: ${courseTitle}`)
    return true
  } catch (error) {
    console.error("Error notifying students about new course:", error)
    return false
  }
}

// Notify instructor when student enrolls in course
export async function notifyCourseEnrollment(
  instructorId: string,
  studentName: string,
  courseTitle: string
): Promise<boolean> {
  try {
    await createNotification(instructorId, {
      title: "New Course Enrollment",
      message: `${studentName} has enrolled in "${courseTitle}". You can approve or decline this enrollment.`,
      type: "enrollment"
    })

    console.log(`Notified instructor about enrollment: ${studentName} in ${courseTitle}`)
    return true
  } catch (error) {
    console.error("Error notifying instructor about enrollment:", error)
    return false
  }
}

/**
 * ENROLLMENT NOTIFICATIONS
 */

// Notify student when enrollment is approved
export async function notifyEnrollmentApproved(
  studentId: string,
  courseTitle: string,
  instructorName: string
): Promise<boolean> {
  try {
    await createNotification(studentId, {
      title: "Enrollment Approved",
      message: `Your enrollment in "${courseTitle}" has been approved by ${instructorName}. You can now access course materials.`,
      type: "enrollment"
    })

    console.log(`Notified student about approved enrollment: ${courseTitle}`)
    return true
  } catch (error) {
    console.error("Error notifying student about approved enrollment:", error)
    return false
  }
}

// Notify student when enrollment is declined
export async function notifyEnrollmentDeclined(
  studentId: string,
  courseTitle: string,
  instructorName: string,
  reason?: string
): Promise<boolean> {
  try {
    const message = reason 
      ? `Your enrollment in "${courseTitle}" has been declined by ${instructorName}. Reason: ${reason}`
      : `Your enrollment in "${courseTitle}" has been declined by ${instructorName}.`

    await createNotification(studentId, {
      title: "Enrollment Declined",
      message: message,
      type: "enrollment"
    })

    console.log(`Notified student about declined enrollment: ${courseTitle}`)
    return true
  } catch (error) {
    console.error("Error notifying student about declined enrollment:", error)
    return false
  }
}

/**
 * ASSIGNMENT NOTIFICATIONS
 */

// Notify students when new assignment is created
export async function notifyNewAssignment(
  courseId: string,
  assignmentTitle: string,
  dueDate?: string,
  instructorName?: string
): Promise<boolean> {
  try {
    const supabase = createClient()
    
    // Get all enrolled students for the course
    const { data: enrollments, error } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("course_id", courseId)
      .eq("status", "approved")

    if (error || !enrollments || enrollments.length === 0) {
      console.log("No enrolled students found for course:", courseId)
      return false
    }

    const studentIds = enrollments.map(e => e.student_id)
    
    const dueDateText = dueDate 
      ? `Due: ${new Date(dueDate).toLocaleDateString()}`
      : "No due date"

    const instructorText = instructorName ? ` by ${instructorName}` : ""

    await createBulkNotifications(studentIds, {
      title: `New Assignment: ${assignmentTitle}`,
      message: `A new assignment "${assignmentTitle}" has been posted${instructorText}. ${dueDateText}. Please check your assignments.`,
      type: "assignment"
    })

    console.log(`Notified ${studentIds.length} students about new assignment: ${assignmentTitle}`)
    return true
  } catch (error) {
    console.error("Error notifying students about new assignment:", error)
    return false
  }
}

// Notify instructor when student submits assignment
export async function notifyAssignmentSubmitted(
  instructorId: string,
  studentName: string,
  assignmentTitle: string
): Promise<boolean> {
  try {
    await createNotification(instructorId, {
      title: "Assignment Submitted",
      message: `${studentName} has submitted their assignment "${assignmentTitle}". You can now review and grade it.`,
      type: "assignment"
    })

    console.log(`Notified instructor about assignment submission: ${studentName} - ${assignmentTitle}`)
    return true
  } catch (error) {
    console.error("Error notifying instructor about assignment submission:", error)
    return false
  }
}

// Notify student when assignment is graded
export async function notifyAssignmentGraded(
  studentId: string,
  assignmentTitle: string,
  grade: number,
  maxPoints: number,
  feedback?: string
): Promise<boolean> {
  try {
    const percentage = Math.round((grade / maxPoints) * 100)
    const gradeText = feedback 
      ? `Grade: ${grade}/${maxPoints} (${percentage}%). Feedback: ${feedback}`
      : `Grade: ${grade}/${maxPoints} (${percentage}%)`

    await createNotification(studentId, {
      title: "Assignment Graded",
      message: `Your assignment "${assignmentTitle}" has been graded. ${gradeText}`,
      type: "grade"
    })

    console.log(`Notified student about graded assignment: ${assignmentTitle}`)
    return true
  } catch (error) {
    console.error("Error notifying student about graded assignment:", error)
    return false
  }
}

/**
 * QUIZ NOTIFICATIONS
 */

// Notify students when new quiz is created
export async function notifyNewQuiz(
  courseId: string,
  quizTitle: string,
  dueDate?: string,
  instructorName?: string
): Promise<boolean> {
  try {
    const supabase = createClient()
    
    // Get all enrolled students for the course
    const { data: enrollments, error } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("course_id", courseId)
      .eq("status", "approved")

    if (error || !enrollments || enrollments.length === 0) {
      console.log("No enrolled students found for course:", courseId)
      return false
    }

    const studentIds = enrollments.map(e => e.student_id)
    
    const dueDateText = dueDate 
      ? `Due: ${new Date(dueDate).toLocaleDateString()}`
      : "No due date"

    const instructorText = instructorName ? ` by ${instructorName}` : ""

    await createBulkNotifications(studentIds, {
      title: `New Quiz: ${quizTitle}`,
      message: `A new quiz "${quizTitle}" has been posted${instructorText}. ${dueDateText}. Please check your quizzes.`,
      type: "quiz"
    })

    console.log(`Notified ${studentIds.length} students about new quiz: ${quizTitle}`)
    return true
  } catch (error) {
    console.error("Error notifying students about new quiz:", error)
    return false
  }
}

// Notify student when quiz is graded
export async function notifyQuizGraded(
  studentId: string,
  quizTitle: string,
  score: number,
  maxScore: number,
  feedback?: string
): Promise<boolean> {
  try {
    const percentage = Math.round((score / maxScore) * 100)
    const scoreText = feedback 
      ? `Score: ${score}/${maxScore} (${percentage}%). Feedback: ${feedback}`
      : `Score: ${score}/${maxScore} (${percentage}%)`

    await createNotification(studentId, {
      title: "Quiz Graded",
      message: `Your quiz "${quizTitle}" has been graded. ${scoreText}`,
      type: "grade"
    })

    console.log(`Notified student about graded quiz: ${quizTitle}`)
    return true
  } catch (error) {
    console.error("Error notifying student about graded quiz:", error)
    return false
  }
}

/**
 * ANNOUNCEMENT NOTIFICATIONS
 */

// Notify students about course announcements
export async function notifyCourseAnnouncement(
  courseId: string,
  announcementTitle: string,
  announcementMessage: string,
  instructorName: string
): Promise<boolean> {
  try {
    const supabase = createClient()
    
    // Get all enrolled students for the course
    const { data: enrollments, error } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("course_id", courseId)
      .eq("status", "approved")

    if (error || !enrollments || enrollments.length === 0) {
      console.log("No enrolled students found for course:", courseId)
      return false
    }

    const studentIds = enrollments.map(e => e.student_id)
    
    await createBulkNotifications(studentIds, {
      title: `Announcement: ${announcementTitle}`,
      message: `${instructorName}: ${announcementMessage}`,
      type: "announcement"
    })

    console.log(`Notified ${studentIds.length} students about announcement: ${announcementTitle}`)
    return true
  } catch (error) {
    console.error("Error notifying students about announcement:", error)
    return false
  }
}

/**
 * UTILITY FUNCTIONS
 */

// Get enrolled students for a course
export async function getEnrolledStudents(courseId: string): Promise<string[]> {
  try {
    const supabase = createClient()
    
    const { data: enrollments, error } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("course_id", courseId)
      .eq("status", "approved")

    if (error) throw error
    return enrollments?.map(e => e.student_id) || []
  } catch (error) {
    console.error("Error getting enrolled students:", error)
    return []
  }
}

// Get course instructor
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

// Get user name by ID
export async function getUserName(userId: string): Promise<string> {
  try {
    const supabase = createClient()
    
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single()

    if (error) throw error
    return profile?.full_name || "User"
  } catch (error) {
    console.error("Error getting user name:", error)
    return "User"
  }
}



















