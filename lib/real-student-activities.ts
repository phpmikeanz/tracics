import { createClient } from "@/lib/supabase/client"

export interface RealStudentActivity {
  id: string
  student_name: string
  student_avatar_url?: string
  activity_type: string
  course_title: string
  assignment_title?: string
  quiz_title?: string
  timestamp: string
  is_late?: boolean
  score?: number
  max_score?: number
  status: 'new' | 'in_progress' | 'completed' | 'late'
  details?: any
}

/**
 * Get real student activities from actual database tables
 */
export async function getRealStudentActivities(facultyId: string): Promise<RealStudentActivity[]> {
  try {
    const supabase = createClient()
    const allActivities: RealStudentActivity[] = []

    // Get all courses taught by this faculty
    const { data: courses, error: coursesError } = await supabase
      .from("courses")
      .select("id, title")
      .eq("instructor_id", facultyId)

    if (coursesError) throw coursesError
    if (!courses || courses.length === 0) return []

    const courseIds = courses.map(c => c.id)

    // Get assignment submissions
    const { data: submissions, error: submissionsError } = await supabase
      .from("assignment_submissions")
      .select(`
        id,
        submitted_at,
        assignment_id,
        student_id,
        assignments!inner(
          title,
          due_date,
          courses!inner(title)
        ),
        profiles!inner(full_name, avatar_url)
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
      submissions.forEach(submission => {
        const assignment = submission.assignments
        const course = assignment?.courses
        const student = submission.profiles
        
        if (assignment && course && student) {
          const isLate = assignment.due_date && new Date(submission.submitted_at) > new Date(assignment.due_date)
          
          allActivities.push({
            id: `submission-${submission.id}`,
            student_name: student.full_name || "Student",
            student_avatar_url: student.avatar_url,
            activity_type: isLate ? "Late Assignment Submission" : "Assignment Submitted",
            course_title: course.title,
            assignment_title: assignment.title,
            timestamp: submission.submitted_at,
            is_late: isLate,
            status: isLate ? 'late' : 'completed'
          })
        }
      })
    }

    // Get quiz attempts
    const { data: quizAttempts, error: quizAttemptsError } = await supabase
      .from("quiz_attempts")
      .select(`
        id,
        started_at,
        completed_at,
        score,
        quizzes!inner(
          title,
          max_score,
          courses!inner(title)
        ),
        profiles!inner(full_name, avatar_url)
      `)
      .in("quiz_id", 
        await supabase
          .from("quizzes")
          .select("id")
          .in("course_id", courseIds)
          .then(({ data }) => data?.map(q => q.id) || [])
      )
      .order("completed_at", { ascending: false })
      .limit(50)

    if (!quizAttemptsError && quizAttempts) {
      quizAttempts.forEach(attempt => {
        const quiz = attempt.quizzes
        const course = quiz?.courses
        const student = attempt.profiles
        
        if (quiz && course && student) {
          allActivities.push({
            id: `quiz-${attempt.id}`,
            student_name: student.full_name || "Student",
            student_avatar_url: student.avatar_url,
            activity_type: "Quiz Completed",
            course_title: course.title,
            quiz_title: quiz.title,
            timestamp: attempt.completed_at || attempt.started_at,
            score: attempt.score,
            max_score: quiz.max_score,
            status: 'completed'
          })
        }
      })
    }

    // Get enrollment activities
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from("enrollments")
      .select(`
        id,
        created_at,
        status,
        courses!inner(title),
        profiles!inner(full_name, avatar_url)
      `)
      .in("course_id", courseIds)
      .order("created_at", { ascending: false })
      .limit(20)

    if (!enrollmentsError && enrollments) {
      enrollments.forEach(enrollment => {
        const course = enrollment.courses
        const student = enrollment.profiles
        
        if (course && student) {
          allActivities.push({
            id: `enrollment-${enrollment.id}`,
            student_name: student.full_name || "Student",
            student_avatar_url: student.avatar_url,
            activity_type: `Enrollment ${enrollment.status === 'approved' ? 'Approved' : 'Requested'}`,
            course_title: course.title,
            timestamp: enrollment.created_at,
            status: enrollment.status === 'approved' ? 'completed' : 'new'
          })
        }
      })
    }

    // Sort activities by timestamp (most recent first)
    allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    return allActivities.slice(0, 100) // Limit to 100 most recent activities
  } catch (error) {
    console.error("Error loading real student activities:", error)
    return []
  }
}

/**
 * Get activity summary for faculty dashboard
 */
export async function getRealActivitySummary(facultyId: string) {
  try {
    const activities = await getRealStudentActivities(facultyId)
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    const todayActivities = activities.filter(a => {
      const activityDate = new Date(a.timestamp)
      return activityDate >= todayStart && activityDate < todayEnd
    })

    return {
      total: activities.length,
      assignments: activities.filter(a => a.activity_type.includes("Assignment")).length,
      quizzes: activities.filter(a => a.activity_type.includes("Quiz")).length,
      enrollments: activities.filter(a => a.activity_type.includes("Enrollment")).length,
      late: activities.filter(a => a.is_late).length,
      today: todayActivities.length,
      recent: activities.slice(0, 5) // Most recent 5 activities
    }
  } catch (error) {
    console.error("Error getting activity summary:", error)
    return {
      total: 0,
      assignments: 0,
      quizzes: 0,
      enrollments: 0,
      late: 0,
      today: 0,
      recent: []
    }
  }
}














