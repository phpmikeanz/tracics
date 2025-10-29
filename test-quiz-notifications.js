// Test Quiz Notification System
// This script tests that faculty get notified when students complete quizzes

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testQuizNotifications() {
  console.log('🧪 Testing Quiz Notification System...\n')

  try {
    // 1. Check if triggers exist
    console.log('1. Checking database triggers...')
    const { data: triggers, error: triggerError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_object_table, action_statement')
      .in('trigger_name', [
        'trigger_notify_quiz_completion',
        'trigger_notify_quiz_graded'
      ])

    if (triggerError) {
      console.error('❌ Error checking triggers:', triggerError.message)
      return
    }

    console.log('✅ Database triggers found:', triggers.length)
    triggers.forEach(trigger => {
      console.log(`   - ${trigger.trigger_name} on ${trigger.event_object_table}`)
    })

    // 2. Get test data
    console.log('\n2. Getting test data...')
    
    const { data: testStudent } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'student')
      .limit(1)
      .single()

    const { data: testFaculty } = await supabase
      .from('profiles')
      .select('id, full_name')
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
      .select('id, title')
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

    // 3. Count notifications before test
    console.log('\n3. Counting notifications before test...')
    
    const { data: facultyNotificationsBefore } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', testFaculty.id)
      .eq('type', 'quiz')

    const { data: studentNotificationsBefore } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', testStudent.id)
      .eq('type', 'quiz')

    console.log(`   - Faculty quiz notifications before: ${facultyNotificationsBefore?.length || 0}`)
    console.log(`   - Student quiz notifications before: ${studentNotificationsBefore?.length || 0}`)

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
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 6. Check notifications after test
    console.log('\n6. Checking notifications after test...')
    
    const { data: facultyNotificationsAfter } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', testFaculty.id)
      .eq('type', 'quiz')
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: studentNotificationsAfter } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', testStudent.id)
      .eq('type', 'quiz')
      .order('created_at', { ascending: false })
      .limit(5)

    console.log(`   - Faculty quiz notifications after: ${facultyNotificationsAfter?.length || 0}`)
    console.log(`   - Student quiz notifications after: ${studentNotificationsAfter?.length || 0}`)

    // 7. Check if faculty received notification
    console.log('\n7. Checking faculty notification...')
    
    const facultyNotification = facultyNotificationsAfter?.find(n => 
      n.title === '📊 Quiz Completed' && 
      n.attempt_id === attempt.id
    )

    if (facultyNotification) {
      console.log('✅ Faculty notification created successfully!')
      console.log(`   - Title: ${facultyNotification.title}`)
      console.log(`   - Message: ${facultyNotification.message}`)
      console.log(`   - Created: ${facultyNotification.created_at}`)
    } else {
      console.log('❌ Faculty notification NOT created!')
      console.log('   Available faculty notifications:')
      facultyNotificationsAfter?.forEach(n => {
        console.log(`     - ${n.title}: ${n.message}`)
      })
    }

    // 8. Check if student received notification
    console.log('\n8. Checking student notification...')
    
    const studentNotification = studentNotificationsAfter?.find(n => 
      n.title === '🎯 Quiz Completed!' && 
      n.attempt_id === attempt.id
    )

    if (studentNotification) {
      console.log('✅ Student notification created successfully!')
      console.log(`   - Title: ${studentNotification.title}`)
      console.log(`   - Message: ${studentNotification.message}`)
      console.log(`   - Created: ${studentNotification.created_at}`)
    } else {
      console.log('❌ Student notification NOT created!')
      console.log('   Available student notifications:')
      studentNotificationsAfter?.forEach(n => {
        console.log(`     - ${n.title}: ${n.message}`)
      })
    }

    // 9. Test auto-grading for quizzes without manual questions
    console.log('\n9. Testing auto-grading...')
    
    // Update the attempt to graded status
    const { error: gradeError } = await supabase
      .from('quiz_attempts')
      .update({ status: 'graded' })
      .eq('id', attempt.id)

    if (gradeError) {
      console.log('❌ Error updating quiz to graded status:', gradeError.message)
    } else {
      console.log('✅ Quiz updated to graded status')
      
      // Wait for grading trigger
      await new Promise(resolve => setTimeout(resolve, 1000))
      
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
        console.log('✅ Student grading notification created!')
        console.log(`   - Title: ${gradingNotifications[0].title}`)
        console.log(`   - Message: ${gradingNotifications[0].message}`)
      } else {
        console.log('❌ Student grading notification NOT created!')
      }
    }

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
    console.log('\n🎉 Quiz notification system test completed!')
    console.log('\n📋 Summary:')
    console.log(`   - Database triggers: ${triggers.length > 0 ? '✅ Active' : '❌ Missing'}`)
    console.log(`   - Faculty notifications: ${facultyNotification ? '✅ Working' : '❌ Not Working'}`)
    console.log(`   - Student notifications: ${studentNotification ? '✅ Working' : '❌ Not Working'}`)
    console.log(`   - Auto-grading: ${gradingNotifications && gradingNotifications.length > 0 ? '✅ Working' : '❌ Not Working'}`)
    
    if (facultyNotification && studentNotification) {
      console.log('\n🎯 SUCCESS: Quiz notification system is working correctly!')
      console.log('   Faculty will now receive notifications when students complete quizzes.')
    } else {
      console.log('\n❌ ISSUE: Quiz notification system needs attention.')
      console.log('   Please run the fix-quiz-notification-system.sql script in Supabase.')
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
    console.error('Stack trace:', error.stack)
  }
}

// Run the test
testQuizNotifications()
