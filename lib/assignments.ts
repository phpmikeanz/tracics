import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/types"
import { 
  notifyAssignmentSubmission, 
  notifyAssignmentGradedEnhanced, 
  notifyNewAssignmentPublished,
  getCourseInstructor, 
  getStudentName, 
  getAssignmentTitle 
} from "@/lib/notifications"

type Assignment = Database["public"]["Tables"]["assignments"]["Row"]
type AssignmentInsert = Database["public"]["Tables"]["assignments"]["Insert"]
type AssignmentUpdate = Database["public"]["Tables"]["assignments"]["Update"]
type Submission = Database["public"]["Tables"]["assignment_submissions"]["Row"]
type SubmissionInsert = Database["public"]["Tables"]["assignment_submissions"]["Insert"]
type SubmissionUpdate = Database["public"]["Tables"]["assignment_submissions"]["Update"]

export async function getAssignmentsByCourse(courseId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getAssignmentsForStudent(studentId: string) {
  const supabase = createClient()

  // First get student's enrolled courses
  const { data: enrollments, error: enrollmentsError } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", studentId)
    .eq("status", "approved")

  if (enrollmentsError) throw enrollmentsError
  if (!enrollments || enrollments.length === 0) return []

  const courseIds = enrollments.map(e => e.course_id)

  // Then get assignments for those courses
  const { data, error } = await supabase
    .from("assignments")
    .select(`
      *,
      courses(title, course_code)
    `)
    .in("course_id", courseIds)
    .order("created_at", { ascending: false })
    .order("due_date", { ascending: true, nullsFirst: false })

  if (error) throw error
  return data || []
}

export async function createAssignment(assignment: AssignmentInsert) {
  const supabase = createClient()

  const { data, error } = await supabase.from("assignments").insert(assignment).select().single()

  if (error) throw error

  // Trigger notification for students when new assignment is created
  if (data) {
    try {
      await notifyNewAssignmentPublished(
        data.course_id,
        data.title,
        data.due_date || undefined
      )
    } catch (notificationError) {
      console.error('Error sending new assignment notification:', notificationError)
      // Don't throw error - notification failure shouldn't break assignment creation
    }
  }

  return data
}

export async function updateAssignment(id: string, updates: AssignmentUpdate) {
  const supabase = createClient()

  console.log("updateAssignment called with:", { id, updates })

  try {
    // Validate the update data
    const updateData: any = {}
    
    if (updates.title !== undefined) {
      updateData.title = updates.title
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description
    }
    if (updates.max_points !== undefined) {
      updateData.max_points = updates.max_points
    }
    if (updates.due_date !== undefined) {
      updateData.due_date = updates.due_date
    }
    
    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString()

    console.log("Update data prepared:", updateData)

    // Update the assignment
    const { data, error } = await supabase
      .from("assignments")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating assignment:", error)
      console.error("Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }
    
    console.log("Assignment updated successfully:", data)
    return data
  } catch (error) {
    console.error("Error in updateAssignment:", error)
    throw error
  }
}

export async function deleteAssignment(id: string) {
  const supabase = createClient()

  const { error } = await supabase.from("assignments").delete().eq("id", id)

  if (error) throw error
}

// Test function to verify database update
export async function testUpdateAssignment(id: string, testData: { title: string; description: string; max_points: number }) {
  const supabase = createClient()

  console.log("Testing assignment update with:", { id, testData })

  try {
    const { data, error } = await supabase
      .from("assignments")
      .update({
        title: testData.title,
        description: testData.description,
        max_points: testData.max_points,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Test update error:", error)
      throw error
    }

    console.log("Test update successful:", data)
    return data
  } catch (error) {
    console.error("Test update failed:", error)
    throw error
  }
}

// Submission functions
export async function getSubmissionsByAssignment(assignmentId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("assignment_submissions")
    .select(`
      *,
      profiles(full_name, email)
    `)
    .eq("assignment_id", assignmentId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getSubmissionByStudentAndAssignment(studentId: string, assignmentId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("assignment_submissions")
    .select("*")
    .eq("student_id", studentId)
    .eq("assignment_id", assignmentId)
    .single()

  if (error && error.code !== "PGRST116") throw error // PGRST116 is "not found"
  return data
}

export async function submitAssignment(submission: SubmissionInsert) {
  const supabase = createClient()

  // Check if submission already exists
  const existing = await getSubmissionByStudentAndAssignment(submission.student_id, submission.assignment_id)
  
  let data: any
  
  if (existing) {
    // Update existing submission
    const result = await supabase
      .from("assignment_submissions")
      .update({
        ...submission,
        status: "submitted",
        submitted_at: new Date().toISOString()
      })
      .eq("id", existing.id)
      .select()
      .single()
    
    if (result.error) throw result.error
    data = result.data
  } else {
    // Create new submission
    const result = await supabase
      .from("assignment_submissions")
      .insert({
        ...submission,
        status: "submitted",
        submitted_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (result.error) throw result.error
    data = result.data
  }

  // Trigger notification for faculty when student submits assignment
  if (data) {
    try {
      // Get assignment details to find course instructor
      const { data: assignmentData } = await supabase
        .from('assignments')
        .select('course_id, title, due_date')
        .eq('id', submission.assignment_id)
        .single()

      if (assignmentData) {
        const instructorId = await getCourseInstructor(assignmentData.course_id)
        
        if (instructorId) {
          const studentName = await getStudentName(submission.student_id)
          const assignmentTitle = assignmentData.title
          
          if (studentName && assignmentTitle) {
            // Check if submission is late
            const isLate = assignmentData.due_date && 
              new Date() > new Date(assignmentData.due_date)
            
            await notifyAssignmentSubmission(
              instructorId,
              studentName,
              assignmentTitle,
              isLate
            )
          }
        }
      }
    } catch (notificationError) {
      console.error('Error sending assignment submission notification:', notificationError)
      // Don't throw error - notification failure shouldn't break submission
    }
  }

  return data
}

export async function gradeSubmission(submissionId: string, grade: number, feedback?: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("assignment_submissions")
    .update({
      grade,
      feedback,
      status: "graded"
    })
    .eq("id", submissionId)
    .select(`
      *,
      assignments(title, max_points)
    `)
    .single()

  if (error) throw error

  // Trigger notification for student when assignment is graded
  if (data) {
    try {
      const studentId = data.student_id
      const assignmentTitle = data.assignments?.title || 'Assignment'
      const maxPoints = data.assignments?.max_points || 100
      
      await notifyAssignmentGradedEnhanced(
        studentId,
        assignmentTitle,
        grade,
        maxPoints,
        feedback
      )
    } catch (notificationError) {
      console.error('Error sending assignment graded notification:', notificationError)
      // Don't throw error - notification failure shouldn't break grading
    }
  }

  return data
}

export async function getAssignmentsByInstructor(instructorId: string) {
  const supabase = createClient()

  // First get instructor's courses
  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select("id")
    .eq("instructor_id", instructorId)

  if (coursesError) throw coursesError
  if (!courses || courses.length === 0) return []

  const courseIds = courses.map(c => c.id)

  // Then get assignments for those courses
  const { data, error } = await supabase
    .from("assignments")
    .select(`
      *,
      courses(title, course_code),
      assignment_submissions(count)
    `)
    .in("course_id", courseIds)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

