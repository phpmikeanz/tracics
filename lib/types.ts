export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: "student" | "faculty"
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role: "student" | "faculty"
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: "student" | "faculty"
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      courses: {
        Row: {
          id: string
          title: string
          description: string | null
          instructor_id: string
          course_code: string
          credits: number
          max_students: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          instructor_id: string
          course_code: string
          credits: number
          max_students: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          instructor_id?: string
          course_code?: string
          credits?: number
          max_students?: number
          created_at?: string
          updated_at?: string
        }
      }
      enrollments: {
        Row: {
          id: string
          student_id: string
          course_id: string
          status: "pending" | "approved" | "declined"
          progress: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          course_id: string
          status?: "pending" | "approved" | "declined"
          progress?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          course_id?: string
          status?: "pending" | "approved" | "declined"
          progress?: number
          created_at?: string
          updated_at?: string
        }
      }
      assignments: {
        Row: {
          id: string
          course_id: string
          title: string
          description: string | null
          due_date: string | null
          max_points: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          description?: string | null
          due_date?: string | null
          max_points?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          description?: string | null
          due_date?: string | null
          max_points?: number
          created_at?: string
          updated_at?: string
        }
      }
      assignment_submissions: {
        Row: {
          id: string
          assignment_id: string
          student_id: string
          content: string | null
          file_url: string | null
          status: "draft" | "submitted" | "graded"
          grade: number | null
          feedback: string | null
          submitted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assignment_id: string
          student_id: string
          content?: string | null
          file_url?: string | null
          status?: "draft" | "submitted" | "graded"
          grade?: number | null
          feedback?: string | null
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          assignment_id?: string
          student_id?: string
          content?: string | null
          file_url?: string | null
          status?: "draft" | "submitted" | "graded"
          grade?: number | null
          feedback?: string | null
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      quizzes: {
        Row: {
          id: string
          course_id: string
          title: string
          description: string | null
          time_limit: number | null
          max_attempts: number
          due_date: string | null
          status: "draft" | "published" | "closed"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          description?: string | null
          time_limit?: number | null
          max_attempts?: number
          due_date?: string | null
          status?: "draft" | "published" | "closed"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          description?: string | null
          time_limit?: number | null
          max_attempts?: number
          due_date?: string | null
          status?: "draft" | "published" | "closed"
          created_at?: string
          updated_at?: string
        }
      }
      quiz_questions: {
        Row: {
          id: string
          quiz_id: string
          question: string
          type: "multiple_choice" | "true_false" | "short_answer" | "essay"
          options: string[] | null
          correct_answer: string | null
          points: number
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          quiz_id: string
          question: string
          type: "multiple_choice" | "true_false" | "short_answer" | "essay"
          options?: string[] | null
          correct_answer?: string | null
          points: number
          order_index: number
          created_at?: string
        }
        Update: {
          id?: string
          quiz_id?: string
          question?: string
          type?: "multiple_choice" | "true_false" | "short_answer" | "essay"
          options?: string[] | null
          correct_answer?: string | null
          points?: number
          order_index?: number
          created_at?: string
        }
      }
      quiz_attempts: {
        Row: {
          id: string
          quiz_id: string
          student_id: string
          answers: Record<string, any>
          score: number | null
          status: "in_progress" | "completed" | "submitted" | "graded"
          started_at: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          quiz_id: string
          student_id: string
          answers?: Record<string, any>
          score?: number | null
          status?: "in_progress" | "completed" | "submitted" | "graded"
          started_at?: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          quiz_id?: string
          student_id?: string
          answers?: Record<string, any>
          score?: number | null
          status?: "in_progress" | "completed" | "submitted" | "graded"
          started_at?: string
          completed_at?: string | null
          created_at?: string
        }
      }
      quiz_question_grades: {
        Row: {
          id: string
          attempt_id: string
          question_id: string
          points_awarded: number
          feedback: string | null
          graded_by: string | null
          graded_at: string
          created_at: string
        }
        Insert: {
          id?: string
          attempt_id: string
          question_id: string
          points_awarded?: number
          feedback?: string | null
          graded_by?: string | null
          graded_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          attempt_id?: string
          question_id?: string
          points_awarded?: number
          feedback?: string | null
          graded_by?: string | null
          graded_at?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: "assignment" | "grade" | "announcement" | "quiz" | "enrollment"
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: "assignment" | "grade" | "announcement" | "quiz" | "enrollment"
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: "assignment" | "grade" | "announcement" | "quiz" | "enrollment"
          read?: boolean
          created_at?: string
        }
      }
      course_materials: {
        Row: {
          id: string
          course_id: string
          title: string
          description: string | null
          file_url: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          material_type: "document" | "video" | "link" | "assignment" | "quiz"
          is_required: boolean
          order_index: number
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          description?: string | null
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          material_type?: "document" | "video" | "link" | "assignment" | "quiz"
          is_required?: boolean
          order_index?: number
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          description?: string | null
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          material_type?: "document" | "video" | "link" | "assignment" | "quiz"
          is_required?: boolean
          order_index?: number
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
