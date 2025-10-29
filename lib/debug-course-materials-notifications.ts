import { createClient } from "@/lib/supabase/client"
import { notifyNewCourseMaterial, getEnrolledStudents } from "@/lib/notifications"

/**
 * Debug course materials notification issues
 */
export async function debugCourseMaterialsNotifications(courseId: string): Promise<{
  success: boolean
  debugInfo: any
  error?: string
}> {
  try {
    console.log('🔍 Starting course materials notification debug for course:', courseId)
    
    const supabase = createClient()
    const debugInfo: any = {
      courseId,
      timestamp: new Date().toISOString()
    }

    // 1. Check if course exists
    console.log('1️⃣ Checking if course exists...')
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, course_code, instructor_id')
      .eq('id', courseId)
      .single()

    if (courseError) {
      console.error('❌ Course not found:', courseError)
      return { success: false, debugInfo: { ...debugInfo, courseError: courseError.message }, error: 'Course not found' }
    }

    debugInfo.course = course
    console.log('✅ Course found:', course.title)

    // 2. Check enrolled students
    console.log('2️⃣ Checking enrolled students...')
    const studentIds = await getEnrolledStudents(courseId)
    debugInfo.enrolledStudents = {
      count: studentIds.length,
      studentIds: studentIds
    }
    console.log('👥 Enrolled students:', studentIds.length)

    if (studentIds.length === 0) {
      console.log('⚠️ No enrolled students found - this is why notifications are failing')
      return { 
        success: false, 
        debugInfo, 
        error: 'No enrolled students found in this course' 
      }
    }

    // 3. Check if students exist in profiles
    console.log('3️⃣ Checking if students exist in profiles...')
    const { data: studentProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('id', studentIds)

    if (profilesError) {
      console.error('❌ Error fetching student profiles:', profilesError)
      return { success: false, debugInfo: { ...debugInfo, profilesError: profilesError.message }, error: 'Error fetching student profiles' }
    }

    debugInfo.studentProfiles = {
      count: studentProfiles?.length || 0,
      profiles: studentProfiles
    }
    console.log('👤 Student profiles found:', studentProfiles?.length || 0)

    // 4. Test notification creation for one student
    console.log('4️⃣ Testing notification creation...')
    const testStudentId = studentIds[0]
    const { data: testNotification, error: notificationError } = await supabase
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

    if (notificationError) {
      console.error('❌ Error creating test notification:', notificationError)
      return { 
        success: false, 
        debugInfo: { ...debugInfo, notificationError: notificationError.message }, 
        error: 'Error creating test notification' 
      }
    }

    debugInfo.testNotification = {
      success: true,
      notificationId: testNotification.id
    }
    console.log('✅ Test notification created successfully:', testNotification.id)

    // 5. Test the actual course material notification function
    console.log('5️⃣ Testing notifyNewCourseMaterial function...')
    const notificationResult = await notifyNewCourseMaterial(
      courseId,
      'Debug Test Material',
      'document',
      false
    )

    debugInfo.notificationFunctionResult = notificationResult
    console.log('📚 Course material notification result:', notificationResult)

    // 6. Check if notifications were actually created
    console.log('6️⃣ Checking if notifications were created...')
    const { data: createdNotifications, error: fetchError } = await supabase
      .from('notifications')
      .select('id, user_id, title, type, created_at')
      .eq('type', 'course_material')
      .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last minute
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('❌ Error fetching created notifications:', fetchError)
    } else {
      debugInfo.createdNotifications = {
        count: createdNotifications?.length || 0,
        notifications: createdNotifications
      }
      console.log('📋 Notifications created in last minute:', createdNotifications?.length || 0)
    }

    return {
      success: true,
      debugInfo
    }

  } catch (error) {
    console.error('❌ Unexpected error in debugCourseMaterialsNotifications:', error)
    return {
      success: false,
      debugInfo: { error: error.message },
      error: error.message
    }
  }
}

/**
 * Get detailed course information for debugging
 */
export async function getCourseDebugInfo(courseId: string): Promise<{
  success: boolean
  courseInfo: any
  error?: string
}> {
  try {
    const supabase = createClient()

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(`
        id, title, course_code, instructor_id,
        profiles!courses_instructor_id_fkey(full_name, email)
      `)
      .eq('id', courseId)
      .single()

    if (courseError) {
      return { success: false, courseInfo: null, error: courseError.message }
    }

    // Get enrollments
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('enrollments')
      .select(`
        id, student_id, status, created_at,
        profiles!enrollments_student_id_fkey(full_name, email, role)
      `)
      .eq('course_id', courseId)

    if (enrollmentError) {
      return { success: false, courseInfo: null, error: enrollmentError.message }
    }

    // Get recent course materials
    const { data: materials, error: materialsError } = await supabase
      .from('course_materials')
      .select('id, title, material_type, created_at')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (materialsError) {
      return { success: false, courseInfo: null, error: materialsError.message }
    }

    return {
      success: true,
      courseInfo: {
        course,
        enrollments: enrollments || [],
        materials: materials || []
      }
    }

  } catch (error) {
    return {
      success: false,
      courseInfo: null,
      error: error.message
    }
  }
}
