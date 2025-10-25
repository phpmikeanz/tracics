import { createClient } from "@/lib/supabase/client"

/**
 * Supabase Notification Integration
 * Connects the comprehensive notification system to your Supabase database
 */

export interface SupabaseNotification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  read: boolean
  course_id?: string
  assignment_id?: string
  quiz_id?: string
  enrollment_id?: string
  submission_id?: string
  attempt_id?: string
  created_at: string
  updated_at?: string
}

/**
 * Create notification in Supabase database
 */
export async function createSupabaseNotification(notification: Omit<SupabaseNotification, 'id' | 'created_at'>): Promise<{ success: boolean; notification?: SupabaseNotification; error?: string }> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: notification.user_id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: notification.read,
        course_id: notification.course_id,
        enrollment_id: notification.enrollment_id,
        submission_id: notification.submission_id,
        attempt_id: notification.attempt_id,
        assignment_id: notification.assignment_id,
        quiz_id: notification.quiz_id,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error("Error creating notification in Supabase:", error)
      return { success: false, error: error.message }
    }
    
    console.log("✅ Notification created in Supabase:", data.id)
    return { success: true, notification: data }
    
  } catch (error) {
    console.error("Error in createSupabaseNotification:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Get notifications for user from Supabase
 */
export async function getSupabaseNotifications(userId: string, limit: number = 50): Promise<{ success: boolean; notifications: SupabaseNotification[]; error?: string }> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error("Error fetching notifications from Supabase:", error)
      return { success: false, notifications: [], error: error.message }
    }
    
    console.log(`✅ Fetched ${data?.length || 0} notifications from Supabase`)
    return { success: true, notifications: data || [] }
    
  } catch (error) {
    console.error("Error in getSupabaseNotifications:", error)
    return { success: false, notifications: [], error: error.message }
  }
}

/**
 * Get unread notification count from Supabase
 */
export async function getSupabaseUnreadCount(userId: string): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const supabase = createClient()
    
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false)
    
    if (error) {
      console.error("Error fetching unread count from Supabase:", error)
      return { success: false, count: 0, error: error.message }
    }
    
    console.log(`✅ Unread count from Supabase: ${count || 0}`)
    return { success: true, count: count || 0 }
    
  } catch (error) {
    console.error("Error in getSupabaseUnreadCount:", error)
    return { success: false, count: 0, error: error.message }
  }
}

/**
 * Mark notification as read in Supabase
 */
export async function markSupabaseNotificationAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from("notifications")
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq("id", notificationId)
    
    if (error) {
      console.error("Error marking notification as read in Supabase:", error)
      return { success: false, error: error.message }
    }
    
    console.log("✅ Notification marked as read in Supabase")
    return { success: true }
    
  } catch (error) {
    console.error("Error in markSupabaseNotificationAsRead:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Mark all notifications as read in Supabase
 */
export async function markAllSupabaseNotificationsAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from("notifications")
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("read", false)
    
    if (error) {
      console.error("Error marking all notifications as read in Supabase:", error)
      return { success: false, error: error.message }
    }
    
    console.log("✅ All notifications marked as read in Supabase")
    return { success: true }
    
  } catch (error) {
    console.error("Error in markAllSupabaseNotificationsAsRead:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete notification from Supabase
 */
export async function deleteSupabaseNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
    
    if (error) {
      console.error("Error deleting notification from Supabase:", error)
      return { success: false, error: error.message }
    }
    
    console.log("✅ Notification deleted from Supabase")
    return { success: true }
    
  } catch (error) {
    console.error("Error in deleteSupabaseNotification:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Get course details from Supabase
 */
export async function getSupabaseCourseDetails(courseId: string): Promise<{ success: boolean; course?: any; error?: string }> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from("courses")
      .select(`
        id, title, instructor_id, course_code, credits
      `)
      .eq("id", courseId)
      .single()
    
    if (error) {
      console.error("Error fetching course details from Supabase:", error)
      return { success: false, error: error.message }
    }
    
    return { success: true, course: data }
    
  } catch (error) {
    console.error("Error in getSupabaseCourseDetails:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Get student details from Supabase
 */
export async function getSupabaseStudentDetails(studentId: string): Promise<{ success: boolean; student?: any; error?: string }> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", studentId)
      .single()
    
    if (error) {
      console.error("Error fetching student details from Supabase:", error)
      return { success: false, error: error.message }
    }
    
    return { success: true, student: data }
    
  } catch (error) {
    console.error("Error in getSupabaseStudentDetails:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Get assignment details from Supabase
 */
export async function getSupabaseAssignmentDetails(assignmentId: string): Promise<{ success: boolean; assignment?: any; error?: string }> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from("assignments")
      .select(`
        id, title, due_date, course_id,
        courses!inner(id, title, instructor_id)
      `)
      .eq("id", assignmentId)
      .single()
    
    if (error) {
      console.error("Error fetching assignment details from Supabase:", error)
      return { success: false, error: error.message }
    }
    
    return { success: true, assignment: data }
    
  } catch (error) {
    console.error("Error in getSupabaseAssignmentDetails:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Get quiz details from Supabase
 */
export async function getSupabaseQuizDetails(quizId: string): Promise<{ success: boolean; quiz?: any; error?: string }> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from("quizzes")
      .select(`
        id, title, course_id, time_limit, max_attempts, due_date, status,
        courses!inner(id, title, instructor_id)
      `)
      .eq("id", quizId)
      .single()
    
    if (error) {
      console.error("Error fetching quiz details from Supabase:", error)
      return { success: false, error: error.message }
    }
    
    return { success: true, quiz: data }
    
  } catch (error) {
    console.error("Error in getSupabaseQuizDetails:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Get enrollment details from Supabase
 */
export async function getSupabaseEnrollmentDetails(enrollmentId: string): Promise<{ success: boolean; enrollment?: any; error?: string }> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from("enrollments")
      .select(`
        id, student_id, course_id, status, created_at,
        courses!inner(id, title, instructor_id),
        profiles!inner(id, full_name)
      `)
      .eq("id", enrollmentId)
      .single()
    
    if (error) {
      console.error("Error fetching enrollment details from Supabase:", error)
      return { success: false, error: error.message }
    }
    
    return { success: true, enrollment: data }
    
  } catch (error) {
    console.error("Error in getSupabaseEnrollmentDetails:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Get all students enrolled in a course from Supabase
 */
export async function getSupabaseCourseStudents(courseId: string): Promise<{ success: boolean; students: any[]; error?: string }> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from("enrollments")
      .select(`
        student_id,
        profiles!inner(id, full_name, email)
      `)
      .eq("course_id", courseId)
      .eq("status", "approved")
    
    if (error) {
      console.error("Error fetching course students from Supabase:", error)
      return { success: false, students: [], error: error.message }
    }
    
    return { success: true, students: data || [] }
    
  } catch (error) {
    console.error("Error in getSupabaseCourseStudents:", error)
    return { success: false, students: [], error: error.message }
  }
}

/**
 * Check if user is enrolled in course from Supabase
 */
export async function checkSupabaseEnrollment(studentId: string, courseId: string): Promise<{ success: boolean; enrolled: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", studentId)
      .eq("course_id", courseId)
      .eq("status", "approved")
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error("Error checking enrollment in Supabase:", error)
      return { success: false, enrolled: false, error: error.message }
    }
    
    return { success: true, enrolled: !!data }
    
  } catch (error) {
    console.error("Error in checkSupabaseEnrollment:", error)
    return { success: false, enrolled: false, error: error.message }
  }
}
