import { createClient } from "@/lib/supabase/client"
import { notifyNewQuiz } from "@/lib/notifications"

/**
 * Manually trigger notifications for all published quizzes
 * This can be used to send notifications for quizzes that were published before the notification system was implemented
 */
export async function triggerNotificationsForPublishedQuizzes(): Promise<{
  success: boolean
  processed: number
  errors: string[]
}> {
  const supabase = createClient()
  const errors: string[] = []
  let processed = 0

  try {
    console.log('🔔 Triggering notifications for all published quizzes...')

    // Get all published quizzes
    const { data: publishedQuizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select('id, title, course_id, due_date, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (quizzesError) {
      console.error('❌ Error fetching published quizzes:', quizzesError)
      return { success: false, processed: 0, errors: [quizzesError.message] }
    }

    if (!publishedQuizzes || publishedQuizzes.length === 0) {
      console.log('⚠️ No published quizzes found')
      return { success: true, processed: 0, errors: [] }
    }

    console.log(`📝 Found ${publishedQuizzes.length} published quizzes`)

    // Process each quiz
    for (const quiz of publishedQuizzes) {
      try {
        console.log(`Processing quiz: "${quiz.title}" (Course: ${quiz.course_id})`)
        
        // Check if notifications already exist for this quiz
        const { data: existingNotifications, error: checkError } = await supabase
          .from('notifications')
          .select('id')
          .eq('type', 'quiz')
          .ilike('message', `%${quiz.title}%`)
          .limit(1)

        if (checkError) {
          console.error(`❌ Error checking existing notifications for quiz ${quiz.id}:`, checkError)
          errors.push(`Quiz ${quiz.title}: ${checkError.message}`)
          continue
        }

        if (existingNotifications && existingNotifications.length > 0) {
          console.log(`⏭️ Skipping quiz "${quiz.title}" - notifications already exist`)
          continue
        }

        // Trigger notification for this quiz
        const success = await notifyNewQuiz(
          quiz.course_id,
          quiz.title,
          quiz.due_date || undefined
        )

        if (success) {
          console.log(`✅ Notifications sent for quiz: "${quiz.title}"`)
          processed++
        } else {
          console.log(`❌ Failed to send notifications for quiz: "${quiz.title}"`)
          errors.push(`Quiz ${quiz.title}: Failed to send notifications`)
        }

        // Add a small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`❌ Error processing quiz ${quiz.id}:`, error)
        errors.push(`Quiz ${quiz.title}: ${error.message}`)
      }
    }

    console.log(`✅ Processed ${processed} quizzes with ${errors.length} errors`)
    return { success: true, processed, errors }

  } catch (error) {
    console.error('❌ Unexpected error in triggerNotificationsForPublishedQuizzes:', error)
    return { success: false, processed, errors: [error.message] }
  }
}

/**
 * Check the status of quiz notifications
 */
export async function checkQuizNotificationStatus(): Promise<{
  publishedQuizzes: number
  enrolledStudents: number
  existingNotifications: number
  coursesWithStudents: number
}> {
  const supabase = createClient()

  try {
    // Count published quizzes
    const { count: publishedQuizzes } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')

    // Count enrolled students
    const { count: enrolledStudents } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')

    // Count existing quiz notifications
    const { count: existingNotifications } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'quiz')

    // Count courses with enrolled students
    const { data: coursesWithStudents } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('status', 'approved')
      .not('course_id', 'is', null)

    const uniqueCourses = new Set(coursesWithStudents?.map(e => e.course_id) || []).size

    return {
      publishedQuizzes: publishedQuizzes || 0,
      enrolledStudents: enrolledStudents || 0,
      existingNotifications: existingNotifications || 0,
      coursesWithStudents: uniqueCourses
    }

  } catch (error) {
    console.error('❌ Error checking quiz notification status:', error)
    return {
      publishedQuizzes: 0,
      enrolledStudents: 0,
      existingNotifications: 0,
      coursesWithStudents: 0
    }
  }
}
