import { createClient } from "@/lib/supabase/client"
import { createNotification, createBulkNotifications, getEnrolledStudents } from "./notifications"

export interface AssignmentNotificationData {
  assignmentId: string
  courseId: string
  title: string
  description?: string
  dueDate?: string
  maxPoints: number
  instructorId: string
  instructorName: string
}

export interface SubmissionNotificationData {
  submissionId: string
  assignmentId: string
  assignmentTitle: string
  studentId: string
  studentName: string
  instructorId: string
  submittedAt: string
  fileUrl?: string
  content?: string
}

export interface GradeNotificationData {
  submissionId: string
  assignmentId: string
  assignmentTitle: string
  studentId: string
  grade: number
  maxPoints: number
  feedback?: string
  gradedAt: string
}

/**
 * Notify all enrolled students when a new assignment is created
 */
export async function notifyNewAssignmentCreated(
  data: AssignmentNotificationData
): Promise<boolean> {
  try {
    const studentIds = await getEnrolledStudents(data.courseId)
    
    if (studentIds.length === 0) {
      console.log("No enrolled students found for course:", data.courseId)
      return false
    }

    const dueDateText = data.dueDate 
      ? `Due: ${new Date(data.dueDate).toLocaleDateString()}`
      : "No due date"

    await createBulkNotifications(studentIds, {
      title: `New Assignment: ${data.title}`,
      message: `${data.description || "New assignment posted"}. ${dueDateText}. Worth ${data.maxPoints} points.`,
      type: "assignment"
    })

    console.log(`Notified ${studentIds.length} students about new assignment: ${data.title}`)
    return true
  } catch (error) {
    console.error("Error notifying students about new assignment:", error)
    return false
  }
}

/**
 * Notify instructor when a student submits an assignment
 */
export async function notifyAssignmentSubmitted(
  data: SubmissionNotificationData
): Promise<boolean> {
  try {
    await createNotification(data.instructorId, {
      title: `New Submission: ${data.assignmentTitle}`,
      message: `${data.studentName} has submitted their assignment. Submitted at ${new Date(data.submittedAt).toLocaleString()}.`,
      type: "assignment"
    })

    console.log(`Notified instructor about submission from ${data.studentName}`)
    return true
  } catch (error) {
    console.error("Error notifying instructor about submission:", error)
    return false
  }
}

/**
 * Notify student when their assignment is graded
 */
export async function notifyAssignmentGraded(
  data: GradeNotificationData
): Promise<boolean> {
  try {
    const percentage = Math.round((data.grade / data.maxPoints) * 100)
    const gradeText = data.feedback 
      ? `Grade: ${data.grade}/${data.maxPoints} (${percentage}%). Feedback: ${data.feedback}`
      : `Grade: ${data.grade}/${data.maxPoints} (${percentage}%)`

    await createNotification(data.studentId, {
      title: `Assignment Graded: ${data.assignmentTitle}`,
      message: gradeText,
      type: "grade"
    })

    console.log(`Notified student about graded assignment: ${data.assignmentTitle}`)
    return true
  } catch (error) {
    console.error("Error notifying student about grade:", error)
    return false
  }
}

/**
 * Notify students about assignment updates
 */
export async function notifyAssignmentUpdated(
  courseId: string,
  assignmentTitle: string,
  changes: string[]
): Promise<boolean> {
  try {
    const studentIds = await getEnrolledStudents(courseId)
    
    if (studentIds.length === 0) {
      console.log("No enrolled students found for course:", courseId)
      return false
    }

    const changesText = changes.join(", ")
    await createBulkNotifications(studentIds, {
      title: `Assignment Updated: ${assignmentTitle}`,
      message: `The assignment has been updated. Changes: ${changesText}. Please review the updated requirements.`,
      type: "assignment"
    })

    console.log(`Notified ${studentIds.length} students about assignment update: ${assignmentTitle}`)
    return true
  } catch (error) {
    console.error("Error notifying students about assignment update:", error)
    return false
  }
}

/**
 * Notify students about due date reminders
 */
