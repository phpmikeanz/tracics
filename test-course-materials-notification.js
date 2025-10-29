// Test script to verify course materials notifications work
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY'

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'YOUR_SUPABASE_URL') {
  console.log('❌ Please set your Supabase environment variables')
  console.log('Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCourseMaterialsNotification() {
  console.log('🧪 Testing Course Materials Notification System...')
  
  try {
    // 1. Find a course with enrolled students
    console.log('\n1️⃣ Finding a course with enrolled students...')
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select(`
        id, title, course_code,
        enrollments!inner(id, student_id, status)
      `)
      .eq('enrollments.status', 'approved')
      .limit(1)

    if (coursesError) {
      console.error('❌ Error finding courses:', coursesError)
      return
    }

    if (!courses || courses.length === 0) {
      console.log('⚠️ No courses with enrolled students found!')
      console.log('💡 Please enroll some students in a course first.')
      return
    }

    const course = courses[0]
    const enrolledStudents = course.enrollments || []
    console.log(`✅ Found course: "${course.title}" with ${enrolledStudents.length} enrolled students`)

    // 2. Create a test course material
    console.log('\n2️⃣ Creating a test course material...')
    const testMaterial = {
      course_id: course.id,
      title: 'Test Course Material - ' + new Date().toISOString(),
      description: 'This is a test material created to verify notifications work.',
      material_type: 'document',
      is_required: true,
      created_by: enrolledStudents[0].student_id // Use first student as creator for testing
    }

    const { data: newMaterial, error: materialError } = await supabase
      .from('course_materials')
      .insert(testMaterial)
      .select()
      .single()

    if (materialError) {
      console.error('❌ Error creating test material:', materialError)
      return
    }

    console.log('✅ Test material created:', newMaterial.id)

    // 3. Wait a moment for notifications to be created
    console.log('\n3️⃣ Waiting for notifications to be created...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 4. Check if notifications were created
    console.log('\n4️⃣ Checking if notifications were created...')
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('id, user_id, title, message, type, created_at')
      .eq('type', 'course_material')
      .gte('created_at', new Date(Date.now() - 10000).toISOString()) // Last 10 seconds
      .order('created_at', { ascending: false })

    if (notificationsError) {
      console.error('❌ Error fetching notifications:', notificationsError)
      return
    }

    console.log(`📋 Found ${notifications?.length || 0} course material notifications in the last 10 seconds:`)
    notifications?.forEach((notif, index) => {
      console.log(`   ${index + 1}. "${notif.title}" - User: ${notif.user_id}`)
      console.log(`      Message: ${notif.message}`)
      console.log(`      Created: ${new Date(notif.created_at).toLocaleString()}`)
    })

    // 5. Check if notifications were sent to all enrolled students
    const studentIds = enrolledStudents.map(s => s.student_id)
    const notificationUserIds = notifications?.map(n => n.user_id) || []
    const missingStudents = studentIds.filter(id => !notificationUserIds.includes(id))

    if (missingStudents.length > 0) {
      console.log(`⚠️ Notifications missing for ${missingStudents.length} students:`)
      missingStudents.forEach(id => console.log(`   - ${id}`))
    } else {
      console.log('✅ All enrolled students received notifications!')
    }

    // 6. Test the notification function directly
    console.log('\n5️⃣ Testing notification function directly...')
    try {
      // Import the notification function (this would need to be done in a real test)
      console.log('💡 To test the notification function directly, use the debug tools in your app:')
      console.log('   1. Go to notification bell icon')
      console.log('   2. Enter course ID:', course.id)
      console.log('   3. Click "Debug Course Materials"')
    } catch (error) {
      console.error('❌ Error testing notification function:', error)
    }

    // 7. Clean up test material
    console.log('\n6️⃣ Cleaning up test material...')
    const { error: deleteError } = await supabase
      .from('course_materials')
      .delete()
      .eq('id', newMaterial.id)

    if (deleteError) {
      console.log('⚠️ Could not clean up test material:', deleteError.message)
    } else {
      console.log('✅ Test material cleaned up')
    }

    // 8. Summary
    console.log('\n📊 Summary:')
    console.log(`   - Course: "${course.title}" (${course.id})`)
    console.log(`   - Enrolled students: ${enrolledStudents.length}`)
    console.log(`   - Notifications created: ${notifications?.length || 0}`)
    console.log(`   - Missing notifications: ${missingStudents.length}`)
    
    if (notifications && notifications.length > 0) {
      console.log('✅ Course materials notification system is working!')
    } else {
      console.log('❌ Course materials notification system is not working.')
      console.log('💡 Check the debug tools in your app for more details.')
    }

  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

// Run the test
testCourseMaterialsNotification()
