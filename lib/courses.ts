import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/types"

type Course = Database["public"]["Tables"]["courses"]["Row"]
type CourseInsert = Database["public"]["Tables"]["courses"]["Insert"]

export async function getCoursesByInstructor(instructorId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("courses")
    .select(`
      *,
      enrollments(count),
      assignments(count),
      quizzes(count)
    `)
    .eq("instructor_id", instructorId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getAllCourses() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("courses")
    .select(`
      *,
      profiles!courses_instructor_id_fkey(full_name),
      enrollments(count)
    `)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getEnrolledCourses(studentId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      *,
      courses(*)
    `)
    .eq("student_id", studentId)
    .eq("status", "approved")

  if (error) throw error
  return data?.map((enrollment) => enrollment.courses).filter(Boolean) || []
}

export async function createCourse(course: CourseInsert) {
  const supabase = createClient()

  const { data, error } = await supabase.from("courses").insert(course).select().single()

  if (error) throw error
  return data
}

export async function updateCourse(id: string, updates: Partial<CourseInsert>) {
  const supabase = createClient()

  const { data, error } = await supabase.from("courses").update(updates).eq("id", id).select().single()

  if (error) throw error
  return data
}
