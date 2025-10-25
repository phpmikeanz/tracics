import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/types"

type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"]
type Notification = Database["public"]["Tables"]["notifications"]["Row"]

export interface NotificationData {
  title: string
  message: string
  type: 'assignment' | 'grade' | 'announcement' | 'quiz' | 'enrollment'
}

// Create a notification for a specific user
export async function createNotification(
  userId: string,
  notificationData: NotificationData
): Promise<Notification | null> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        ...notificationData
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Unexpected error creating notification:', error)
    return null
  }
}

// Create notifications for multiple users (bulk)
export async function createBulkNotifications(
  userIds: string[],
  notificationData: NotificationData
): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const notifications = userIds.map(userId => ({
      user_id: userId,
      ...notificationData
    }))

    const { error } = await supabase
      .from('notifications')
      .insert(notifications)

    if (error) {
      console.error('Error creating bulk notifications:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Unexpected error creating bulk notifications:', error)
    return false
  }
}

// Get all notifications for a user
export async function getUserNotifications(userId: string): Promise<Notification[]> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching notifications:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Unexpected error fetching notifications:', error)
    return []
  }
}

// Get unread notifications count
export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  try {
    const supabase = createClient()
    
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) {
      console.error('Error fetching unread count:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('Unexpected error fetching unread count:', error)
    return 0
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    if (error) {
      console.error('Error marking notification as read:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Unexpected error marking notification as read:', error)
    return false
  }
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) {
      console.error('Error marking all notifications as read:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Unexpected error marking all notifications as read:', error)
    return false
  }
}

// Delete a notification
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (error) {
      console.error('Error deleting notification:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Unexpected error deleting notification:', error)
    return false
  }
}

// Notification helper functions for specific events

// Notify students when a new assignment is created
export async function notifyNewAssignment(
  courseId: string,
  assignmentTitle: string,
  dueDate?: string
): Promise<boolean> {
  try {
    const supabase = createClient()
    
    // Get all enrolled students in the course
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('course_id', courseId)
      .eq('status', 'approved')

    if (error || !enrollments) {
      console.error('Error fetching enrolled students:', error)
      return false
    }

    const studentIds = enrollments.map(e => e.student_id)
    
    if (studentIds.length === 0) return true

    const notificationData: NotificationData = {
      title: 'New Assignment',
      message: `A new assignment "${assignmentTitle}" has been posted${dueDate ? ` and is due on ${new Date(dueDate).toLocaleDateString()}` : ''}.`,
      type: 'assignment'
    }

    return await createBulkNotifications(studentIds, notificationData)
  } catch (error) {
    console.error('Error notifying new assignment:', error)
    return false
  }
}

// Notify student when their assignment is graded
export async function notifyAssignmentGraded(
  studentId: string,
  assignmentTitle: string,
  grade: number,
  maxPoints: number
): Promise<boolean> {
  const notificationData: NotificationData = {
    title: 'Assignment Graded',
    message: `Your assignment "${assignmentTitle}" has been graded. You received ${grade}/${maxPoints} points.`,
    type: 'grade'
  }

  const result = await createNotification(studentId, notificationData)
  return result !== null
}

// Notify faculty when a student submits an assignment
export async function notifyAssignmentSubmitted(
  instructorId: string,
  studentName: string,
  assignmentTitle: string
): Promise<boolean> {
  const notificationData: NotificationData = {
    title: 'Assignment Submitted',
    message: `${studentName} has submitted their assignment for "${assignmentTitle}".`,
    type: 'assignment'
  }

  const result = await createNotification(instructorId, notificationData)
  return result !== null
}

// Notify when enrollment status changes
export async function notifyEnrollmentStatusChange(
  studentId: string,
  courseTitle: string,
  status: 'approved' | 'declined'
): Promise<boolean> {
  const notificationData: NotificationData = {
    title: 'Enrollment Update',
    message: `Your enrollment request for "${courseTitle}" has been ${status}.`,
    type: 'enrollment'
  }

  const result = await createNotification(studentId, notificationData)
  return result !== null
}

// Get students enrolled in a course
export async function getEnrolledStudents(courseId: string): Promise<string[]> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('course_id', courseId)
      .eq('status', 'approved')

    if (error) {
      console.error('Error fetching enrolled students:', error)
      return []
    }

    return data?.map(e => e.student_id) || []
  } catch (error) {
    console.error('Unexpected error fetching enrolled students:', error)
    return []
  }
}

