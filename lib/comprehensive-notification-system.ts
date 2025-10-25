import { createClient } from "@/lib/supabase/client"
import { 
  createSupabaseNotification,
  getSupabaseNotifications,
  getSupabaseUnreadCount,
  getSupabaseCourseDetails,
  getSupabaseStudentDetails,
  getSupabaseAssignmentDetails,
  getSupabaseQuizDetails,
  getSupabaseEnrollmentDetails,
  getSupabaseCourseStudents,
  checkSupabaseEnrollment
} from "@/lib/supabase-notification-integration"

/**
 * Comprehensive Notification System
 * Handles notifications for both faculty and students
 */

export interface NotificationData {
  user_id: string
  title: string
  message: string
  type: 'assignment' | 'quiz' | 'grade' | 'announcement' | 'enrollment' | 'activity' | 'due_date' | 'late'
  read: boolean
  course_id?: string
  assignment_id?: string
  quiz_id?: string
}

/**
 * Create notification for faculty when student submits assignment
 */
export async function notifyFacultyAssignmentSubmission(
  facultyId: string,
  studentId: string,
  assignmentId: string,
  courseId: string,
  isLate: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get assignment details from Supabase
    const assignmentResult = await getSupabaseAssignmentDetails(assignmentId)
    if (!assignmentResult.success || !assignmentResult.assignment) {
      console.error("Error fetching assignment details:", assignmentResult.error)
      return { success: false, error: "Failed to fetch assignment details" }
    }
    
    // Get student details from Supabase
    const studentResult = await getSupabaseStudentDetails(studentId)
    if (!studentResult.success || !studentResult.student) {
      console.error("Error fetching student details:", studentResult.error)
      return { success: false, error: "Failed to fetch student details" }
    }
    
    const assignment = assignmentResult.assignment
    const student = studentResult.student
    
    const title = isLate ? "⚠️ Late Assignment Submission" : "📚 Assignment Submitted"
    const message = `${student.full_name} ${isLate ? 'submitted late' : 'submitted'} "${assignment.title}" in ${assignment.courses.title}`
    
    // Create notification in Supabase
    const notificationResult = await createSupabaseNotification({
      user_id: facultyId,
      title,
      message,
      type: isLate ? "assignment" : "assignment",
      read: false,
      course_id: assignment.course_id,
      assignment_id: assignmentId
    })
    
    if (!notificationResult.success) {
      console.error("Error creating faculty notification:", notificationResult.error)
      return { success: false, error: notificationResult.error }
    }
    
    console.log("✅ Faculty notification created for assignment submission")
    return { success: true }
    
  } catch (error) {
    console.error("Error in notifyFacultyAssignmentSubmission:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Create notification for faculty when student completes quiz
 */
export async function notifyFacultyQuizCompletion(
  facultyId: string,
  studentId: string,
  quizId: string,
  courseId: string,
  score: number,
  maxScore: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get quiz details from Supabase
    const quizResult = await getSupabaseQuizDetails(quizId)
    if (!quizResult.success || !quizResult.quiz) {
      console.error("Error fetching quiz details:", quizResult.error)
      return { success: false, error: "Failed to fetch quiz details" }
    }
    
    // Get student details from Supabase
    const studentResult = await getSupabaseStudentDetails(studentId)
    if (!studentResult.success || !studentResult.student) {
      console.error("Error fetching student details:", studentResult.error)
      return { success: false, error: "Failed to fetch student details" }
    }
    
    const quiz = quizResult.quiz
    const student = studentResult.student
    
    const percentage = Math.round((score / maxScore) * 100)
    const title = "📊 Quiz Completed"
    const message = `${student.full_name} completed "${quiz.title}" in ${quiz.courses.title} (Score: ${score}/${maxScore} - ${percentage}%)`
    
    // Create notification in Supabase
    const notificationResult = await createSupabaseNotification({
      user_id: facultyId,
      title,
      message,
      type: "quiz",
      read: false,
      course_id: quiz.course_id,
      quiz_id: quizId
    })
    
    if (!notificationResult.success) {
      console.error("Error creating faculty quiz notification:", notificationResult.error)
      return { success: false, error: notificationResult.error }
    }
    
    console.log("✅ Faculty notification created for quiz completion")
    return { success: true }
    
  } catch (error) {
    console.error("Error in notifyFacultyQuizCompletion:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Create notification for student when assignment is due soon
 */
export async function notifyStudentAssignmentDue(
  studentId: string,
  assignmentId: string,
  courseId: string,
  hoursUntilDue: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // Get assignment details
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select("title, due_date, courses!inner(title)")
      .eq("id", assignmentId)
      .single()
    
    if (assignmentError) {
      console.error("Error fetching assignment details:", assignmentError)
      return { success: false, error: "Failed to fetch assignment details" }
    }
    
    const title = hoursUntilDue <= 24 ? "⏰ Assignment Due Soon!" : "📚 Assignment Reminder"
    const message = `"${assignment.title}" in ${assignment.courses.title} is due ${hoursUntilDue <= 24 ? 'in less than 24 hours' : `in ${Math.ceil(hoursUntilDue / 24)} days`}`
    
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: studentId,
        title,
        message,
        type: hoursUntilDue <= 24 ? "due_date" : "assignment",
        read: false,
        course_id: courseId,
        assignment_id: assignmentId,
        created_at: new Date().toISOString()
      })
    
    if (notificationError) {
      console.error("Error creating student notification:", notificationError)
      return { success: false, error: notificationError.message }
    }
    
    console.log("✅ Student notification created for assignment due")
    return { success: true }
    
  } catch (error) {
    console.error("Error in notifyStudentAssignmentDue:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Create notification for student when quiz is available
 */
export async function notifyStudentQuizAvailable(
  studentId: string,
  quizId: string,
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // Get quiz details
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("title, courses!inner(title)")
      .eq("id", quizId)
      .single()
    
    if (quizError) {
      console.error("Error fetching quiz details:", quizError)
      return { success: false, error: "Failed to fetch quiz details" }
    }
    
    const title = "📝 New Quiz Available"
    const message = `A new quiz "${quiz.title}" is now available in ${quiz.courses.title}`
    
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: studentId,
        title,
        message,
        type: "quiz",
        read: false,
        course_id: courseId,
        quiz_id: quizId,
        created_at: new Date().toISOString()
      })
    
    if (notificationError) {
      console.error("Error creating student notification:", notificationError)
      return { success: false, error: notificationError.message }
    }
    
    console.log("✅ Student notification created for quiz availability")
    return { success: true }
    
  } catch (error) {
    console.error("Error in notifyStudentQuizAvailable:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Create notification for student when they receive a grade
 */
export async function notifyStudentGrade(
  studentId: string,
  assignmentId: string,
  courseId: string,
  grade: number,
  maxGrade: number,
  isQuiz: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // Get assignment/quiz details
    const table = isQuiz ? "quizzes" : "assignments"
    const { data: item, error: itemError } = await supabase
      .from(table)
      .select("title, courses!inner(title)")
      .eq("id", assignmentId)
      .single()
    
    if (itemError) {
      console.error("Error fetching item details:", itemError)
      return { success: false, error: "Failed to fetch item details" }
    }
    
    const percentage = Math.round((grade / maxGrade) * 100)
    const title = "🎉 Grade Posted"
    const message = `Your ${isQuiz ? 'quiz' : 'assignment'} "${item.title}" in ${item.courses.title} has been graded: ${grade}/${maxGrade} (${percentage}%)`
    
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: studentId,
        title,
        message,
        type: "grade",
        read: false,
        course_id: courseId,
        assignment_id: assignmentId,
        created_at: new Date().toISOString()
      })
    
    if (notificationError) {
      console.error("Error creating student notification:", notificationError)
      return { success: false, error: notificationError.message }
    }
    
    console.log("✅ Student notification created for grade")
    return { success: true }
    
  } catch (error) {
    console.error("Error in notifyStudentGrade:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Create notification for student when they submit assignment
 */
export async function notifyStudentAssignmentSubmitted(
  studentId: string,
  assignmentId: string,
  courseId: string,
  isLate: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // Get assignment details
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select("title, courses!inner(title)")
      .eq("id", assignmentId)
      .single()
    
    if (assignmentError) {
      console.error("Error fetching assignment details:", assignmentError)
      return { success: false, error: "Failed to fetch assignment details" }
    }
    
    const title = isLate ? "⚠️ Assignment Submitted Late" : "✅ Assignment Submitted"
    const message = `Your assignment "${assignment.title}" in ${assignment.courses.title} has been ${isLate ? 'submitted late' : 'submitted successfully'}`
    
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: studentId,
        title,
        message,
        type: isLate ? "late" : "assignment",
        read: false,
        course_id: courseId,
        assignment_id: assignmentId,
        created_at: new Date().toISOString()
      })
    
    if (notificationError) {
      console.error("Error creating student notification:", notificationError)
      return { success: false, error: notificationError.message }
    }
    
    console.log("✅ Student notification created for assignment submission")
    return { success: true }
    
  } catch (error) {
    console.error("Error in notifyStudentAssignmentSubmitted:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Create notification for student when they complete quiz
 */
export async function notifyStudentQuizCompleted(
  studentId: string,
  quizId: string,
  courseId: string,
  score: number,
  maxScore: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // Get quiz details
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("title, courses!inner(title)")
      .eq("id", quizId)
      .single()
    
    if (quizError) {
      console.error("Error fetching quiz details:", quizError)
      return { success: false, error: "Failed to fetch quiz details" }
    }
    
    const percentage = Math.round((score / maxScore) * 100)
    const title = "🎯 Quiz Completed"
    const message = `You completed "${quiz.title}" in ${quiz.courses.title} with a score of ${score}/${maxScore} (${percentage}%)`
    
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: studentId,
        title,
        message,
        type: "quiz",
        read: false,
        course_id: courseId,
        quiz_id: quizId,
        created_at: new Date().toISOString()
      })
    
    if (notificationError) {
      console.error("Error creating student notification:", notificationError)
      return { success: false, error: notificationError.message }
    }
    
    console.log("✅ Student notification created for quiz completion")
    return { success: true }
    
  } catch (error) {
    console.error("Error in notifyStudentQuizCompleted:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Get comprehensive notifications for user based on their role
 */
export async function getComprehensiveNotifications(userId: string, userRole: string): Promise<{
  success: boolean
  notifications: any[]
  unreadCount: number
  error?: string
}> {
  try {
    // Get notifications from Supabase with related data
    const supabase = createClient()
    
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select(`
        *,
        courses(title),
        assignments(title),
        quizzes(title),
        enrollments(id, status),
        assignment_submissions(id, status, grade),
        quiz_attempts(id, score, status)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)
    
    if (error) {
      console.error("Error fetching notifications from Supabase:", error)
      return { success: false, notifications: [], unreadCount: 0, error: error.message }
    }
    
    const allNotifications = notifications || []
    const unreadCount = allNotifications.filter(n => !n.read).length
    
    console.log(`📊 Loaded ${allNotifications.length} notifications for ${userRole} (${unreadCount} unread) from Supabase`)
    
    return {
      success: true,
      notifications: allNotifications,
      unreadCount
    }
    
  } catch (error) {
    console.error("Error in getComprehensiveNotifications:", error)
    return { success: false, notifications: [], unreadCount: 0, error: error.message }
  }
}

/**
 * Create notification for faculty when student requests enrollment
 */
export async function notifyFacultyEnrollmentRequest(
  facultyId: string,
  studentId: string,
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // Get student and course details
    const { data: student, error: studentError } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", studentId)
      .single()
    
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("title")
      .eq("id", courseId)
      .single()
    
    if (studentError || courseError) {
      console.error("Error fetching student or course details:", studentError || courseError)
      return { success: false, error: "Failed to fetch details" }
    }
    
    const title = "👥 New Enrollment Request"
    const message = `${student.full_name} has requested to enroll in ${course.title}`
    
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: facultyId,
        title,
        message,
        type: "enrollment",
        read: false,
        course_id: courseId,
        created_at: new Date().toISOString()
      })
    
    if (notificationError) {
      console.error("Error creating faculty enrollment notification:", notificationError)
      return { success: false, error: notificationError.message }
    }
    
    console.log("✅ Faculty notification created for enrollment request")
    return { success: true }
    
  } catch (error) {
    console.error("Error in notifyFacultyEnrollmentRequest:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Create notification for faculty when enrollment is approved/declined
 */
export async function notifyFacultyEnrollmentStatusChange(
  facultyId: string,
  studentId: string,
  courseId: string,
  status: 'approved' | 'declined'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // Get student and course details
    const { data: student, error: studentError } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", studentId)
      .single()
    
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("title")
      .eq("id", courseId)
      .single()
    
    if (studentError || courseError) {
      console.error("Error fetching student or course details:", studentError || courseError)
      return { success: false, error: "Failed to fetch details" }
    }
    
    const title = status === 'approved' ? "✅ Enrollment Approved" : "❌ Enrollment Declined"
    const message = `Enrollment ${status} for ${student.full_name} in ${course.title}`
    
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: facultyId,
        title,
        message,
        type: "enrollment",
        read: false,
        course_id: courseId,
        created_at: new Date().toISOString()
      })
    
    if (notificationError) {
      console.error("Error creating faculty enrollment status notification:", notificationError)
      return { success: false, error: notificationError.message }
    }
    
    console.log("✅ Faculty notification created for enrollment status change")
    return { success: true }
    
  } catch (error) {
    console.error("Error in notifyFacultyEnrollmentStatusChange:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Create notification for student when they request enrollment
 */
export async function notifyStudentEnrollmentRequest(
  studentId: string,
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // Get course details
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("title")
      .eq("id", courseId)
      .single()
    
    if (courseError) {
      console.error("Error fetching course details:", courseError)
      return { success: false, error: "Failed to fetch course details" }
    }
    
    const title = "📝 Enrollment Requested"
    const message = `You have requested to enroll in ${course.title}. Waiting for faculty approval.`
    
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: studentId,
        title,
        message,
        type: "enrollment",
        read: false,
        course_id: courseId,
        created_at: new Date().toISOString()
      })
    
    if (notificationError) {
      console.error("Error creating student enrollment notification:", notificationError)
      return { success: false, error: notificationError.message }
    }
    
    console.log("✅ Student notification created for enrollment request")
    return { success: true }
    
  } catch (error) {
    console.error("Error in notifyStudentEnrollmentRequest:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Create notification for student when enrollment is approved/declined
 */
export async function notifyStudentEnrollmentStatus(
  studentId: string,
  courseId: string,
  status: 'approved' | 'declined',
  facultyName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // Get course details
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("title")
      .eq("id", courseId)
      .single()
    
    if (courseError) {
      console.error("Error fetching course details:", courseError)
      return { success: false, error: "Failed to fetch course details" }
    }
    
    const title = status === 'approved' ? "🎉 Enrollment Approved!" : "❌ Enrollment Declined"
    const message = status === 'approved' 
      ? `Your enrollment request for ${course.title} has been approved! You can now access the course.`
      : `Your enrollment request for ${course.title} has been declined.${facultyName ? ` Contact ${facultyName} for more information.` : ''}`
    
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: studentId,
        title,
        message,
        type: "enrollment",
        read: false,
        course_id: courseId,
        created_at: new Date().toISOString()
      })
    
    if (notificationError) {
      console.error("Error creating student enrollment status notification:", notificationError)
      return { success: false, error: notificationError.message }
    }
    
    console.log("✅ Student notification created for enrollment status")
    return { success: true }
    
  } catch (error) {
    console.error("Error in notifyStudentEnrollmentStatus:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Create notification for student when they are enrolled by faculty
 */
export async function notifyStudentDirectEnrollment(
  studentId: string,
  courseId: string,
  facultyName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // Get course details
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("title")
      .eq("id", courseId)
      .single()
    
    if (courseError) {
      console.error("Error fetching course details:", courseError)
      return { success: false, error: "Failed to fetch course details" }
    }
    
    const title = "🎓 You've Been Enrolled"
    const message = `You have been enrolled in ${course.title}${facultyName ? ` by ${facultyName}` : ''}. You can now access the course.`
    
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: studentId,
        title,
        message,
        type: "enrollment",
        read: false,
        course_id: courseId,
        created_at: new Date().toISOString()
      })
    
    if (notificationError) {
      console.error("Error creating student direct enrollment notification:", notificationError)
      return { success: false, error: notificationError.message }
    }
    
    console.log("✅ Student notification created for direct enrollment")
    return { success: true }
    
  } catch (error) {
    console.error("Error in notifyStudentDirectEnrollment:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Create course announcement notification for all students
 */
export async function notifyCourseAnnouncement(
  courseId: string,
  title: string,
  message: string,
  facultyId: string
): Promise<{ success: boolean; notificationsCreated: number; error?: string }> {
  try {
    const supabase = createClient()
    
    // Get all students enrolled in the course
    const { data: enrollments, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("course_id", courseId)
      .eq("status", "approved")
    
    if (enrollmentError) {
      console.error("Error fetching course enrollments:", enrollmentError)
      return { success: false, notificationsCreated: 0, error: enrollmentError.message }
    }
    
    if (!enrollments || enrollments.length === 0) {
      console.log("No students enrolled in course")
      return { success: true, notificationsCreated: 0 }
    }
    
    // Create notifications for all students
    const notifications = enrollments.map(enrollment => ({
      user_id: enrollment.student_id,
      title: `📢 ${title}`,
      message,
      type: "announcement",
      read: false,
      course_id: courseId,
      created_at: new Date().toISOString()
    }))
    
    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications)
    
    if (insertError) {
      console.error("Error creating announcement notifications:", insertError)
      return { success: false, notificationsCreated: 0, error: insertError.message }
    }
    
    console.log(`✅ Created ${notifications.length} announcement notifications`)
    return { success: true, notificationsCreated: notifications.length }
    
  } catch (error) {
    console.error("Error in notifyCourseAnnouncement:", error)
    return { success: false, notificationsCreated: 0, error: error.message }
  }
}