export async function notifyDueDateReminder(
  courseId: string,
  assignmentTitle: string,
  dueDate: string,
  hoursUntilDue: number
): Promise<boolean> {
  try {
    const studentIds = await getEnrolledStudents(courseId)
    
    if (studentIds.length === 0) {
      console.log("No enrolled students found for course:", courseId)
      return false
    }

    const timeText = hoursUntilDue < 24 
      ? `${hoursUntilDue} hours`
      : `${Math.round(hoursUntilDue / 24)} days`

    await createBulkNotifications(studentIds, {
      title: `Due Date Reminder: ${assignmentTitle}`,
      message: `This assignment is due in ${timeText} (${new Date(dueDate).toLocaleString()}). Please submit your work on time.`,
      type: "assignment"
    })

    console.log(`Sent due date reminder to ${studentIds.length} students for: ${assignmentTitle}`)
    return true
  } catch (error) {
    console.error("Error sending due date reminder:", error)
    return false
  }
}

/**
 * Notify instructor about late submissions
 */
export async function notifyLateSubmission(
  instructorId: string,
  studentName: string,
  assignmentTitle: string,
  submittedAt: string,
  dueDate: string
): Promise<boolean> {
  try {
    const hoursLate = Math.round((new Date(submittedAt).getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60))
    
    await createNotification(instructorId, {
      title: `Late Submission: ${assignmentTitle}`,
      message: `${studentName} submitted their assignment ${hoursLate} hours after the due date. Due: ${new Date(dueDate).toLocaleString()}, Submitted: ${new Date(submittedAt).toLocaleString()}.`,
      type: "assignment"
    })

    console.log(`Notified instructor about late submission from ${studentName}`)
    return true
  } catch (error) {
    console.error("Error notifying instructor about late submission:", error)
    return false
  }
}

/**
 * Notify students about assignment announcements
 */
export async function notifyAssignmentAnnouncement(
  courseId: string,
  assignmentTitle: string,
  announcement: string
): Promise<boolean> {
  try {
    const studentIds = await getEnrolledStudents(courseId)
    
    if (studentIds.length === 0) {
      console.log("No enrolled students found for course:", courseId)
      return false
    }

    await createBulkNotifications(studentIds, {
      title: `Announcement: ${assignmentTitle}`,
      message: announcement,
      type: "announcement"
    })

    console.log(`Sent announcement to ${studentIds.length} students for: ${assignmentTitle}`)
    return true
  } catch (error) {
    console.error("Error sending assignment announcement:", error)
    return false
  }
}

/**
 * Get real-time notification updates for assignment activities
 */
export async function getAssignmentNotifications(
  userId: string,
  assignmentId?: string
): Promise<any[]> {
  try {
    const supabase = createClient()
    
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .in("type", ["assignment", "grade", "announcement"])
      .order("created_at", { ascending: false })
      .limit(50)

    if (assignmentId) {
      // Filter notifications related to specific assignment
      query = query.or(`title.ilike.%${assignmentId}%,message.ilike.%${assignmentId}%`)
    }

    const { data, error } = await query

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Error fetching assignment notifications:", error)
    return []
  }
}

/**
 * Mark assignment-related notifications as read
 */
export async function markAssignmentNotificationsAsRead(
  userId: string,
  assignmentId?: string
): Promise<boolean> {
  try {
    const supabase = createClient()
    
    let query = supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .in("type", ["assignment", "grade", "announcement"])

    if (assignmentId) {
      query = query.or(`title.ilike.%${assignmentId}%,message.ilike.%${assignmentId}%`)
    }

    const { error } = await query

    if (error) throw error

    console.log("Marked assignment notifications as read")
    return true
  } catch (error) {
    console.error("Error marking assignment notifications as read:", error)
    return false
  }
}

/**
 * Set up real-time subscription for assignment notifications
 */
export function subscribeToAssignmentNotifications(
  userId: string,
  onNotification: (notification: any) => void
) {
  const supabase = createClient()
  
  return supabase
    .channel("assignment-notifications")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new && ["assignment", "grade", "announcement"].includes(payload.new.type)) {
          onNotification(payload.new)
        }
      }
    )
    .subscribe()
}


















