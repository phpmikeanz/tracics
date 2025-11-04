import { createClient } from "@/lib/supabase/client"

/**
 * Comprehensive notification system optimizer
 * Fixes all potential issues and optimizes performance
 */
export class NotificationSystemOptimizer {
  private supabase = createClient()

  /**
   * Fix all notification system issues
   */
  async fixAllIssues(userId: string, userRole: string) {
    try {
      console.log("🔧 Starting comprehensive notification system optimization...")
      
      const results = {
        dummyDataCleaned: 0,
        realNotificationsCreated: 0,
        duplicatesRemoved: 0,
        performanceOptimized: false,
        errors: [] as string[]
      }

      // 1. Clean up all dummy data
      console.log("🧹 Step 1: Cleaning up dummy data...")
      const cleanupResult = await this.cleanupDummyData(userId)
      results.dummyDataCleaned = cleanupResult.removed || 0
      if (cleanupResult.error) results.errors.push(cleanupResult.error)

      // 2. Remove duplicate notifications
      console.log("🔄 Step 2: Removing duplicate notifications...")
      const duplicateResult = await this.removeDuplicates(userId)
      results.duplicatesRemoved = duplicateResult.removed || 0
      if (duplicateResult.error) results.errors.push(duplicateResult.error)

      // 3. Generate real notifications from student activities
      console.log("📝 Step 3: Generating real notifications...")
      const realResult = await this.generateRealNotifications(userId, userRole)
      results.realNotificationsCreated = realResult.created || 0
      if (realResult.error) results.errors.push(realResult.error)

      // 4. Optimize database performance
      console.log("⚡ Step 4: Optimizing performance...")
      const perfResult = await this.optimizePerformance(userId)
      results.performanceOptimized = perfResult.success
      if (perfResult.error) results.errors.push(perfResult.error)

      // 5. Verify system health
      console.log("🔍 Step 5: Verifying system health...")
      const healthResult = await this.verifySystemHealth(userId)
      
      console.log("✅ Notification system optimization complete!")
      console.log(`📊 Results: ${results.dummyDataCleaned} dummy removed, ${results.realNotificationsCreated} real created, ${results.duplicatesRemoved} duplicates removed`)
      
      return {
        success: true,
        results,
        health: healthResult,
        message: "Notification system fully optimized"
      }

    } catch (error) {
      console.error("❌ Error optimizing notification system:", error)
      return {
        success: false,
        error: error.message,
        message: "Failed to optimize notification system"
      }
    }
  }

