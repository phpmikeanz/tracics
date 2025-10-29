import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/types"

type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"]
type Notification = Database["public"]["Tables"]["notifications"]["Row"]

export interface NotificationData {
  title: string
  message: string
  type: 'assignment' | 'grade' | 'announcement' | 'quiz' | 'enrollment' | 'course_material'
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
    console.log('📝 createBulkNotifications called:', { userIds: userIds.length, notificationData })
    
    const supabase = createClient()
    
    const notifications = userIds.map(userId => ({
      user_id: userId,
      ...notificationData
    }))

    console.log('📋 Prepared notifications:', notifications)

    const { error } = await supabase
      .from('notifications')
      .insert(notifications)

    if (error) {
      console.error('❌ Error creating bulk notifications:', error)
      return false
    }

    console.log('✅ Bulk notifications created successfully')
    return true
  } catch (error) {
    console.error('❌ Unexpected error creating bulk notifications:', error)
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
    console.log('👥 getEnrolledStudents called for course:', courseId)
    
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('course_id', courseId)
      .eq('status', 'approved')

    if (error) {
      console.error('❌ Error fetching enrolled students:', error)
      return []
    }

    const studentIds = data?.map(e => e.student_id) || []
    console.log('👥 Found enrolled students:', studentIds.length, studentIds)
    
    return studentIds
  } catch (error) {
    console.error('❌ Unexpected error fetching enrolled students:', error)
    return []
  }
}

// QUIZ NOTIFICATION FUNCTIONS

// Notify faculty when a student completes a quiz
export async function notifyQuizCompleted(
  instructorId: string,
  studentName: string,
  quizTitle: string,
  score?: number,
  maxScore?: number
): Promise<boolean> {
  const scoreText = score !== undefined && maxScore !== undefined 
    ? ` (Score: ${score}/${maxScore})` 
    : ''
    
  const notificationData: NotificationData = {
    title: 'Quiz Completed',
    message: `${studentName} has completed the quiz "${quizTitle}"${scoreText}.`,
    type: 'quiz'
  }

  const result = await createNotification(instructorId, notificationData)
  return result !== null
}

// Notify students when a new quiz is published
export async function notifyNewQuiz(
  courseId: string,
  quizTitle: string,
  dueDate?: string
): Promise<boolean> {
  try {
    console.log('🔔 notifyNewQuiz called:', { courseId, quizTitle, dueDate })
    
    const studentIds = await getEnrolledStudents(courseId)
    console.log('📚 Enrolled students found:', studentIds.length)
    
    if (studentIds.length === 0) {
      console.log('⚠️ No enrolled students found for course:', courseId)
      return true
    }

    const notificationData: NotificationData = {
      title: 'New Quiz Available',
      message: `A new quiz "${quizTitle}" is now available${dueDate ? ` and is due on ${new Date(dueDate).toLocaleDateString()}` : ''}.`,
      type: 'quiz'
    }

    console.log('📝 Creating bulk notifications for students:', studentIds)
    const result = await createBulkNotifications(studentIds, notificationData)
    console.log('✅ Bulk notification result:', result)
    
    return result
  } catch (error) {
    console.error('❌ Error notifying new quiz:', error)
    return false
  }
}

// Notify student when their quiz is graded
export async function notifyQuizGraded(
  studentId: string,
  quizTitle: string,
  score: number,
  maxScore: number
): Promise<boolean> {
  const notificationData: NotificationData = {
    title: 'Quiz Graded',
    message: `Your quiz "${quizTitle}" has been graded. You received ${score}/${maxScore} points.`,
    type: 'grade'
  }

  const result = await createNotification(studentId, notificationData)
  return result !== null
}

// ASSIGNMENT NOTIFICATION FUNCTIONS

// Notify students when a new assignment is published
export async function notifyNewAssignmentPublished(
  courseId: string,
  assignmentTitle: string,
  dueDate?: string
): Promise<boolean> {
  try {
    const studentIds = await getEnrolledStudents(courseId)
    
    if (studentIds.length === 0) return true

    const notificationData: NotificationData = {
      title: 'New Assignment Available',
      message: `A new assignment "${assignmentTitle}" is now available${dueDate ? ` and is due on ${new Date(dueDate).toLocaleDateString()}` : ''}.`,
      type: 'assignment'
    }

    return await createBulkNotifications(studentIds, notificationData)
  } catch (error) {
    console.error('Error notifying new assignment:', error)
    return false
  }
}

