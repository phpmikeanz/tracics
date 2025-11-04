import { createClient } from "@/lib/supabase/client"

/**
 * Sync real notifications between faculty and students from Supabase database
 */
export async function syncRealDatabaseNotifications(userId: string, userRole: string) {
  try {
    const supabase = createClient()
    
    console.log("🔄 Syncing real database notifications for user:", userId, "Role:", userRole)
    
    // Clear any localStorage dummy data
    if (typeof window !== "undefined") {
      localStorage.removeItem("ttrac-demo-notifications")
      localStorage.removeItem("ttrac-notifications")
      localStorage.removeItem("notifications")
      localStorage.removeItem("demo-notifications")
      localStorage.removeItem("test-notifications")
      console.log("✅ Cleared localStorage dummy data")
    }
    
    // Get real notifications from database
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)
    
    if (error) {
      console.error("❌ Error fetching notifications:", error)
      return { success: false, error: error.message }
    }
    
    console.log("📊 Total notifications in database:", notifications?.length || 0)
    
    // Filter out dummy notifications
    const dummyPatterns = [
      "test", "dummy", "sample", "example", "demo", "mock", 
      "fake", "placeholder", "temporary", "temp", "debug",
      "debugging", "trial", "preview", "staging", "mockup",
      "lorem", "ipsum", "placeholder", "content", "sample",
      "mike johnson", "lisa brown", "sarah smith", "john doe", // Common dummy names
      "jane doe", "bob smith", "alice johnson", "david brown"
    ]
    
    const realNotifications = notifications?.filter(n => {
      const title = n.title?.toLowerCase() || ""
      const message = n.message?.toLowerCase() || ""
      
      return !dummyPatterns.some(pattern => 
        title.includes(pattern) || message.includes(pattern)
      )
    }) || []
    
    console.log("✅ Real notifications (filtered):", realNotifications.length)
    console.log("📊 Dummy notifications filtered:", (notifications?.length || 0) - realNotifications.length)
    
    // Calculate unread count
    const unreadCount = realNotifications.filter(n => !n.read).length
    console.log("🔔 Unread notifications:", unreadCount)
    
    // Log notification details
    if (realNotifications.length > 0) {
      console.log("📋 Real notifications in database:")
      realNotifications.forEach((n, index) => {
        console.log(`${index + 1}. ${n.title} - ${n.type} - ${n.read ? 'Read' : 'Unread'}`)
      })
    } else {
      console.log("📋 No real notifications found in database")
    }
    
    return {
      success: true,
      notifications: realNotifications,
      unreadCount: unreadCount,
      totalCount: realNotifications.length,
      dummyFiltered: (notifications?.length || 0) - realNotifications.length
    }
    
  } catch (error) {
    console.error("❌ Error syncing real database notifications:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Create real notification for faculty-student synchronization
 */
export async function createRealFacultyStudentNotification(
  facultyId: string,
  studentId: string,
  title: string,
  message: string,
  type: string
) {
  try {
    const supabase = createClient()
    
    console.log("📝 Creating real faculty-student notification...")
    
    // Create notification for faculty
    const { data: facultyNotification, error: facultyError } = await supabase
      .from("notifications")
      .insert({
        user_id: facultyId,
        title: title,
        message: message,
        type: type,
        read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (facultyError) {
      console.error("❌ Error creating faculty notification:", facultyError)
      return { success: false, error: facultyError.message }
    }
    
    // Create notification for student
    const { data: studentNotification, error: studentError } = await supabase
      .from("notifications")
      .insert({
        user_id: studentId,
        title: title,
        message: message,
        type: type,
        read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (studentError) {
      console.error("❌ Error creating student notification:", studentError)
      return { success: false, error: studentError.message }
    }
    
    console.log("✅ Real faculty-student notifications created")
    return { 
      success: true, 
      facultyNotification, 
      studentNotification 
    }
    
  } catch (error) {
    console.error("❌ Error creating faculty-student notification:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Get real student activities for faculty
 */
export async function getRealStudentActivitiesForFaculty(facultyId: string) {
  try {
    const supabase = createClient()
    
    console.log("📊 Getting real student activities for faculty:", facultyId)
    
    // Get all courses taught by this faculty
    const { data: courses, error: coursesError } = await supabase
      .from("courses")
      .select("id, title")
      .eq("instructor_id", facultyId)
    
    if (coursesError) {
      console.error("❌ Error fetching courses:", coursesError)
      return { success: false, error: coursesError.message }
    }
    
    if (!courses || courses.length === 0) {
      console.log("📊 No courses found for faculty")
      return { success: true, activities: [] }
    }
    
    const courseIds = courses.map(c => c.id)
    const activities = []
    
    // Get assignment submissions
    const { data: submissions, error: submissionsError } = await supabase
      .from("assignment_submissions")
      .select(`
        id, submitted_at, assignment_id, student_id,
        assignments!inner(title, due_date, courses!inner(title)),
        profiles!inner(full_name)
      `)
      .in("assignment_id", 
        await supabase
          .from("assignments")
          .select("id")
          .in("course_id", courseIds)
          .then(({ data }) => data?.map(a => a.id) || [])
      )
      .order("submitted_at", { ascending: false })
      .limit(20)
    
    if (!submissionsError && submissions) {
      submissions.forEach(submission => {
        const assignment = submission.assignments
        const course = assignment?.courses
        const student = submission.profiles
        
        if (assignment && course && student) {
          activities.push({
            id: `assignment-${submission.id}`,
            type: "assignment",
            title: `📚 Assignment Submitted`,
            message: `${student.full_name} submitted '${assignment.title}' in ${course.title}`,
            timestamp: submission.submitted_at,
            student_name: student.full_name,
            course_title: course.title,
            assignment_title: assignment.title
          })
        }
      })
    }
    
    // Get quiz completions
    const { data: quizAttempts, error: quizAttemptsError } = await supabase
      .from("quiz_attempts")
      .select(`
        id, started_at, completed_at, score,
        quizzes!inner(title, max_score, courses!inner(title)),
        profiles!inner(full_name)
      `)
      .in("quiz_id", 
        await supabase
          .from("quizzes")
          .select("id")
          .in("course_id", courseIds)
          .then(({ data }) => data?.map(q => q.id) || [])
      )
      .order("completed_at", { ascending: false })
      .limit(20)
    
    if (!quizAttemptsError && quizAttempts) {
      quizAttempts.forEach(attempt => {
        const quiz = attempt.quizzes
        const course = quiz?.courses
        const student = attempt.profiles
        
        if (quiz && course && student) {
          activities.push({
            id: `quiz-${attempt.id}`,
            type: "quiz",
            title: `📊 Quiz Completed`,
            message: `${student.full_name} completed '${quiz.title}' in ${course.title} (Score: ${attempt.score}/${quiz.max_score})`,
            timestamp: attempt.completed_at || attempt.started_at,
            student_name: student.full_name,
            course_title: course.title,
            quiz_title: quiz.title,
            score: attempt.score,
            max_score: quiz.max_score
          })
        }
      })
    }
    
    // Get enrollment activities
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from("enrollments")
      .select(`
        id, created_at, status,
        courses!inner(title),
        profiles!inner(full_name)
      `)
      .in("course_id", courseIds)
      .order("created_at", { ascending: false })
      .limit(20)
    
    if (!enrollmentsError && enrollments) {
      enrollments.forEach(enrollment => {
        const course = enrollment.courses
        const student = enrollment.profiles
        
        if (course && student) {
          activities.push({
            id: `enrollment-${enrollment.id}`,
            type: "enrollment",
            title: `👥 New Student Enrollment`,
            message: `${student.full_name} enrolled in ${course.title}`,
            timestamp: enrollment.created_at,
            student_name: student.full_name,
            course_title: course.title,
            status: enrollment.status
          })
        }
      })
    }
    
    // Sort activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    console.log("✅ Real student activities loaded:", activities.length)
    
    return {
      success: true,
      activities: activities.slice(0, 50) // Limit to 50 most recent
    }
    
  } catch (error) {
    console.error("❌ Error getting real student activities:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Clean up all dummy notifications and create real ones
 */
export async function cleanupAndCreateRealNotifications(userId: string) {
  try {
    const supabase = createClient()
    
    console.log("🧹 Cleaning up dummy notifications and creating real ones...")
    
    // Get all notifications
    const { data: allNotifications, error: fetchError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
    
    if (fetchError) {
      console.error("❌ Error fetching notifications:", fetchError)
      return { success: false, error: fetchError.message }
    }
    
    // Find and delete dummy notifications
    const dummyPatterns = [
      "test", "dummy", "sample", "example", "demo", "mock", 
      "fake", "placeholder", "temporary", "temp", "debug",
      "debugging", "trial", "preview", "staging", "mockup",
      "lorem", "ipsum", "placeholder", "content", "sample",
      "mike johnson", "lisa brown", "sarah smith", "john doe",
      "jane doe", "bob smith", "alice johnson", "david brown"
    ]
    
    const dummyNotifications = allNotifications?.filter(n => {
      const title = n.title?.toLowerCase() || ""
      const message = n.message?.toLowerCase() || ""
      
      return dummyPatterns.some(pattern => 
        title.includes(pattern) || message.includes(pattern)
      )
    }) || []
    
    console.log("🎭 Dummy notifications found:", dummyNotifications.length)
    
    // Delete dummy notifications
    if (dummyNotifications.length > 0) {
      for (const dummy of dummyNotifications) {
        const { error: deleteError } = await supabase
          .from("notifications")
          .delete()
          .eq("id", dummy.id)
        
        if (deleteError) {
          console.error("❌ Error deleting dummy notification:", deleteError)
        } else {
          console.log(`✅ Deleted dummy notification: ${dummy.title}`)
        }
      }
    }
    
    // Get updated notifications
    const { data: realNotifications, error: realError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    
    if (realError) {
      console.error("❌ Error fetching real notifications:", realError)
      return { success: false, error: realError.message }
    }
    
    const realData = realNotifications || []
    const unreadCount = realData.filter(n => !n.read).length
    
    console.log("✅ Cleanup complete!")
    console.log("📊 Real notifications remaining:", realData.length)
    console.log("🔔 Unread notifications:", unreadCount)
    
    return {
      success: true,
      notifications: realData,
      unreadCount: unreadCount,
      dummyRemoved: dummyNotifications.length
    }
    
  } catch (error) {
    console.error("❌ Error cleaning up and creating real notifications:", error)
    return { success: false, error: error.message }
  }
}





















