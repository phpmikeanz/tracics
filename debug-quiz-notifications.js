// Debug script to check quiz notifications
import { createClient } from '@supabase/supabase-js'

// You'll need to add your Supabase credentials here
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY'

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'YOUR_SUPABASE_URL') {
  console.log('❌ Please set your Supabase environment variables')
  console.log('Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugQuizNotifications() {
  console.log('🔍 Debugging Quiz Notifications...')
  
  try {
    // 1. Check all quizzes and their status
    console.log('\n📝 Checking all quizzes...')
    const { data: quizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select('id, title, status, course_id, created_at')
      .order('created_at', { ascending: false })
    
    if (quizzesError) {
      console.error('❌ Error fetching quizzes:', quizzesError)
      return
    }
    
    console.log(`Found ${quizzes?.length || 0} quizzes:`)
    quizzes?.forEach((quiz, index) => {
      console.log(`  ${index + 1}. "${quiz.title}" - Status: ${quiz.status} - Course: ${quiz.course_id}`)
    })
    
    // 2. Check published quizzes
    const publishedQuizzes = quizzes?.filter(q => q.status === 'published') || []
    console.log(`\n✅ Published quizzes: ${publishedQuizzes.length}`)
    
    if (publishedQuizzes.length === 0) {
      console.log('⚠️ No published quizzes found! This might be why students aren\'t getting notifications.')
      console.log('💡 Make sure to publish your quizzes (change status from "draft" to "published")')
      return
    }
    
    // 3. Check enrollments for each published quiz's course
    console.log('\n👥 Checking enrollments for published quiz courses...')
    for (const quiz of publishedQuizzes) {
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('student_id, status')
        .eq('course_id', quiz.course_id)
        .eq('status', 'approved')
      
      if (enrollmentsError) {
        console.error(`❌ Error fetching enrollments for course ${quiz.course_id}:`, enrollmentsError)
        continue
      }
      
      console.log(`  Quiz "${quiz.title}" (Course ${quiz.course_id}):`)
      console.log(`    - Enrolled students: ${enrollments?.length || 0}`)
      
      if (enrollments && enrollments.length > 0) {
        console.log(`    - Student IDs: ${enrollments.map(e => e.student_id).join(', ')}`)
      } else {
        console.log('    ⚠️ No enrolled students found for this course!')
      }
    }
    
    // 4. Check existing notifications
    console.log('\n🔔 Checking existing notifications...')
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('id, user_id, title, type, created_at')
      .eq('type', 'quiz')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (notificationsError) {
      console.error('❌ Error fetching notifications:', notificationsError)
      return
    }
    
    console.log(`Found ${notifications?.length || 0} quiz notifications:`)
    notifications?.forEach((notif, index) => {
      console.log(`  ${index + 1}. "${notif.title}" - User: ${notif.user_id} - ${new Date(notif.created_at).toLocaleString()}`)
    })
    
    // 5. Test notification creation
    console.log('\n🧪 Testing notification creation...')
    if (publishedQuizzes.length > 0 && enrollments && enrollments.length > 0) {
      const testQuiz = publishedQuizzes[0]
      const testStudent = enrollments[0]
      
      console.log(`Testing with quiz "${testQuiz.title}" and student ${testStudent.student_id}`)
      
      const { data: testNotification, error: testError } = await supabase
        .from('notifications')
        .insert({
          user_id: testStudent.student_id,
          title: '🧪 Test Quiz Notification',
          message: `This is a test notification for quiz "${testQuiz.title}"`,
          type: 'quiz',
          read: false
        })
        .select()
        .single()
      
      if (testError) {
        console.error('❌ Error creating test notification:', testError)
      } else {
        console.log('✅ Test notification created successfully:', testNotification.id)
      }
    }
    
    // 6. Recommendations
    console.log('\n💡 Recommendations:')
    if (publishedQuizzes.length === 0) {
      console.log('1. Publish your quizzes by changing their status from "draft" to "published"')
    }
    if (enrollments?.length === 0) {
      console.log('2. Make sure students are enrolled in courses with "approved" status')
    }
    if (notifications?.length === 0) {
      console.log('3. Check if the notification system is working by testing quiz publication')
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error)
  }
}

// Run the debug
debugQuizNotifications()