// Notify faculty when a student submits an assignment (enhanced)
export async function notifyAssignmentSubmission(
  instructorId: string,
  studentName: string,
  assignmentTitle: string,
  isLate: boolean = false
): Promise<boolean> {
  const lateText = isLate ? ' (Late submission)' : ''
  
  const notificationData: NotificationData = {
    title: 'Assignment Submitted',
    message: `${studentName} has submitted their assignment for "${assignmentTitle}"${lateText}.`,
    type: 'assignment'
  }

  const result = await createNotification(instructorId, notificationData)
  return result !== null
}

// Notify student when their assignment is graded (enhanced)
export async function notifyAssignmentGradedEnhanced(
  studentId: string,
  assignmentTitle: string,
  grade: number,
  maxPoints: number,
  feedback?: string
): Promise<boolean> {
  const feedbackText = feedback ? ` Feedback: ${feedback}` : ''
  
  const notificationData: NotificationData = {
    title: 'Assignment Graded',
    message: `Your assignment "${assignmentTitle}" has been graded. You received ${grade}/${maxPoints} points.${feedbackText}`,
    type: 'grade'
  }

  const result = await createNotification(studentId, notificationData)
  return result !== null
}

// UTILITY FUNCTIONS

// Get course instructor ID
export async function getCourseInstructor(courseId: string): Promise<string | null> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', courseId)
      .single()

    if (error) {
      console.error('Error fetching course instructor:', error)
      return null
    }

    return data?.instructor_id || null
  } catch (error) {
    console.error('Unexpected error fetching course instructor:', error)
    return null
  }
}

// Get student name by ID
export async function getStudentName(studentId: string): Promise<string | null> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', studentId)
      .single()

    if (error) {
      console.error('Error fetching student name:', error)
      return null
    }

    return data?.full_name || null
  } catch (error) {
    console.error('Unexpected error fetching student name:', error)
    return null
  }
}

// Get quiz title by ID
export async function getQuizTitle(quizId: string): Promise<string | null> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('quizzes')
      .select('title')
      .eq('id', quizId)
      .single()

    if (error) {
      console.error('Error fetching quiz title:', error)
      return null
    }

    return data?.title || null
  } catch (error) {
    console.error('Unexpected error fetching quiz title:', error)
    return null
  }
}

// Get assignment title by ID
export async function getAssignmentTitle(assignmentId: string): Promise<string | null> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('assignments')
      .select('title')
      .eq('id', assignmentId)
      .single()

    if (error) {
      console.error('Error fetching assignment title:', error)
      return null
    }

    return data?.title || null
  } catch (error) {
    console.error('Unexpected error fetching assignment title:', error)
    return null
  }
}

// COURSE MATERIALS NOTIFICATION FUNCTIONS

// Notify students when new course material is uploaded
export async function notifyNewCourseMaterial(
  courseId: string,
  materialTitle: string,
  materialType: string,
  isRequired: boolean = false
): Promise<boolean> {
  try {
    console.log('📚 notifyNewCourseMaterial called:', { courseId, materialTitle, materialType, isRequired })
    
    const studentIds = await getEnrolledStudents(courseId)
    console.log('👥 Enrolled students found for course materials:', studentIds.length)
    
    if (studentIds.length === 0) {
      console.log('⚠️ No enrolled students found for course:', courseId)
      return true
    }

    const requiredText = isRequired ? ' (Required)' : ''
    const materialTypeText = materialType === 'document' ? 'document' : 
                            materialType === 'video' ? 'video' : 
                            materialType === 'link' ? 'link' : 
                            materialType === 'assignment' ? 'assignment material' : 
                            materialType === 'quiz' ? 'quiz material' : 'material'

    const notificationData: NotificationData = {
      title: 'New Course Material Available',
      message: `A new ${materialTypeText} "${materialTitle}" has been uploaded to your course${requiredText}.`,
      type: 'course_material'
    }

    console.log('📝 Creating course material notifications for students:', studentIds)
    const result = await createBulkNotifications(studentIds, notificationData)
    console.log('✅ Course material notification result:', result)
    
    return result
  } catch (error) {
    console.error('❌ Error notifying new course material:', error)
    return false
  }
}

// Get course material title by ID
export async function getCourseMaterialTitle(materialId: string): Promise<string | null> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('course_materials')
      .select('title')
      .eq('id', materialId)
      .single()

    if (error) {
      console.error('Error fetching course material title:', error)
      return null
    }

    return data?.title || null
  } catch (error) {
    console.error('Unexpected error fetching course material title:', error)
    return null
  }
}