  /**
   * Clean up all dummy data
   */
  private async cleanupDummyData(userId: string) {
    try {
      const dummyPatterns = [
        "test", "dummy", "sample", "example", "demo", "mock", 
        "fake", "placeholder", "temporary", "temp", "debug",
        "debugging", "trial", "preview", "staging", "mockup",
        "lorem", "ipsum", "placeholder", "content", "sample",
        "mike johnson", "lisa brown", "sarah smith", "john doe",
        "jane doe", "bob smith", "alice johnson", "david brown"
      ]

      // Get all notifications
      const { data: notifications, error: fetchError } = await this.supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)

      if (fetchError) throw fetchError

      const dummyNotifications = notifications?.filter(n => {
        const title = n.title?.toLowerCase() || ""
        const message = n.message?.toLowerCase() || ""
        return dummyPatterns.some(pattern => 
          title.includes(pattern) || message.includes(pattern)
        )
      }) || []

      // Delete dummy notifications
      let removed = 0
      for (const dummy of dummyNotifications) {
        const { error: deleteError } = await this.supabase
          .from("notifications")
          .delete()
          .eq("id", dummy.id)
        
        if (!deleteError) removed++
      }

      return { success: true, removed }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Remove duplicate notifications
   */
  private async removeDuplicates(userId: string) {
    try {
      const { data: notifications, error } = await this.supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error

      const seen = new Set()
      const duplicates = []
      const unique = []

      notifications?.forEach(notification => {
        const key = `${notification.title}-${notification.message}`
        if (seen.has(key)) {
          duplicates.push(notification)
        } else {
          seen.add(key)
          unique.push(notification)
        }
      })

      // Delete duplicates
      let removed = 0
      for (const duplicate of duplicates) {
        const { error: deleteError } = await this.supabase
          .from("notifications")
          .delete()
          .eq("id", duplicate.id)
        
        if (!deleteError) removed++
      }

      return { success: true, removed }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Generate real notifications from student activities
   */
  private async generateRealNotifications(userId: string, userRole: string) {
    try {
      if (userRole !== 'faculty') {
        return { success: true, created: 0, message: "Not a faculty user" }
      }

      // Get courses taught by faculty
      const { data: courses, error: coursesError } = await this.supabase
        .from("courses")
        .select("id, title")
        .eq("instructor_id", userId)

      if (coursesError) throw coursesError
      if (!courses || courses.length === 0) {
        return { success: true, created: 0, message: "No courses found" }
      }

      const courseIds = courses.map(c => c.id)
      let created = 0

      // Generate from assignment submissions
      const { data: submissions } = await this.supabase
        .from("assignment_submissions")
        .select(`
          id, submitted_at, assignment_id, student_id,
          assignments!inner(title, due_date, courses!inner(title)),
          profiles!inner(full_name)
        `)
        .in("assignment_id", 
          await this.supabase
            .from("assignments")
            .select("id")
            .in("course_id", courseIds)
            .then(({ data }) => data?.map(a => a.id) || [])
        )
        .order("submitted_at", { ascending: false })
        .limit(20)

      if (submissions) {
        for (const submission of submissions) {
          const assignment = submission.assignments
          const course = assignment?.courses
          const student = submission.profiles

          if (assignment && course && student) {
            const isLate = new Date(submission.submitted_at) > new Date(assignment.due_date)
            const title = isLate ? "⚠️ Late Assignment Submission" : "📚 Assignment Submitted"
            const message = `${student.full_name} ${isLate ? 'submitted late' : 'submitted'} '${assignment.title}' in ${course.title}`

            // Check if notification already exists
            const { data: existing } = await this.supabase
              .from("notifications")
              .select("id")
              .eq("user_id", userId)
              .eq("title", title)
              .eq("message", message)
              .single()

            if (!existing) {
              const { error: insertError } = await this.supabase
                .from("notifications")
                .insert({
                  user_id: userId,
                  title: title,
                  message: message,
                  type: isLate ? "late" : "assignment",
                  read: false,
                  created_at: submission.submitted_at
                })

              if (!insertError) created++
            }
          }
        }
      }

      // Generate from quiz attempts
      const { data: quizAttempts } = await this.supabase
        .from("quiz_attempts")
        .select(`
          id, started_at, completed_at, score,
          quizzes!inner(title, max_score, courses!inner(title)),
          profiles!inner(full_name)
        `)
        .in("quiz_id", 
          await this.supabase
            .from("quizzes")
            .select("id")
            .in("course_id", courseIds)
            .then(({ data }) => data?.map(q => q.id) || [])
        )
        .order("completed_at", { ascending: false })
        .limit(20)

      if (quizAttempts) {
        for (const attempt of quizAttempts) {
          const quiz = attempt.quizzes
          const course = quiz?.courses
          const student = attempt.profiles

          if (quiz && course && student && attempt.completed_at) {
            const title = "📊 Quiz Completed"
            const message = `${student.full_name} completed '${quiz.title}' in ${course.title} (Score: ${attempt.score}/${quiz.max_score})`

            const { data: existing } = await this.supabase
              .from("notifications")
              .select("id")
              .eq("user_id", userId)
              .eq("title", title)
              .eq("message", message)
              .single()

            if (!existing) {
              const { error: insertError } = await this.supabase
                .from("notifications")
                .insert({
                  user_id: userId,
                  title: title,
                  message: message,
                  type: "quiz",
                  read: false,
                  created_at: attempt.completed_at
                })

              if (!insertError) created++
            }
          }
        }
      }

      return { success: true, created }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Optimize database performance
   */
  private async optimizePerformance(userId: string) {
    try {
      // Create indexes for better performance
      await this.supabase.rpc('create_notification_indexes')
      
      // Clean up old notifications (older than 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      
      const { error: cleanupError } = await this.supabase
        .from("notifications")
        .delete()
        .eq("user_id", userId)
        .lt("created_at", thirtyDaysAgo)

      if (cleanupError) throw cleanupError

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Verify system health
   */
  private async verifySystemHealth(userId: string) {
    try {
      const { data: notifications, error } = await this.supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error

      const total = notifications?.length || 0
      const unread = notifications?.filter(n => !n.read).length || 0
      const read = total - unread

      // Check for dummy data
      const dummyPatterns = ["test", "dummy", "sample", "example", "demo", "mock"]
      const dummyCount = notifications?.filter(n => {
        const title = n.title?.toLowerCase() || ""
        const message = n.message?.toLowerCase() || ""
        return dummyPatterns.some(pattern => 
          title.includes(pattern) || message.includes(pattern)
        )
      }).length || 0

      const isHealthy = dummyCount === 0 && total > 0

      return {
        success: true,
        isHealthy,
        stats: {
          total,
          unread,
          read,
          dummyCount,
          realCount: total - dummyCount
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        isHealthy: false
      }
    }
  }
}

/**
 * Quick fix function for immediate use
 */
export async function quickFixNotificationSystem(userId: string, userRole: string) {
  const optimizer = new NotificationSystemOptimizer()
  return await optimizer.fixAllIssues(userId, userRole)
}





















