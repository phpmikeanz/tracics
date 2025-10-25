import { createClient } from "@/lib/supabase/client"

/**
 * Comprehensive Student Activity Sync with Bell Notifications
 * This system ensures student activities are properly synced with bell notifications
 * and provides options to hide student activities in faculty accounts
 */

export interface StudentActivitySyncResult {
  success: boolean
  activitiesSynced: number
  notificationsCreated: number
  dummyDataRemoved: number
  realDataCount: number
  error?: string
}

/**
 * Sync student activities with bell notification system
 */
export async function syncStudentActivitiesWithBell(facultyId: string): Promise<StudentActivitySyncResult> {
  try {
    const supabase = createClient()
    
    console.log("🔄 Starting comprehensive student activity sync for faculty:", facultyId)
    
    // Step 1: Get all courses taught by this faculty
    const { data: courses, error: coursesError } = await supabase
      .from("courses")
      .select("id, title")
      .eq("instructor_id", facultyId)
    
    if (coursesError) {
      console.error("❌ Error fetching courses:", coursesError)
      return { success: false, activitiesSynced: 0, notificationsCreated: 0, dummyDataRemoved: 0, realDataCount: 0, error: coursesError.message }
    }
    
    if (!courses || courses.length === 0) {
      console.log("📊 No courses found for faculty")
      return { success: true, activitiesSynced: 0, notificationsCreated: 0, dummyDataRemoved: 0, realDataCount: 0 }
    }
    
    const courseIds = courses.map(c => c.id)
    let activitiesSynced = 0
    let notificationsCreated = 0
    
    // Step 2: Sync assignment submissions
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
      .limit(50)
    
    if (!submissionsError && submissions) {
      for (const submission of submissions) {
        const assignment = submission.assignments
        const course = assignment?.courses
        const student = submission.profiles
        
        if (assignment && course && student) {
          const isLate = assignment.due_date && new Date(submission.submitted_at) > new Date(assignment.due_date)
          
          // Create notification for faculty
          const { error: notificationError } = await supabase
            .from("notifications")
            .insert({
              user_id: facultyId,
              title: isLate ? "⚠️ Late Assignment Submission" : "📚 Assignment Submitted",
              message: `${student.full_name} ${isLate ? 'submitted late' : 'submitted'} "${assignment.title}" in ${course.title}`,
              type: isLate ? "late" : "assignment",
              read: false,
              created_at: new Date().toISOString()
            })
          
          if (!notificationError) {
            notificationsCreated++
          }
          
          activitiesSynced++
        }
      }
    }
    
    // Step 3: Sync quiz completions
    const { data: quizAttempts, error: quizAttemptsError } = await supabase
      .from("quiz_attempts")
      .select(`
        id, completed_at, score,
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
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(50)
    
    if (!quizAttemptsError && quizAttempts) {
      for (const attempt of quizAttempts) {
        const quiz = attempt.quizzes
        const course = quiz?.courses
        const student = attempt.profiles
        
        if (quiz && course && student) {
          // Create notification for faculty
          const { error: notificationError } = await supabase
            .from("notifications")
            .insert({
              user_id: facultyId,
              title: "📊 Quiz Completed",
              message: `${student.full_name} completed "${quiz.title}" in ${course.title} (Score: ${attempt.score}/${quiz.max_score})`,
              type: "quiz",
              read: false,
              created_at: new Date().toISOString()
            })
          
          if (!notificationError) {
            notificationsCreated++
          }
          
          activitiesSynced++
        }
      }
    }
    
    // Step 4: Sync enrollment activities
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
      for (const enrollment of enrollments) {
        const course = enrollment.courses
        const student = enrollment.profiles
        
        if (course && student) {
          // Create notification for faculty
          const { error: notificationError } = await supabase
            .from("notifications")
            .insert({
              user_id: facultyId,
              title: "👥 New Student Enrollment",
              message: `${student.full_name} ${enrollment.status === 'approved' ? 'enrolled in' : 'requested to enroll in'} ${course.title}`,
              type: "enrollment",
              read: false,
              created_at: new Date().toISOString()
            })
          
          if (!notificationError) {
            notificationsCreated++
          }
          
          activitiesSynced++
        }
      }
    }
    
    console.log("✅ Student activity sync complete!")
    console.log(`📊 Activities synced: ${activitiesSynced}`)
    console.log(`🔔 Notifications created: ${notificationsCreated}`)
    
    return {
      success: true,
      activitiesSynced,
      notificationsCreated,
      dummyDataRemoved: 0,
      realDataCount: activitiesSynced
    }
    
  } catch (error) {
    console.error("❌ Error syncing student activities:", error)
    return { success: false, activitiesSynced: 0, notificationsCreated: 0, dummyDataRemoved: 0, realDataCount: 0, error: error.message }
  }
}

/**
 * Delete all dummy data from the system
 */
export async function deleteAllDummyDataComprehensive(userId: string): Promise<{ success: boolean; deletedCount: number; remainingCount: number; error?: string }> {
  try {
    const supabase = createClient()
    
    console.log("🧹 Starting comprehensive dummy data cleanup for user:", userId)
    
    // Clear localStorage
    if (typeof window !== "undefined") {
      const localStorageKeys = [
        "ttrac-demo-notifications",
        "ttrac-notifications", 
        "notifications",
        "demo-notifications",
        "test-notifications",
        "mock-notifications",
        "dummy-notifications"
      ]
      
      localStorageKeys.forEach(key => {
        localStorage.removeItem(key)
        console.log(`✅ Cleared localStorage: ${key}`)
      })
    }
    
    // Get all notifications
    const { data: allNotifications, error: fetchError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
    
    if (fetchError) {
      console.error("❌ Error fetching notifications:", fetchError)
      return { success: false, deletedCount: 0, remainingCount: 0, error: fetchError.message }
    }
    
    const totalNotifications = allNotifications?.length || 0
    console.log("📊 Total notifications found:", totalNotifications)
    
    // Comprehensive dummy patterns
    const dummyPatterns = [
      "test", "dummy", "sample", "example", "demo", "mock", 
      "fake", "placeholder", "temporary", "temp", "debug",
      "debugging", "trial", "preview", "staging", "mockup",
      "lorem", "ipsum", "content", "sample", "trial", "preview",
      "staging", "development", "testing", "experiment", "prototype"
    ]
    
    // Find dummy notifications
    const dummyNotifications = allNotifications?.filter(n => {
      const title = n.title?.toLowerCase() || ""
      const message = n.message?.toLowerCase() || ""
      
      return dummyPatterns.some(pattern => 
        title.includes(pattern) || message.includes(pattern)
      )
    }) || []
    
    console.log("🎭 Dummy notifications found:", dummyNotifications.length)
    
    // Delete dummy notifications
    let deletedCount = 0
    if (dummyNotifications.length > 0) {
      for (const dummy of dummyNotifications) {
        const { error: deleteError } = await supabase
          .from("notifications")
          .delete()
          .eq("id", dummy.id)
        
        if (!deleteError) {
          deletedCount++
          console.log(`✅ Deleted dummy notification: ${dummy.title}`)
        } else {
          console.error("❌ Error deleting dummy notification:", deleteError)
        }
      }
    }
    
    // Get remaining count
    const { data: remainingNotifications, error: remainingError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
    
    if (remainingError) {
      console.error("❌ Error fetching remaining notifications:", remainingError)
      return { success: false, deletedCount, remainingCount: 0, error: remainingError.message }
    }
    
    const remainingCount = remainingNotifications?.length || 0
    
    console.log("✅ Dummy data cleanup complete!")
    console.log(`🗑️ Dummy notifications deleted: ${deletedCount}`)
    console.log(`📊 Real notifications remaining: ${remainingCount}`)
    
    return {
      success: true,
      deletedCount,
      remainingCount
    }
    
  } catch (error) {
    console.error("❌ Error deleting dummy data:", error)
    return { success: false, deletedCount: 0, remainingCount: 0, error: error.message }
  }
}

/**
 * Verify the system is clean and working properly
 */
export async function verifyCleanSystem(userId: string): Promise<{ success: boolean; isClean: boolean; totalCount: number; realCount: number; dummyCount: number; error?: string }> {
  try {
    const supabase = createClient()
    
    console.log("🔍 Verifying clean system for user:", userId)
    
    // Get all notifications
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
    
    if (error) {
      console.error("❌ Error fetching notifications:", error)
      return { success: false, isClean: false, totalCount: 0, realCount: 0, dummyCount: 0, error: error.message }
    }
    
    const allNotifications = notifications || []
    const totalCount = allNotifications.length
    
    // Check for dummy data
    const dummyPatterns = [
      "test", "dummy", "sample", "example", "demo", "mock", 
      "fake", "placeholder", "temporary", "temp", "debug",
      "debugging", "trial", "preview", "staging", "mockup",
      "lorem", "ipsum", "content", "sample", "trial", "preview",
      "staging", "development", "testing", "experiment", "prototype"
    ]
    
    const dummyNotifications = allNotifications.filter(n => {
      const title = n.title?.toLowerCase() || ""
      const message = n.message?.toLowerCase() || ""
      
      return dummyPatterns.some(pattern => 
        title.includes(pattern) || message.includes(pattern)
      )
    })
    
    const realCount = totalCount - dummyNotifications.length
    const dummyCount = dummyNotifications.length
    const isClean = dummyCount === 0
    
    console.log("🔍 System verification results:")
    console.log(`📊 Total notifications: ${totalCount}`)
    console.log(`✅ Real notifications: ${realCount}`)
    console.log(`🎭 Dummy notifications: ${dummyCount}`)
    console.log(`🧹 System is clean: ${isClean}`)
    
    if (dummyCount > 0) {
      console.log("⚠️ Remaining dummy notifications:")
      dummyNotifications.forEach(n => {
        console.log(`  - ${n.title}: ${n.message}`)
      })
    }
    
    return {
      success: true,
      isClean,
      totalCount,
      realCount,
      dummyCount
    }
    
  } catch (error) {
    console.error("❌ Error verifying clean system:", error)
    return { success: false, isClean: false, totalCount: 0, realCount: 0, dummyCount: 0, error: error.message }
  }
}

/**
 * Hide student activities in faculty account view
 */
export async function hideStudentActivitiesInFacultyAccount(facultyId: string): Promise<{ success: boolean; hidden: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    console.log("👁️ Hiding student activities in faculty account for:", facultyId)
    
    // Update faculty profile to hide student activities
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        hide_student_activities: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", facultyId)
    
    if (updateError) {
      console.error("❌ Error hiding student activities:", updateError)
      return { success: false, hidden: false, error: updateError.message }
    }
    
    console.log("✅ Student activities hidden in faculty account")
    
    return {
      success: true,
      hidden: true
    }
    
  } catch (error) {
    console.error("❌ Error hiding student activities:", error)
    return { success: false, hidden: false, error: error.message }
  }
}

/**
 * Show student activities in faculty account view
 */
export async function showStudentActivitiesInFacultyAccount(facultyId: string): Promise<{ success: boolean; shown: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    console.log("👁️ Showing student activities in faculty account for:", facultyId)
    
    // Update faculty profile to show student activities
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        hide_student_activities: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", facultyId)
    
    if (updateError) {
      console.error("❌ Error showing student activities:", updateError)
      return { success: false, shown: false, error: updateError.message }
    }
    
    console.log("✅ Student activities shown in faculty account")
    
    return {
      success: true,
      shown: true
    }
    
  } catch (error) {
    console.error("❌ Error showing student activities:", error)
    return { success: false, shown: false, error: error.message }
  }
}

/**
 * Check if student activities are hidden for faculty
 */
export async function isStudentActivitiesHidden(facultyId: string): Promise<{ success: boolean; hidden: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("hide_student_activities")
      .eq("id", facultyId)
      .single()
    
    if (error) {
      console.error("❌ Error checking student activities visibility:", error)
      return { success: false, hidden: false, error: error.message }
    }
    
    return {
      success: true,
      hidden: profile?.hide_student_activities || false
    }
    
  } catch (error) {
    console.error("❌ Error checking student activities visibility:", error)
    return { success: false, hidden: false, error: error.message }
  }
}
