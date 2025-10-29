// Test Notification Bell for Quiz Completions
// This script tests if faculty receive quiz completion notifications in the notification bell

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testNotificationBellQuiz() {
  console.log('🔔 Testing Notification Bell for Quiz Completions...\n')

  try {
    // 1. Get test data
    console.log('1. Getting test data...')
    
    const { data: testStudent } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'student')
      .limit(1)
      .single()

    const { data: testFaculty } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'faculty')
      .limit(1)
      .single()

    const { data: testCourse } = await supabase
      .from('courses')
      .select('id, title, instructor_id')
      .eq('instructor_id', testFaculty?.id)
      .limit(1)
      .single()

    const { data: testQuiz } = await supabase
      .from('quizzes')
      .select('id, title, course_id')
      .eq('course_id', testCourse?.id)
      .limit(1)
      .single()

    if (!testStudent || !testFaculty || !testCourse || !testQuiz) {
      console.log('❌ Missing test data. Please ensure you have:')
      console.log('   - At least one student')
      console.log('   - At least one faculty member')
      console.log('   - At least one course with the faculty as instructor')
      console.log('   - At least one quiz in that course')
      return
    }

    console.log(`   - Test Student: ${testStudent.full_name} (${testStudent.id})`)
    console.log(`   - Test Faculty: ${testFaculty.full_name} (${testFaculty.id})`)
    console.log(`   - Test Course: ${testCourse.title} (${testCourse.id})`)
    console.log(`   - Test Quiz: ${testQuiz.title} (${testQuiz.id})`)

    // 2. Check current faculty notifications
    console.log('\n2. Checking current faculty notifications...')
    
    const { data: facultyNotificationsBefore } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', testFaculty.id)
      .order('created_at', { ascending: false })

    console.log(`   - Faculty has ${facultyNotificationsBefore?.length || 0} total notifications`)
    console.log(`   - Quiz notifications: ${facultyNotificationsBefore?.filter(n => n.type === 'quiz').length || 0}`)

    // 3. Check if database triggers exist
    console.log('\n3. Checking database triggers...')
    
    const { data: triggers } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_object_table')
      .in('trigger_name', [
        'trigger_notify_quiz_completion_insert',
        'trigger_notify_quiz_completion_update'
      ])

    console.log(`   - Found ${triggers?.length || 0} quiz completion triggers`)
    triggers?.forEach(trigger => {
      console.log(`     - ${trigger.trigger_name} on ${trigger.event_object_table}`)
    })

    if (triggers?.length === 0) {
      console.log('❌ No quiz completion triggers found! Please run the fix-quiz-notification-system-corrected.sql script.')
      return
    }

    // 4. Create a test quiz attempt
    console.log('\n4. Creating test quiz attempt...')
    
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: testQuiz.id,
        student_id: testStudent.id,
        answers: { 'test': 'answer' },
        score: 85,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (attemptError) {
      console.error('❌ Error creating test quiz attempt:', attemptError.message)
      return
    }

    console.log(`✅ Test quiz attempt created with ID: ${attempt.id}`)

    // 5. Wait for triggers to fire
    console.log('\n5. Waiting for triggers to fire...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 6. Check notifications after test
    console.log('\n6. Checking notifications after test...')
    
    const { data: facultyNotificationsAfter } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', testFaculty.id)
      .order('created_at', { ascending: false })

    console.log(`   - Faculty notifications after: ${facultyNotificationsAfter?.length || 0}`)

    // 7. Check for specific quiz completion notification
    console.log('\n7. Checking for quiz completion notification in bell...')
    
    const quizNotification = facultyNotificationsAfter?.find(n => 
      n.title === '📊 Quiz Completed' && 
      n.attempt_id === attempt.id
    )

    if (quizNotification) {
      console.log('✅ Faculty quiz notification found in notification bell!')
      console.log(`   - Title: ${quizNotification.title}`)
      console.log(`   - Message: ${quizNotification.message}`)
      console.log(`   - Type: ${quizNotification.type}`)
      console.log(`   - Created: ${quizNotification.created_at}`)
      console.log(`   - Read: ${quizNotification.read}`)
      console.log(`   - Course ID: ${quizNotification.course_id}`)
      console.log(`   - Quiz ID: ${quizNotification.quiz_id}`)
      console.log(`   - Attempt ID: ${quizNotification.attempt_id}`)
    } else {
      console.log('❌ Faculty quiz notification NOT found in notification bell!')
      console.log('   Available faculty notifications:')
      facultyNotificationsAfter?.slice(0, 5).forEach(n => {
        console.log(`     - ${n.title}: ${n.message} (${n.type})`)
      })
    }

    // 8. Test notification bell display
    console.log('\n8. Testing notification bell display...')
    
    const unreadNotifications = facultyNotificationsAfter?.filter(n => !n.read) || []
    console.log(`   - Unread notifications: ${unreadNotifications.length}`)
    console.log(`   - Quiz notifications: ${facultyNotificationsAfter?.filter(n => n.type === 'quiz').length || 0}`)
    console.log(`   - Assignment notifications: ${facultyNotificationsAfter?.filter(n => n.type === 'assignment').length || 0}`)

    // 9. Clean up test data
    console.log('\n9. Cleaning up test data...')
    
    // Delete notifications first (due to foreign key constraints)
    await supabase
      .from('notifications')
      .delete()
      .eq('attempt_id', attempt.id)

    // Delete the quiz attempt
    await supabase
      .from('quiz_attempts')
      .delete()
      .eq('id', attempt.id)

    console.log('✅ Test data cleaned up')

    // 10. Summary
    console.log('\n🎉 Notification Bell Test Completed!')
    console.log('\n📋 Summary:')
    console.log(`   - Database triggers: ${triggers && triggers.length > 0 ? '✅ Active' : '❌ Missing'}`)
    console.log(`   - Faculty quiz notifications: ${quizNotification ? '✅ Working' : '❌ Not Working'}`)
    console.log(`   - Notification bell integration: ${quizNotification ? '✅ Working' : '❌ Not Working'}`)
    
    if (quizNotification) {
      console.log('\n🎯 SUCCESS: Faculty will receive quiz completion notifications in the notification bell!')
      console.log('   The notification bell should show:')
      console.log('   - Red badge with unread count')
      console.log('   - Pulsing bell icon')
      console.log('   - "📊 Quiz Completed" notification when clicked')
    } else {
      console.log('\n❌ ISSUE: Faculty are NOT receiving quiz completion notifications in the notification bell.')
      console.log('   Possible causes:')
      console.log('   1. Database triggers are not active - run fix-quiz-notification-system-corrected.sql');
      console.log('   2. Notification function has errors');
      console.log('   3. Faculty user_id is not matching instructor_id');
      console.log('   4. Notification bell is not refreshing properly');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
    console.error('Stack trace:', error.stack)
  }
}

// Run the test
testNotificationBellQuiz()
