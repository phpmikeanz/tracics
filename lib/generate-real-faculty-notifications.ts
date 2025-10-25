import { createClient } from "@/lib/supabase/client"

/**
 * Generate real faculty notifications from actual student activities in the database
 */
export async function generateRealFacultyNotifications(facultyId: string) {
  try {
    const supabase = createClient()
    
    console.log("🔄 Generating real faculty notifications from student activities...")
    
    // Get all courses taught by this faculty
    const { data: courses, error: coursesError } = await supabase
      .from("courses")
      .select("id, title")
      .eq("instructor_id", facultyId)
    
    if (coursesError) {
      console.error("❌ Error fetching courses:", coursesError)
      return { success: false, error: coursesError.message }
    }
    
    if (!courses || courses.length === 0) {
      console.log("📊 No courses found for faculty")
      return { success: true, notificationsCreated: 0, message: "No courses found" }
    }
    
    const courseIds = courses.map(c => c.id)
    let notificationsCreated = 0
    
    // Generate notifications from assignment submissions
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
          const isLate = new Date(submission.submitted_at) > new Date(assignment.due_date)
          const title = isLate ? "⚠️ Late Assignment Submission" : "📚 Assignment Submitted"
          const message = `${student.full_name} ${isLate ? 'submitted late' : 'submitted'} '${assignment.title}' in ${course.title}`
          
          // Check if notification already exists
          const { data: existingNotification } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", facultyId)
            .eq("title", title)
            .eq("message", message)
            .single()
          
          if (!existingNotification) {
            const { error: insertError } = await supabase
              .from("notifications")
              .insert({
                user_id: facultyId,
                title: title,
                message: message,
                type: isLate ? "late" : "assignment",
                read: false,
                created_at: submission.submitted_at
              })
            
            if (!insertError) {
              notificationsCreated++
              console.log(`✅ Created notification: ${title}`)
            }
          }
        }
      }
    }
    
    console.log(`✅ Generated ${notificationsCreated} real faculty notifications`)
    
    return {
      success: true,
      notificationsCreated,
      message: `Generated ${notificationsCreated} real notifications from student activities`
    }
    
  } catch (error) {
    console.error("❌ Error generating real faculty notifications:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Create sample real notifications for testing
 */
export async function createSampleRealNotifications(facultyId: string) {
  try {
    const supabase = createClient()
    
    console.log("📝 Creating sample real notifications for testing...")
    
    const sampleNotifications = [
      {
        title: "📚 Assignment Submitted",
        message: "Sarah Johnson submitted 'Programming Assignment 1' in Computer Science 101",
        type: "assignment",
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
      },
      {
        title: "📊 Quiz Completed",
        message: "Mike Chen completed 'Quiz 2' in Mathematics 201 (Score: 85/100)",
        type: "quiz",
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() // 4 hours ago
      },
      {
        title: "👥 New Student Enrollment",
        message: "Lisa Rodriguez enrolled in Physics 301",
        type: "enrollment",
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() // 6 hours ago
      },
      {
        title: "⚠️ Late Assignment Submission",
        message: "David Kim submitted 'Lab Report 3' late in Chemistry 201 (1 day late)",
        type: "late",
        created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() // 8 hours ago
      },
      {
        title: "📚 Assignment Submitted",
        message: "Emma Wilson submitted 'Research Paper' in English 101",
        type: "assignment",
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() // 12 hours ago
      }
    ]
    
    let notificationsCreated = 0
    
    for (const notification of sampleNotifications) {
      // Check if notification already exists
      const { data: existingNotification } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", facultyId)
        .eq("title", notification.title)
        .eq("message", notification.message)
        .single()
      
      if (!existingNotification) {
        const { error: insertError } = await supabase
          .from("notifications")
          .insert({
            user_id: facultyId,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            read: false,
            created_at: notification.created_at
          })
        
        if (!insertError) {
          notificationsCreated++
          console.log(`✅ Created sample notification: ${notification.title}`)
        }
      }
    }
    
    console.log(`✅ Created ${notificationsCreated} sample real notifications`)
    
    return {
      success: true,
      notificationsCreated,
      message: `Created ${notificationsCreated} sample real notifications`
    }
    
  } catch (error) {
    console.error("❌ Error creating sample real notifications:", error)
    return { success: false, error: error.message }
  }
}













