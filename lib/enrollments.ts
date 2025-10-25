import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/types"

type Enrollment = Database["public"]["Tables"]["enrollments"]["Row"]
type EnrollmentInsert = Database["public"]["Tables"]["enrollments"]["Insert"]
type EnrollmentUpdate = Database["public"]["Tables"]["enrollments"]["Update"]

export async function getEnrollmentsByCourse(courseId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      *,
      profiles(full_name, email, avatar_url)
    `)
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getEnrollmentsByStudent(studentId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      *,
      courses(*)
    `)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function requestEnrollment(enrollment: EnrollmentInsert) {
  const supabase = createClient()

  const { data, error } = await supabase.from("enrollments").insert(enrollment).select().single()

  if (error) throw error
  return data
}

export async function updateEnrollmentStatus(id: string, status: "approved" | "declined") {
  const supabase = createClient()

  const { data, error } = await supabase.from("enrollments").update({ status }).eq("id", id).select().single()

  if (error) throw error
  return data
}

export async function updateEnrollmentProgress(id: string, progress: number) {
  const supabase = createClient()

  const { data, error } = await supabase.from("enrollments").update({ progress }).eq("id", id).select().single()

  if (error) throw error
  return data
}

export async function getPendingEnrollments(instructorId: string) {
  const supabase = createClient()

  // First get instructor's courses
  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select("id")
    .eq("instructor_id", instructorId)

  if (coursesError) throw coursesError
  if (!courses || courses.length === 0) return []

  const courseIds = courses.map(course => course.id)

  // Then get enrollments for those courses
  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      *,
      profiles(full_name, email, avatar_url),
      courses(title, course_code)
    `)
    .in("course_id", courseIds)
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getEnrollmentsForInstructor(instructorId: string) {
  const supabase = createClient()

  // First get instructor's courses
  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select("id")
    .eq("instructor_id", instructorId)

  if (coursesError) throw coursesError
  if (!courses || courses.length === 0) return []

  const courseIds = courses.map(course => course.id)

  // Then get all enrollments for those courses
  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      *,
      profiles(full_name, email, avatar_url),
      courses(title, course_code)
    `)
    .in("course_id", courseIds)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}
