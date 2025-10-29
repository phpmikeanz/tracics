// Test Faculty Quiz Notifications
// This script tests if faculty are receiving notifications when students complete quizzes

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testFacultyQuizNotifications() {
  console.log('🧪 Testing Faculty Quiz Notifications...\n')

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

    // 2. Check current notifications for faculty
    console.log('\n2. Checking current faculty notifications...')
    
    const { data: facultyNotificationsBefore } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', testFaculty.id)
      .order('created_at', { ascending: false })

    console.log(`   - Faculty has ${facultyNotificationsBefore?.length || 0} total notifications`)
    console.log(`   - Quiz notifications: ${facultyNotificationsBefore?.filter(n => n.type === 'quiz').length || 0}`)
    console.log(`   - Assignment notifications: ${facultyNotificationsBefore?.filter(n => n.type === 'assignment').length || 0}`)

    // 3. Check if triggers exist
    console.log('\n3. Checking database triggers...')
    
    const { data: triggers } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_object_table')
      .in('trigger_name', [
        'trigger_notify_quiz_completion_insert',
        'trigger_notify_quiz_completion_update',
        'trigger_notify_quiz_graded'
      ])

    console.log(`   - Found ${triggers?.length || 0} quiz notification triggers`)
    triggers?.forEach(trigger => {
      console.log(`     - ${trigger.trigger_name} on ${trigger.event_object_table}`)
    })

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

    const { data: studentNotificationsAfter } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', testStudent.id)
      .order('created_at', { ascending: false })

    console.log(`   - Faculty notifications after: ${facultyNotificationsAfter?.length || 0}`)
    console.log(`   - Student notifications after: ${studentNotificationsAfter?.length || 0}`)

    // 7. Check for specific quiz completion notifications
    console.log('\n7. Checking for quiz completion notifications...')
    
    const facultyQuizNotification = facultyNotificationsAfter?.find(n => 
      n.title === '📊 Quiz Completed' && 
      n.attempt_id === attempt.id
    )

    const studentQuizNotification = studentNotificationsAfter?.find(n => 
      n.title === '🎯 Quiz Completed!' && 
      n.attempt_id === attempt.id
    )

    if (facultyQuizNotification) {
      console.log('✅ Faculty quiz notification found!')
      console.log(`   - Title: ${facultyQuizNotification.title}`)
      console.log(`   - Message: ${facultyQuizNotification.message}`)
      console.log(`   - Type: ${facultyQuizNotification.type}`)
      console.log(`   - Created: ${facultyQuizNotification.created_at}`)
      console.log(`   - Read: ${facultyQuizNotification.read}`)
    } else {
      console.log('❌ Faculty quiz notification NOT found!')
      console.log('   Available faculty notifications:')
      facultyNotificationsAfter?.slice(0, 5).forEach(n => {
        console.log(`     - ${n.title}: ${n.message} (${n.type})`)
      })
    }

    if (studentQuizNotification) {
      console.log('✅ Student quiz notification found!')
      console.log(`   - Title: ${studentQuizNotification.title}`)
      console.log(`   - Message: ${studentQuizNotification.message}`)
    } else {
      console.log('❌ Student quiz notification NOT found!')
    }

    // 8. Test auto-grading
    console.log('\n8. Testing auto-grading...')
    
    const { error: gradeError } = await supabase
      .from('quiz_attempts')
      .update({ status: 'graded' })
      .eq('id', attempt.id)

    if (gradeError) {
      console.log('❌ Error updating quiz to graded status:', gradeError.message)
    } else {
      console.log('✅ Quiz updated to graded status')
      
      // Wait for grading trigger
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Check for grading notification
      const { data: gradingNotifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', testStudent.id)
        .eq('type', 'grade')
        .eq('attempt_id', attempt.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (gradingNotifications && gradingNotifications.length > 0) {
        console.log('✅ Student grading notification found!')
        console.log(`   - Title: ${gradingNotifications[0].title}`)
        console.log(`   - Message: ${gradingNotifications[0].message}`)
      } else {
        console.log('❌ Student grading notification NOT found!')
      }
    }

    // 9. Check notification bell data
    console.log('\n9. Checking notification bell data...')
    
    const { data: unreadNotifications } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', testFaculty.id)
      .eq('read', false)

    console.log(`   - Faculty unread notifications: ${unreadNotifications?.length || 0}`)

    // 10. Clean up test data
    console.log('\n10. Cleaning up test data...')
    
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

    // 11. Summary
    console.log('\n🎉 Faculty Quiz Notification Test Completed!')
    console.log('\n📋 Summary:')
    console.log(`   - Database triggers: ${triggers && triggers.length > 0 ? '✅ Active' : '❌ Missing'}`)
    console.log(`   - Faculty quiz notifications: ${facultyQuizNotification ? '✅ Working' : '❌ Not Working'}`)
    console.log(`   - Student quiz notifications: ${studentQuizNotification ? '✅ Working' : '❌ Not Working'}`)
    console.log(`   - Auto-grading notifications: ${gradingNotifications && gradingNotifications.length > 0 ? '✅ Working' : '❌ Not Working'}`)
    
    if (facultyQuizNotification) {
      console.log('\n🎯 SUCCESS: Faculty are receiving quiz completion notifications!')
      console.log('   The notification bell should show the new notification.')
    } else {
      console.log('\n❌ ISSUE: Faculty are NOT receiving quiz completion notifications.')
      console.log('   Possible causes:')
      console.log('   1. Database triggers are not active')
      console.log('   2. Notification function has errors')
      console.log('   3. Faculty user_id is not matching instructor_id')
      console.log('   4. Notification bell is not refreshing properly')
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
    console.error('Stack trace:', error.stack)
  }
}

// Run the test
testFacultyQuizNotifications()
