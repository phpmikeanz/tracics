// Debug script to check course_materials table and notification issues
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

async function debugCourseMaterialsSchema() {
  console.log('🔍 Debugging Course Materials Schema and Notifications...')
  
  try {
    // 1. Check course_materials table structure
    console.log('\n📋 1. Checking course_materials table structure...')
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'course_materials')
      .eq('table_schema', 'public')
      .order('ordinal_position')

    if (columnsError) {
      console.error('❌ Error checking table structure:', columnsError)
    } else {
      console.log('✅ Table structure:')
      columns?.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
      })
    }

    // 2. Check existing course materials
    console.log('\n📚 2. Checking existing course materials...')
    const { data: materials, error: materialsError } = await supabase
      .from('course_materials')
      .select('id, title, course_id, material_type, is_required, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (materialsError) {
      console.error('❌ Error fetching course materials:', materialsError)
    } else {
      console.log(`✅ Found ${materials?.length || 0} course materials:`)
      materials?.forEach((material, index) => {
        console.log(`   ${index + 1}. "${material.title}" (${material.material_type}) - Course: ${material.course_id}`)
      })
    }

    // 3. Check courses and their enrollments
    console.log('\n🎓 3. Checking courses and enrollments...')
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select(`
        id, title, course_code,
        enrollments(id, student_id, status)
      `)
      .limit(5)

    if (coursesError) {
      console.error('❌ Error fetching courses:', coursesError)
    } else {
      console.log(`✅ Found ${courses?.length || 0} courses:`)
      courses?.forEach((course, index) => {
        const approvedEnrollments = course.enrollments?.filter(e => e.status === 'approved') || []
        console.log(`   ${index + 1}. "${course.title}" - Enrollments: ${approvedEnrollments.length}`)
        if (approvedEnrollments.length > 0) {
          console.log(`      Student IDs: ${approvedEnrollments.map(e => e.student_id).join(', ')}`)
        }
      })
    }

    // 4. Check notifications table
    console.log('\n🔔 4. Checking notifications table...')
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('id, user_id, title, type, created_at')
      .eq('type', 'course_material')
      .order('created_at', { ascending: false })
      .limit(10)

    if (notificationsError) {
      console.error('❌ Error fetching notifications:', notificationsError)
    } else {
      console.log(`✅ Found ${notifications?.length || 0} course material notifications:`)
      notifications?.forEach((notif, index) => {
        console.log(`   ${index + 1}. "${notif.title}" - User: ${notif.user_id} - ${new Date(notif.created_at).toLocaleString()}`)
      })
    }

    // 5. Test notification creation
    console.log('\n🧪 5. Testing notification creation...')
    if (courses && courses.length > 0) {
      const testCourse = courses[0]
      const testStudentId = testCourse.enrollments?.find(e => e.status === 'approved')?.student_id
      
      if (testStudentId) {
        console.log(`Testing with course "${testCourse.title}" and student ${testStudentId}`)
        
        const { data: testNotification, error: testError } = await supabase
          .from('notifications')
          .insert({
            user_id: testStudentId,
            title: '🧪 Test Course Material Notification',
            message: 'This is a test notification for course materials debugging.',
            type: 'course_material',
            read: false
          })
          .select()
          .single()

        if (testError) {
          console.error('❌ Error creating test notification:', testError)
          console.error('Error details:', {
            message: testError.message,
            details: testError.details,
            hint: testError.hint,
            code: testError.code
          })
        } else {
          console.log('✅ Test notification created successfully:', testNotification.id)
        }
      } else {
        console.log('⚠️ No enrolled students found in the first course for testing')
      }
    } else {
      console.log('⚠️ No courses found for testing')
    }

    // 6. Check RLS policies
    console.log('\n🔒 6. Checking RLS policies...')
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, permissive, roles, cmd, qual, with_check')
      .eq('tablename', 'course_materials')

    if (policiesError) {
      console.error('❌ Error checking RLS policies:', policiesError)
    } else {
      console.log(`✅ Found ${policies?.length || 0} RLS policies for course_materials:`)
      policies?.forEach((policy, index) => {
        console.log(`   ${index + 1}. ${policy.policyname} (${policy.cmd})`)
        console.log(`      Roles: ${policy.roles}`)
        console.log(`      Qual: ${policy.qual}`)
      })
    }

    // 7. Recommendations
    console.log('\n💡 7. Recommendations:')
    
    if (!materials || materials.length === 0) {
      console.log('   - No course materials found. Create some materials to test notifications.')
    }
    
    if (!courses || courses.length === 0) {
      console.log('   - No courses found. Create courses and enroll students.')
    }
    
    const coursesWithEnrollments = courses?.filter(c => 
      c.enrollments?.some(e => e.status === 'approved')
    ) || []
    
    if (coursesWithEnrollments.length === 0) {
      console.log('   - No courses with enrolled students found. Enroll students in courses.')
    }
    
    if (!notifications || notifications.length === 0) {
      console.log('   - No course material notifications found. This might be why notifications are failing.')
    }

    console.log('\n✅ Debug completed! Check the results above to identify the issue.')

  } catch (error) {
    console.error('❌ Debug error:', error)
  }
}

// Run the debug
debugCourseMaterialsSchema()
