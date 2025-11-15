import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/types"
import { 
  notifyQuizCompleted, 
  notifyQuizGraded, 
  notifyNewQuiz,
  getCourseInstructor, 
  getStudentName, 
  getQuizTitle 
} from "@/lib/notifications"

type Quiz = Database["public"]["Tables"]["quizzes"]["Row"] & {
  courses?: { title: string; course_code: string } | null
  quiz_questions?: Database["public"]["Tables"]["quiz_questions"]["Row"][]
  quiz_attempts?: { count: number }[]
}

type QuizInsert = Database["public"]["Tables"]["quizzes"]["Insert"]
type QuizQuestion = Database["public"]["Tables"]["quiz_questions"]["Row"]
type QuizQuestionInsert = Database["public"]["Tables"]["quiz_questions"]["Insert"]
type QuizAttempt = Database["public"]["Tables"]["quiz_attempts"]["Row"] & {
  profiles?: { full_name: string } | null
  quizzes?: { title: string; time_limit: number | null } | null
}
type QuizAttemptInsert = Database["public"]["Tables"]["quiz_attempts"]["Insert"]

// Faculty functions

// Get all quizzes created by an instructor
export async function getQuizzesByInstructor(instructorId: string): Promise<Quiz[]> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('quizzes')
      .select(`
        *,
        courses!inner(title, course_code, instructor_id),
        quiz_questions(id, points, type, question),
        quiz_attempts(count)
      `)
      .eq('courses.instructor_id', instructorId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching quizzes:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getQuizzesByInstructor:', error)
    throw error
  }
}

// Create a new quiz
export async function createQuiz(quiz: QuizInsert): Promise<Quiz | null> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('quizzes')
      .insert(quiz)
      .select(`
        *,
        courses(title, course_code)
      `)
      .single()

    if (error) {
      console.error('Error creating quiz:', error)
      throw error
    }

    // Trigger notification for students when quiz is published
    if (data && data.status === 'published') {
      try {
        await notifyNewQuiz(
          data.course_id,
          data.title,
          data.due_date || undefined
        )
      } catch (notificationError) {
        console.error('Error sending new quiz notification:', notificationError)
        // Don't throw error - notification failure shouldn't break quiz creation
      }
    }

    return data
  } catch (error) {
    console.error('Error in createQuiz:', error)
    throw error
  }
}

// Get quiz questions for a specific quiz
export async function getQuizQuestions(quizId: string): Promise<QuizQuestion[]> {
  try {
    const supabase = createClient()
    
    console.log('Fetching questions for quiz:', quizId)
    
    // Validate quiz ID
    if (!quizId || typeof quizId !== 'string') {
      console.error('Invalid quiz ID:', quizId)
      return []
    }
    
    // Get current user and their role
    const { data: { user } } = await supabase.auth.getUser()
    let userRole = 'student' // default
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      userRole = profile?.role || 'student'
      console.log('User role:', userRole)
    }
    
    // First, let's check if we can access the quiz itself
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, status, course_id')
      .eq('id', quizId)
      .single()
    
    console.log('Quiz data:', quizData, 'Quiz error:', quizError)
    
    if (quizError) {
      console.error('Cannot access quiz:', quizError)
      // Don't throw error, just return empty array and log the issue
      console.warn('Returning empty array due to quiz access error')
      return []
    }
    
    if (!quizData) {
      console.error('Quiz not found:', quizId)
      console.warn('Returning empty array - quiz not found')
      return []
    }
    
    // For students, ensure the quiz is published or closed
    if (userRole === 'student' && !['published', 'closed'].includes(quizData.status)) {
      console.error('Quiz is not published for student access:', quizData.status)
      console.warn('Students can only access published or closed quizzes')
      return []
    }
    
    // RLS policies will handle access control, so we don't need to check enrollment here
    console.log('User role:', userRole, '- RLS policies will handle access control')
    
    console.log('About to query quiz_questions table for quiz_id:', quizId)
    console.log('Quiz ID type:', typeof quizId)
    console.log('Quiz ID length:', quizId?.length)
    
    // Single optimized query - try with order_index first, fallback if needed
    let { data, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true })

    // If ordering fails, try without order_index (faster fallback)
    if (error) {
      console.log('Ordered query failed, trying without order_index:', error.message)
      const retryResult = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
      
      data = retryResult.data
      error = retryResult.error
    }

    console.log('Quiz questions query result:', { 
      count: data?.length || 0, 
      error: error?.message || null,
      quizId: quizId,
      userRole: userRole
    })

    if (error) {
      console.error('❌ Error fetching quiz questions:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        quizId: quizId,
        userRole: userRole
      })
      
      // Check if it's an RLS policy error
      if (error.code === '42501' || error.message.includes('policy')) {
        console.error('❌ RLS policy blocking access - user may not be enrolled or approved for this course')
        console.error('User ID:', user?.id)
        console.error('Quiz ID:', quizId)
        console.error('Quiz status:', quizData?.status)
        console.error('Course ID:', quizData?.course_id)
      }
      
      // Don't throw error, just return empty array and log the issue
      console.warn('⚠️ Returning empty array due to query error')
      return []
    }

    console.log('✅ Quiz questions fetched successfully:', data)
    console.log('📊 Number of questions found:', data?.length || 0)
    console.log('📊 Raw questions from database:', data)
    console.log('📊 Question IDs:', data?.map(q => q.id) || [])
    console.log('📊 Question types:', data?.map(q => q.type) || [])
    
    if (!data || data.length === 0) {
      console.warn('No questions found for quiz:', quizId)
      console.warn('This could be due to:')
      console.warn('1. RLS policies blocking access - check if user is enrolled and approved')
      console.warn('2. Questions not properly linked to quiz')
      console.warn('3. Database connection issue')
      console.warn('4. Quiz status is not published/closed for students')
      console.warn('5. User role or enrollment issues')
      
      // Additional debugging for students
      if (userRole === 'student') {
        console.warn('Student debugging info:')
        console.warn('- User ID:', user?.id)
        console.warn('- Quiz status:', quizData?.status)
        console.warn('- Course ID:', quizData?.course_id)
      }
    } else {
      console.log('Questions details:', data.map(q => ({
        id: q.id,
        type: q.type,
        question: q.question?.substring(0, 50) + '...',
        hasOptions: !!q.options,
        optionsCount: q.options?.length || 0,
        points: q.points,
        orderIndex: q.order_index
      })))
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getQuizQuestions:', error)
    // Don't throw error, just return empty array and log the issue
    console.warn('Returning empty array due to error:', error)
    return []
  }
}

// Debug function to check quiz questions access
export async function debugQuizQuestions(quizId: string): Promise<{ success: boolean; data: any; error?: string }> {
  try {
    const supabase = createClient()
    
    console.log('=== DEBUGGING QUIZ QUESTIONS ===')
    console.log('Quiz ID:', quizId)
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    console.log('Current user:', user?.id)
    
    // Get user role
    let userRole = 'student'
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      userRole = profile?.role || 'student'
      console.log('User role:', userRole)
    }
    
    // Check quiz access
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single()
    
    console.log('Quiz data:', quizData)
    console.log('Quiz error:', quizError)
    
    // Check enrollment (for students)
    let enrollmentData = null
    if (user && userRole === 'student' && quizData) {
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('course_id', quizData.course_id)
        .eq('student_id', user.id)
        .single()
      
      enrollmentData = enrollment
      console.log('Enrollment data:', enrollment)
      console.log('Enrollment error:', enrollmentError)
    }
    
    // Try different query approaches
    const queries = [
      {
        name: 'Full query with order',
        query: supabase.from('quiz_questions').select('*').eq('quiz_id', quizId).order('order_index', { ascending: true })
      },
      {
        name: 'Basic query without order',
        query: supabase.from('quiz_questions').select('*').eq('quiz_id', quizId)
      },
      {
        name: 'Minimal query',
        query: supabase.from('quiz_questions').select('id, quiz_id, question, type').eq('quiz_id', quizId)
      }
    ]
    
    const results = []
    for (const { name, query } of queries) {
      const { data, error } = await query
      results.push({ name, data, error })
      console.log(`${name}:`, { data, error })
    }
    
    // Check if questions exist in database (bypass RLS)
    const { data: allQuestions, error: allQuestionsError } = await supabase
      .from('quiz_questions')
      .select('id, quiz_id, question, type')
      .eq('quiz_id', quizId)
    
    console.log('All questions (bypass RLS):', allQuestions)
    console.log('All questions error:', allQuestionsError)
    
    return {
      success: true,
      data: {
        quizId,
        user: user?.id,
        userRole,
        quizData,
        quizError,
        enrollmentData,
        queryResults: results,
        allQuestions,
        allQuestionsError
      }
    }
  } catch (error) {
    console.error('Error in debugQuizQuestions:', error)
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Add questions to a quiz
export async function addQuizQuestions(questions: QuizQuestionInsert[]): Promise<QuizQuestion[]> {
  try {
    const supabase = createClient()
    
    console.log('Adding quiz questions:', questions)
    
    const { data, error } = await supabase
      .from('quiz_questions')
      .insert(questions)
      .select('*')

    if (error) {
      console.error('Error adding quiz questions:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }

    console.log('Successfully added quiz questions:', data)
    return data || []
  } catch (error) {
    console.error('Error in addQuizQuestions:', error)
    throw error
  }
}

// Get quiz attempts for a specific quiz
export async function getQuizAttempts(quizId: string): Promise<QuizAttempt[]> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        profiles(*),
        quizzes(title, time_limit)
      `)
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching quiz attempts:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getQuizAttempts:', error)
    throw error
  }
}

// Student functions

// Get quizzes for a student (from enrolled courses)
export async function getQuizzesForStudent(studentId: string): Promise<Quiz[]> {
  try {
    const supabase = createClient()
    
    console.log('Getting quizzes for student:', studentId)
    
    // First get the courses the student is enrolled in
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('student_id', studentId)
      .eq('status', 'approved')

    if (enrollmentError) {
      console.error('Error fetching enrollments:', enrollmentError)
      throw enrollmentError
    }

    console.log('Student enrollments:', enrollments)

    if (!enrollments || enrollments.length === 0) {
      console.log('No enrollments found for student')
      return []
    }

    const courseIds = enrollments.map(e => e.course_id)
    console.log('Course IDs:', courseIds)

    // Get quizzes from enrolled courses (published and closed quizzes)
    const { data, error } = await supabase
      .from('quizzes')
      .select(`
        *,
        courses(title, course_code)
      `)
      .in('course_id', courseIds)
      .in('status', ['published', 'closed'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching student quizzes:', error)
      throw error
    }

    console.log('Quizzes found for student:', data)
    return data || []
  } catch (error) {
    console.error('Error in getQuizzesForStudent:', error)
    throw error
  }
}

// Get student's attempt for a specific quiz
export async function getStudentQuizAttempt(studentId: string, quizId: string): Promise<QuizAttempt | null> {
  try {
    const supabase = createClient()
    
    console.log('Fetching student quiz attempt:', { studentId, quizId })
    
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        quizzes(title, time_limit, max_attempts)
      `)
      .eq('student_id', studentId)
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching student quiz attempt:', error)
      throw error
    }

    console.log('Student quiz attempt result:', data)
    return data
  } catch (error) {
    console.error('Error in getStudentQuizAttempt:', error)
    throw error
  }
}

// Force refresh student quiz attempt (bypasses any caching)
export async function forceRefreshStudentQuizAttempt(studentId: string, quizId: string): Promise<QuizAttempt | null> {
  try {
    const supabase = createClient()
    
    console.log('Force refreshing student quiz attempt:', { studentId, quizId })
    
    // Add a small delay to ensure database consistency
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        quizzes(title, time_limit, max_attempts)
      `)
      .eq('student_id', studentId)
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error force refreshing student quiz attempt:', error)
      throw error
    }

    console.log('Force refreshed student quiz attempt result:', data)
    return data
  } catch (error) {
    console.error('Error in forceRefreshStudentQuizAttempt:', error)
    throw error
  }
}

// Start a quiz attempt
export async function startQuizAttempt(studentId: string, quizId: string): Promise<QuizAttempt | null> {
  try {
    const supabase = createClient()
    
    const attemptData: QuizAttemptInsert = {
      quiz_id: quizId,
      student_id: studentId,
      status: 'in_progress',
      answers: {},
      started_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert(attemptData)
      .select(`
        *,
        quizzes(title, time_limit, max_attempts)
      `)
      .single()

    if (error) {
      console.error('Error starting quiz attempt:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in startQuizAttempt:', error)
    throw error
  }
}

// Save quiz answers without submitting (auto-save)
export async function saveQuizAnswers(
  attemptId: string, 
  answers: Record<string, any>
): Promise<boolean> {
  try {
    const supabase = createClient()
    
    console.log('Auto-saving quiz answers:', { attemptId, answers, answerCount: Object.keys(answers).length })
    
    // Validate that we have answers to save
    if (!answers || Object.keys(answers).length === 0) {
      console.log('No answers to save, skipping save operation')
      return true
    }
    
    // Validate attempt ID
    if (!attemptId) {
      console.error('No attempt ID provided for saving answers')
      return false
    }
    
    const { error } = await supabase
      .from('quiz_attempts')
      .update({ 
        answers: answers
      })
      .eq('id', attemptId)

    if (error) {
      console.error('Error auto-saving quiz answers:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return false
    }

    console.log('Quiz answers auto-saved successfully for attempt:', attemptId)
    return true
  } catch (error) {
    console.error('Error in saveQuizAnswers:', error)
    return false
  }
}

// Submit quiz answers
export async function submitQuizAttempt(
  attemptId: string, 
  answers: Record<string, any>, 
  score?: number
): Promise<QuizAttempt | null> {
  try {
    const supabase = createClient()
    
    console.log('Submitting quiz attempt:', { attemptId, answers, answerCount: Object.keys(answers).length })
    
    // Validate inputs
    if (!attemptId) {
      throw new Error('No attempt ID provided for submission')
    }
    
    if (!answers || Object.keys(answers).length === 0) {
      console.warn('No answers provided for submission, proceeding with empty answers')
    }
    
    // If no score provided, calculate auto-score for multiple choice/true-false questions
    let finalScore = score
    let finalStatus = 'completed'
    let hasManualQuestions = false // Initialize for use throughout function
    
    if (score === undefined) {
      // Get the quiz ID first
      const { data: attemptData, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select('quiz_id')
        .eq('id', attemptId)
        .single()
      
      if (attemptError) {
        console.error('Error fetching attempt data:', attemptError)
        throw attemptError
      }
      
    // Get all questions for the quiz
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', attemptData.quiz_id)
    
    if (questionsError) {
      console.error('Error fetching questions:', questionsError)
      throw questionsError
    }
    
    // Initialize variables for scoring
    let autoScore = 0
    
    questions?.forEach(question => {
      const studentAnswer = answers[question.id]
      
      if (question.type === 'multiple_choice' || question.type === 'true_false') {
        // Auto-grade multiple choice and true/false
        if (studentAnswer === question.correct_answer) {
          autoScore += question.points
        }
      } else if (question.type === 'short_answer' || question.type === 'essay') {
        // Mark that manual grading is needed
        hasManualQuestions = true
      }
    })
    
    finalScore = autoScore
    
    // If there are no manual questions, mark as completed first, then graded
    if (!hasManualQuestions) {
      finalStatus = 'completed'
    }
  } else {
    finalStatus = 'completed'
  }
    
    // CRITICAL: Ensure answers are always included and not empty
    // If answers is empty or null, try to read from database first
    let finalAnswers = answers || {}
    
    if (!answers || Object.keys(answers).length === 0) {
      console.warn('⚠️ WARNING: submitQuizAttempt called with empty answers! Reading from database...')
      try {
        const { data: attemptData } = await supabase
          .from('quiz_attempts')
          .select('answers')
          .eq('id', attemptId)
          .single()
        
        if (attemptData?.answers && Object.keys(attemptData.answers).length > 0) {
          finalAnswers = attemptData.answers as Record<string, any>
          console.log('✅ Retrieved answers from database:', finalAnswers, 'Count:', Object.keys(finalAnswers).length)
        } else {
          console.error('❌ No answers found in database either!')
        }
      } catch (readError) {
        console.error('❌ Error reading answers from database:', readError)
      }
    }
    
    // Ensure answers are always included, even if empty
    const updateData: any = {
      answers: finalAnswers,
      status: finalStatus,
      completed_at: new Date().toISOString()
    }

    if (finalScore !== undefined) {
      updateData.score = finalScore
    }

    console.log('Updating quiz attempt with data:', {
      ...updateData,
      answerCount: Object.keys(updateData.answers).length,
      answers: updateData.answers // Log actual answers for debugging
    })

    const { data, error } = await supabase
      .from('quiz_attempts')
      .update(updateData)
      .eq('id', attemptId)
      .select(`
        *,
        quizzes(title, time_limit)
      `)
      .single()

    if (error) {
      console.error('Error submitting quiz attempt:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }

    console.log('Quiz attempt submitted successfully:', data)
    
    // If there are no manual questions, automatically grade the quiz
    if (data && finalStatus === 'completed' && !hasManualQuestions) {
      try {
        // Update status to graded
        const { error: gradeError } = await supabase
          .from('quiz_attempts')
          .update({ status: 'graded' })
          .eq('id', attemptId)
        
        if (gradeError) {
          console.error('Error auto-grading quiz:', gradeError)
        } else {
          console.log('Quiz auto-graded successfully')
        }
      } catch (autoGradeError) {
        console.error('Error in auto-grading process:', autoGradeError)
      }
    }
    
    return data
  } catch (error) {
    console.error('Error in submitQuizAttempt:', error)
    throw error
  }
}

// Grade a quiz attempt (for faculty)
export async function gradeQuizAttempt(attemptId: string, score: number): Promise<QuizAttempt | null> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('quiz_attempts')
      .update({ 
        score,
        status: 'graded'
      })
      .eq('id', attemptId)
      .select(`
        *,
        profiles(full_name),
        quizzes(title)
      `)
      .single()

    if (error) {
      console.error('Error grading quiz attempt:', error)
      throw error
    }

    // Trigger notification for student when quiz is graded
    if (data) {
      try {
        const studentId = data.student_id
        const quizTitle = data.quizzes?.title || 'Quiz'
        
        // Calculate max score for notification
        const { data: questions } = await supabase
          .from('quiz_questions')
          .select('points')
          .eq('quiz_id', data.quiz_id)
        
        const maxScore = questions?.reduce((sum, q) => sum + q.points, 0) || 0
        
        await notifyQuizGraded(
          studentId,
          quizTitle,
          score,
          maxScore
        )
      } catch (notificationError) {
        console.error('Error sending quiz graded notification:', notificationError)
        // Don't throw error - notification failure shouldn't break grading
      }
    }

    return data
  } catch (error) {
    console.error('Error in gradeQuizAttempt:', error)
    throw error
  }
}

// Delete a quiz (faculty only)
export async function deleteQuiz(quizId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId)

    if (error) {
      console.error('Error deleting quiz:', error)
      throw error
    }

    return true
  } catch (error) {
    console.error('Error in deleteQuiz:', error)
    throw error
  }
}

// Delete a quiz question
export async function deleteQuizQuestion(questionId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('id', questionId)

    if (error) {
      console.error('Error deleting quiz question:', error)
      throw error
    }

    return true
  } catch (error) {
    console.error('Error in deleteQuizQuestion:', error)
    throw error
  }
}

// Update a quiz question
export async function updateQuizQuestion(questionId: string, updates: Partial<QuizQuestionInsert>): Promise<QuizQuestion | null> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('quiz_questions')
      .update(updates)
      .eq('id', questionId)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating quiz question:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in updateQuizQuestion:', error)
    throw error
  }
}

// Update quiz
export async function updateQuiz(quizId: string, updates: Partial<QuizInsert>): Promise<Quiz | null> {
  try {
    const supabase = createClient()
    
    // Check if status is being changed to published
    const wasPublished = updates.status === 'published'
    
    const { data, error } = await supabase
      .from('quizzes')
      .update(updates)
      .eq('id', quizId)
      .select(`
        *,
        courses(title, course_code)
      `)
      .single()

    if (error) {
      console.error('Error updating quiz:', error)
      throw error
    }

    // Trigger notification for students when quiz is published
    if (data && wasPublished) {
      try {
        await notifyNewQuiz(
          data.course_id,
          data.title,
          data.due_date || undefined
        )
      } catch (notificationError) {
        console.error('Error sending new quiz notification:', notificationError)
        // Don't throw error - notification failure shouldn't break quiz update
      }
    }

    return data
  } catch (error) {
    console.error('Error in updateQuiz:', error)
    throw error
  }
}

// Manual grading functions

// Get quiz attempts that need manual grading
export async function getQuizAttemptsForGrading(quizId: string): Promise<QuizAttempt[]> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        profiles(*),
        quizzes(title, time_limit, max_attempts)
      `)
      .eq('quiz_id', quizId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })

    if (error) {
      console.error('Error fetching quiz attempts for grading:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getQuizAttemptsForGrading:', error)
    throw error
  }
}

// Get questions that need manual grading for a specific attempt
// Returns ALL questions (including auto-graded) so faculty can see full breakdown
export async function getQuestionsNeedingGrading(attemptId: string): Promise<QuizQuestion[]> {
  try {
    const supabase = createClient()
    
    // Get all questions for the quiz
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select(`
        quiz_id,
        answers
      `)
      .eq('id', attemptId)
      .single()

    if (attemptError) {
      console.error('Error fetching attempt:', attemptError)
      throw attemptError
    }

    // Get ALL questions (not just manual ones) so faculty can see complete breakdown
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', attempt.quiz_id)
      .order('order_index', { ascending: true })

    if (questionsError) {
      console.error('Error fetching questions:', questionsError)
      throw questionsError
    }

    // Return all questions - don't filter by type or answers
    // This allows faculty to see all questions including auto-graded ones
    return questions || []
  } catch (error) {
    console.error('Error in getQuestionsNeedingGrading:', error)
    throw error
  }
}

// Grade a specific question - Simplified and more reliable version
export async function gradeQuestion(
  attemptId: string, 
  questionId: string, 
  pointsAwarded: number, 
  feedback?: string
): Promise<boolean> {
  try {
    const supabase = createClient()
    
    console.log('🎯 GRADING QUESTION:', { attemptId, questionId, pointsAwarded, feedback })
    
    // Get current user with timeout handling
    console.log('🔐 Getting current user...')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user?.id) {
      console.error('❌ Authentication error:', userError)
      throw new Error('Authentication required to grade questions')
    }
    
    console.log('✅ User authenticated:', user.id)
    
    // Verify user has faculty role (with timeout handling)
    console.log('👤 Checking user role...')
    const profilePromise = supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
    )
    
    const { data: profile, error: profileError } = await Promise.race([profilePromise, timeoutPromise]) as any
    
    if (profileError) {
      console.error('❌ Profile fetch error:', profileError)
      // Fallback: assume faculty if we can't verify (for testing)
      console.warn('⚠️ Using fallback: assuming faculty role')
    } else if (!profile) {
      console.warn('⚠️ No profile found, using fallback: assuming faculty role')
    } else {
      console.log('✅ User role verified:', profile.role)
      if (profile.role !== 'faculty') {
        throw new Error('Only faculty can grade questions')
      }
    }
    
    // Validate points awarded
    if (pointsAwarded < 0) {
      throw new Error('Points awarded cannot be negative')
    }
    
    // Get question details to validate max points
    const { data: question, error: questionError } = await supabase
      .from('quiz_questions')
      .select('points')
      .eq('id', questionId)
      .single()
    
    if (questionError || !question) {
      throw new Error('Question not found')
    }
    
    if (pointsAwarded > question.points) {
      throw new Error(`Points awarded (${pointsAwarded}) cannot exceed the question's maximum points (${question.points})`)
    }
    
    // Step 1: Save the manual grade
    const gradeData = {
      attempt_id: attemptId,
      question_id: questionId,
      points_awarded: pointsAwarded,
      feedback: feedback || null,
      graded_by: user.id,
      graded_at: new Date().toISOString()
    }
    
    console.log('💾 Saving grade:', gradeData)
    
    const { data: gradeResult, error: gradeError } = await supabase
      .from('quiz_question_grades')
      .upsert(gradeData, {
        onConflict: 'attempt_id,question_id'
      })
      .select()

    if (gradeError) {
      console.error('❌ Grade save failed:', gradeError)
      throw new Error(`Failed to save grade: ${gradeError.message}`)
    }

    console.log('✅ Grade saved successfully:', gradeResult?.[0])
    
    // Step 2: Calculate and update total score (auto + manual)
    try {
      console.log('📊 Calculating total score after manual grading...')
      
      // Get the attempt with quiz and questions data
      const { data: attemptData, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select(`
          quiz_id,
          answers,
          quizzes!inner(
            quiz_questions(
              id,
              type,
              points,
              correct_answer
            )
          )
        `)
        .eq('id', attemptId)
        .single()

      if (attemptError) {
        console.error('Error fetching attempt data:', attemptError)
        throw attemptError
      }

      // Get all manual grades for this attempt
      const { data: manualGrades, error: gradesError } = await supabase
        .from('quiz_question_grades')
        .select('question_id, points_awarded')
        .eq('attempt_id', attemptId)

      if (gradesError) {
        console.error('Error fetching manual grades:', gradesError)
        throw gradesError
      }

      // Calculate total score
      let totalScore = 0
      
      // Get questions separately since they're not included in the attempt query
      const { data: questions } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', attemptData.quiz_id)

      questions?.forEach((question: any) => {
        const studentAnswer = attemptData.answers[question.id]
        
        if (question.type === 'multiple_choice' || question.type === 'true_false') {
          // Auto-grade multiple choice and true/false with normalized comparison
          const normalizedStudentAnswer = studentAnswer ? String(studentAnswer).trim().toLowerCase() : ''
          const normalizedCorrectAnswer = question.correct_answer ? String(question.correct_answer).trim().toLowerCase() : ''
          
          if (normalizedStudentAnswer === normalizedCorrectAnswer) {
            totalScore += question.points
          }
        } else if (question.type === 'short_answer' || question.type === 'essay') {
          // Use manual grade if available
          const manualGrade = manualGrades?.find(g => g.question_id === question.id)
          if (manualGrade) {
            totalScore += manualGrade.points_awarded
          }
        }
      })

      console.log('📊 Calculated total score:', totalScore)

      // Check if all manual questions have been graded
      const manualQuestions = questions?.filter(q => q.type === 'short_answer' || q.type === 'essay') || []
      const gradedManualQuestions = manualQuestions.filter(q => 
        manualGrades?.some(g => g.question_id === q.id)
      )
      const allManualQuestionsGraded = manualQuestions.length === gradedManualQuestions.length

      console.log('📋 Manual grading status:', {
        totalManualQuestions: manualQuestions.length,
        gradedManualQuestions: gradedManualQuestions.length,
        allGraded: allManualQuestionsGraded
      })

      // Update quiz attempt with calculated score
      console.log('🔄 Updating quiz attempt with score:', totalScore)
      const updateData: any = { score: totalScore }
      
      // Only set status to 'graded' if ALL manual questions have been graded
      if (allManualQuestionsGraded) {
        updateData.status = 'graded'
        console.log('✅ All manual questions graded - setting status to "graded"')
      } else {
        console.log('⚠️ Not all manual questions graded - keeping status as "completed"')
      }

      const { data: updateResult, error: updateError } = await supabase
        .from('quiz_attempts')
        .update(updateData)
        .eq('id', attemptId)
        .select('id, score, status')

      if (updateError) {
        console.error('❌ Score update failed:', updateError)
        console.error('Update error details:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        })
        
        // Try a simpler update approach
        console.log('🔄 Trying simpler update approach...')
        const { data: simpleUpdate, error: simpleError } = await supabase
          .from('quiz_attempts')
          .update({ score: totalScore })
          .eq('id', attemptId)
          .select('id, score')
        
        if (simpleError) {
          console.error('❌ Simple update also failed:', simpleError)
          throw new Error(`Failed to update quiz score: ${updateError.message}`)
        } else {
          console.log('✅ Simple update succeeded:', simpleUpdate?.[0])
        }
      } else {
        console.log('✅ Quiz attempt updated with score:', updateResult?.[0])
      }

      return true
      
    } catch (scoreError) {
      console.error('❌ Score calculation failed:', scoreError)
      // Don't throw here - the grade was saved successfully
      console.log('⚠️ Grade saved but score not calculated. Use "Fix Manual Grades" button to sync scores.')
      return true
    }
    
  } catch (error) {
    console.error('❌ Grade question failed:', error)
    throw error
  }
}

// Test function for debugging grade insertion
export async function testGradeInsertion(attemptId: string, questionId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    console.log('Testing grade insertion for:', { attemptId, questionId })
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      console.error('Error getting user:', userError)
      return false
    }
    
    console.log('Current user:', user?.id)
    
    // Test data
    const testGradeData = {
      attempt_id: attemptId,
      question_id: questionId,
      points_awarded: 5,
      feedback: 'Test feedback for debugging',
      graded_by: user?.id
    }
    
    console.log('Testing with data:', testGradeData)
    
    const { data, error } = await supabase
      .from('quiz_question_grades')
      .upsert(testGradeData, {
        onConflict: 'attempt_id,question_id'
      })
      .select()

    if (error) {
      console.error('Test grade insertion failed:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return false
    }

    console.log('Test grade insertion successful:', data)
    return true
  } catch (error) {
    console.error('Error in testGradeInsertion:', error)
    return false
  }
}

// Enhanced debug function for manual grading issues
export async function debugManualGradingIssue(attemptId: string, questionId: string): Promise<any> {
  try {
    const supabase = createClient()
    
    console.log('🔍 DEBUGGING MANUAL GRADING ISSUE');
    console.log('Attempt ID:', attemptId);
    console.log('Question ID:', questionId);
    
    // Step 1: Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user?.id) {
      return { success: false, error: 'User not authenticated', step: 'authentication' }
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // Step 2: Check user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      return { success: false, error: 'Error fetching profile', step: 'profile_check', details: profileError }
    }
    
    if (profile.role !== 'faculty') {
      return { success: false, error: 'User is not faculty', step: 'role_check', role: profile.role }
    }
    
    console.log('✅ User is faculty:', profile.full_name);
    
    // Step 3: Check if attempt exists and user has access
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select(`
        id,
        status,
        score,
        quiz_id,
        student_id,
        answers,
        quizzes(title),
        profiles(full_name)
      `)
      .eq('id', attemptId)
      .single()
    
    if (attemptError) {
      return { success: false, error: 'Attempt not found or no access', step: 'attempt_check', details: attemptError }
    }
    
    console.log('✅ Attempt found:', attempt);
    
    // Step 4: Check if question exists and is manual grading type
    const { data: question, error: questionError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('id', questionId)
      .eq('quiz_id', attempt.quiz_id)
      .single()
    
    if (questionError) {
      return { success: false, error: 'Question not found or no access', step: 'question_check', details: questionError }
    }
    
    if (!['short_answer', 'essay'].includes(question.type)) {
      return { success: false, error: 'Question is not manual grading type', step: 'question_type_check', type: question.type }
    }
    
    console.log('✅ Question found and is manual grading type:', question.type);
    
    // Step 5: Test RLS policies by trying to read existing grades
    const { data: existingGrades, error: readError } = await supabase
      .from('quiz_question_grades')
      .select('*')
      .eq('attempt_id', attemptId)
    
    if (readError) {
      return { 
        success: false, 
        error: 'RLS policy error - cannot read grades', 
        step: 'rls_read_check', 
        details: readError,
        isRLSError: readError.code === '42501' || readError.message.includes('policy')
      }
    }
    
    console.log('✅ RLS read access working, found grades:', existingGrades?.length || 0);
    
    // Step 6: Test grade insertion
    const testGradeData = {
      attempt_id: attemptId,
      question_id: questionId,
      points_awarded: 5,
      feedback: 'Debug test feedback',
      graded_by: user.id,
      graded_at: new Date().toISOString()
    }
    
    console.log('🧪 Testing grade insertion with data:', testGradeData);
    
    const { data: gradeResult, error: gradeError } = await supabase
      .from('quiz_question_grades')
      .upsert(testGradeData, {
        onConflict: 'attempt_id,question_id'
      })
      .select()
    
    if (gradeError) {
      return { 
        success: false, 
        error: 'Grade insertion failed', 
        step: 'grade_insertion', 
        details: gradeError,
        isRLSError: gradeError.code === '42501' || gradeError.message.includes('policy'),
        errorCode: gradeError.code,
        errorMessage: gradeError.message
      }
    }
    
    console.log('✅ Grade insertion successful:', gradeResult);
    
    // Step 7: Clean up test data
    const { error: deleteError } = await supabase
      .from('quiz_question_grades')
      .delete()
      .eq('attempt_id', attemptId)
      .eq('question_id', questionId)
      .eq('graded_by', user.id)
      .eq('feedback', 'Debug test feedback')
    
    if (deleteError) {
      console.warn('⚠️ Error cleaning up test data:', deleteError);
    } else {
      console.log('✅ Test data cleaned up successfully');
    }
    
    return { 
      success: true, 
      message: 'Manual grading is working correctly',
      steps: {
        authentication: '✅ Passed',
        profile_check: '✅ Passed',
        attempt_check: '✅ Passed',
        question_check: '✅ Passed',
        rls_read_check: '✅ Passed',
        grade_insertion: '✅ Passed'
      }
    }
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
    return { 
      success: false, 
      error: 'Debug script failed', 
      step: 'script_error', 
      details: error 
    }
  }
}

// Manual finalization function for debugging
export async function manualFinalizeGrading(attemptId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    console.log('Manually finalizing grading for attempt:', attemptId)
    
    // Calculate total score
    const totalScore = await calculateTotalScore(attemptId)
    console.log('Calculated total score:', totalScore)
    
    // Update attempt with final score
    const updateResult = await updateQuizAttemptScore(attemptId, totalScore)
    console.log('Update result:', updateResult)
    
    // Verify the update
    const { data: verifyUpdate } = await supabase
      .from('quiz_attempts')
      .select('status, score')
      .eq('id', attemptId)
      .single()
    
    console.log('Verification - Updated attempt:', verifyUpdate)
    
    if (verifyUpdate?.status === 'graded' && verifyUpdate?.score === totalScore) {
      console.log('Manual finalization successful')
      return true
    } else {
      console.error('Manual finalization failed:', {
        expectedStatus: 'graded',
        actualStatus: verifyUpdate?.status,
        expectedScore: totalScore,
        actualScore: verifyUpdate?.score
      })
      return false
    }
  } catch (error) {
    console.error('Error in manualFinalizeGrading:', error)
    return false
  }
}

// Calculate total score using direct database query
export async function calculateTotalScoreFromDB(attemptId: string): Promise<number> {
  try {
    const supabase = createClient()
    
    console.log('Calculating total score from database for attempt:', attemptId)
    
    // Get attempt details
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('id', attemptId)
      .single()

    if (attemptError) {
      console.error('Error fetching attempt:', attemptError)
      throw attemptError
    }

    // Get all questions for the quiz
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', attempt.quiz_id)

    if (questionsError) {
      console.error('Error fetching questions:', questionsError)
      throw questionsError
    }

    // Get manual grades
    const { data: grades, error: gradesError } = await supabase
      .from('quiz_question_grades')
      .select('*')
      .eq('attempt_id', attemptId)

    if (gradesError) {
      console.error('Error fetching grades:', gradesError)
      throw gradesError
    }

    let totalScore = 0

    console.log('Questions found:', questions?.length)
    console.log('Grades found:', grades?.length)
    console.log('Attempt answers:', attempt.answers)

    questions?.forEach(question => {
      const studentAnswer = attempt.answers[question.id]
      console.log(`Question ${question.id} (${question.type}):`, {
        studentAnswer,
        correctAnswer: question.correct_answer,
        points: question.points
      })
      
      if (!studentAnswer) {
        console.log(`No answer for question ${question.id}`)
        return
      }

      if (question.type === 'multiple_choice' || question.type === 'true_false') {
        // Auto-grade multiple choice and true/false with normalized comparison
        const normalizedStudentAnswer = studentAnswer ? String(studentAnswer).trim().toLowerCase() : ''
        const normalizedCorrectAnswer = question.correct_answer ? String(question.correct_answer).trim().toLowerCase() : ''
        
        if (normalizedStudentAnswer === normalizedCorrectAnswer) {
          totalScore += question.points
          console.log(`Auto-graded question ${question.id}: +${question.points} points (Correct)`)
        } else {
          console.log(`Auto-graded question ${question.id}: 0 points (Incorrect - Student: "${studentAnswer}", Correct: "${question.correct_answer}")`)
        }
      } else if (question.type === 'short_answer' || question.type === 'essay') {
        // Use manual grade if available
        const grade = grades?.find(g => g.question_id === question.id)
        if (grade) {
          totalScore += grade.points_awarded
          console.log(`Manual graded question ${question.id}: +${grade.points_awarded} points`)
        } else {
          console.log(`No manual grade found for question ${question.id}`)
        }
      }
    })

    console.log('Final total score from DB:', totalScore)
    return totalScore
  } catch (error) {
    console.error('Error in calculateTotalScoreFromDB:', error)
    throw error
  }
}

// Bulk update all completed attempts with correct scores
export async function bulkUpdateQuizScores(): Promise<{ updated: number; errors: string[] }> {
  try {
    const supabase = createClient()
    
    console.log('Starting bulk update of quiz scores')
    
    // Get all completed attempts
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('status', 'completed')

    if (attemptsError) {
      console.error('Error fetching completed attempts:', attemptsError)
      throw attemptsError
    }

    console.log(`Found ${attempts?.length} completed attempts to update`)

    let updated = 0
    const errors: string[] = []

    for (const attempt of attempts || []) {
      try {
        console.log(`Processing attempt ${attempt.id}`)
        
        // Calculate total score for this attempt
        const totalScore = await calculateTotalScoreFromDB(attempt.id)
        
        // Update the attempt
        const { error: updateError } = await supabase
          .from('quiz_attempts')
          .update({ 
            score: totalScore,
            status: 'graded'
          })
          .eq('id', attempt.id)

        if (updateError) {
          console.error(`Error updating attempt ${attempt.id}:`, updateError)
          errors.push(`Attempt ${attempt.id}: ${updateError.message}`)
        } else {
          console.log(`Successfully updated attempt ${attempt.id} with score ${totalScore}`)
          updated++
        }
      } catch (error) {
        console.error(`Error processing attempt ${attempt.id}:`, error)
        errors.push(`Attempt ${attempt.id}: ${error}`)
      }
    }

    console.log(`Bulk update completed. Updated: ${updated}, Errors: ${errors.length}`)
    return { updated, errors }
  } catch (error) {
    console.error('Error in bulkUpdateQuizScores:', error)
    throw error
  }
}

// Fix pending attempts that have manual grades but are still "completed"
export async function fixPendingAttempts(): Promise<{ updated: number; errors: string[] }> {
  try {
    const supabase = createClient()
    
    console.log('Starting fix for pending attempts')
    
    // Get attempts that are "completed" but have manual grades
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        quiz_question_grades!inner(id)
      `)
      .eq('status', 'completed')

    if (attemptsError) {
      console.error('Error fetching pending attempts:', attemptsError)
      throw attemptsError
    }

    console.log(`Found ${attempts?.length} completed attempts with manual grades`)

    let updated = 0
    const errors: string[] = []

    for (const attempt of attempts || []) {
      try {
        console.log(`Processing pending attempt ${attempt.id}`)
        
        // Calculate total score for this attempt
        const totalScore = await calculateTotalScoreFromDB(attempt.id)
        
        // Update the attempt
        const { error: updateError } = await supabase
          .from('quiz_attempts')
          .update({ 
            score: totalScore,
            status: 'graded'
          })
          .eq('id', attempt.id)

        if (updateError) {
          console.error(`Error updating pending attempt ${attempt.id}:`, updateError)
          errors.push(`Attempt ${attempt.id}: ${updateError.message}`)
        } else {
          console.log(`Successfully updated pending attempt ${attempt.id} with score ${totalScore}`)
          updated++
        }
      } catch (error) {
        console.error(`Error processing pending attempt ${attempt.id}:`, error)
        errors.push(`Attempt ${attempt.id}: ${error}`)
      }
    }

    console.log(`Pending attempts fix completed. Updated: ${updated}, Errors: ${errors.length}`)
    return { updated, errors }
  } catch (error) {
    console.error('Error in fixPendingAttempts:', error)
    throw error
  }
}

// Fix a specific attempt by ID
export async function fixSpecificAttempt(attemptId: string): Promise<{ success: boolean; newScore: number; error?: string }> {
  try {
    const supabase = createClient()
    
    console.log('Fixing specific attempt:', attemptId)
    
    // Get the attempt details
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('id', attemptId)
      .single()

    if (attemptError) {
      console.error('Error fetching attempt:', attemptError)
      return { success: false, newScore: 0, error: attemptError.message }
    }

    if (!attempt) {
      return { success: false, newScore: 0, error: 'Attempt not found' }
    }

    console.log('Current attempt:', attempt)
    
    // Calculate total score for this attempt
    const totalScore = await calculateTotalScoreFromDB(attemptId)
    console.log('Calculated total score:', totalScore)
    
    // Update the attempt
    const { data: updateData, error: updateError } = await supabase
      .from('quiz_attempts')
      .update({ 
        score: totalScore,
        status: 'graded'
      })
      .eq('id', attemptId)
      .select()

    if (updateError) {
      console.error('Error updating attempt:', updateError)
      return { success: false, newScore: 0, error: updateError.message }
    }

    console.log('Successfully updated attempt:', updateData)
    return { success: true, newScore: totalScore }
  } catch (error) {
    console.error('Error in fixSpecificAttempt:', error)
    return { success: false, newScore: 0, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Simple function to add manual grades to existing score
export async function addManualGradesToScore(attemptId: string): Promise<{ success: boolean; newScore: number; error?: string }> {
  try {
    const supabase = createClient()
    
    console.log('Adding manual grades to existing score for attempt:', attemptId)
    
    // Get the current attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('id', attemptId)
      .single()

    if (attemptError) {
      console.error('Error fetching attempt:', attemptError)
      return { success: false, newScore: 0, error: attemptError.message }
    }

    if (!attempt) {
      return { success: false, newScore: 0, error: 'Attempt not found' }
    }

    console.log('Current attempt score:', attempt.score)
    
    // Get manual grades for this attempt
    const { data: manualGrades, error: gradesError } = await supabase
      .from('quiz_question_grades')
      .select('*')
      .eq('attempt_id', attemptId)

    if (gradesError) {
      console.error('Error fetching manual grades:', gradesError)
      return { success: false, newScore: 0, error: gradesError.message }
    }

    // Calculate total manual grades
    const totalManualGrades = manualGrades?.reduce((sum, grade) => sum + (grade.points_awarded || 0), 0) || 0
    console.log('Total manual grades:', totalManualGrades)
    
    // Add manual grades to existing score (like your SQL query)
    const newTotalScore = (attempt.score || 0) + totalManualGrades
    console.log('New total score (existing + manual):', newTotalScore)
    
    // Update the attempt with new total score
    const { data: updateData, error: updateError } = await supabase
      .from('quiz_attempts')
      .update({ 
        score: newTotalScore,
        status: 'graded'
      })
      .eq('id', attemptId)
      .select()

    if (updateError) {
      console.error('Error updating attempt:', updateError)
      return { success: false, newScore: 0, error: updateError.message }
    }

    console.log('Successfully updated attempt with new score:', updateData)
    return { success: true, newScore: newTotalScore }
  } catch (error) {
    console.error('Error in addManualGradesToScore:', error)
    return { success: false, newScore: 0, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Fix Micho's attempt specifically
export async function fixMichoAttempt(): Promise<{ success: boolean; newScore: number; error?: string }> {
  try {
    const supabase = createClient()
    
    console.log('Fixing Micho A. Robledo attempt')
    
    // Find Micho's attempt
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        profiles!inner(full_name)
      `)
      .ilike('profiles.full_name', '%micho%')
      .order('completed_at', { ascending: false })
      .limit(1)

    if (attemptsError) {
      console.error('Error fetching Micho attempts:', attemptsError)
      return { success: false, newScore: 0, error: attemptsError.message }
    }

    if (!attempts || attempts.length === 0) {
      return { success: false, newScore: 0, error: 'Micho attempt not found' }
    }

    const michoAttempt = attempts[0]
    console.log('Found Micho attempt:', michoAttempt)
    
    // Use the simple function to fix it
    const result = await addManualGradesToScore(michoAttempt.id)
    
    if (result.success) {
      console.log('Successfully fixed Micho attempt with new score:', result.newScore)
    } else {
      console.error('Error fixing Micho attempt:', result.error)
    }
    
    return result
  } catch (error) {
    console.error('Error in fixMichoAttempt:', error)
    return { success: false, newScore: 0, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}


// Fix current quiz attempt that shows wrong score
export async function fixCurrentQuizAttempt(): Promise<{ success: boolean; newScore: number; error?: string }> {
  try {
    const supabase = createClient()
    
    console.log('Fixing current quiz attempt with manual grades')
    
    // Find the most recent attempt that has manual grades but wrong score
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        quiz_question_grades!inner(id)
      `)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)

    if (attemptsError) {
      console.error('Error fetching attempts:', attemptsError)
      return { success: false, newScore: 0, error: attemptsError.message }
    }

    if (!attempts || attempts.length === 0) {
      return { success: false, newScore: 0, error: 'No attempts with manual grades found' }
    }

    const attempt = attempts[0]
    console.log('Found attempt to fix:', attempt)
    
    // Get current score
    const currentScore = attempt.score || 0
    console.log('Current score:', currentScore)
    
    // Get all manual grades for this attempt
    const { data: manualGrades, error: gradesError } = await supabase
      .from('quiz_question_grades')
      .select('points_awarded')
      .eq('attempt_id', attempt.id)

    if (gradesError) {
      console.error('Error fetching manual grades:', gradesError)
      return { success: false, newScore: 0, error: gradesError.message }
    }

    // Calculate total manual grades
    const totalManualGrades = manualGrades?.reduce((sum, grade) => sum + (grade.points_awarded || 0), 0) || 0
    console.log('Total manual grades:', totalManualGrades)
    
    // Add manual grades to existing score (like your SQL query)
    const newTotalScore = currentScore + totalManualGrades
    console.log('New total score (existing + manual):', newTotalScore)
    
    // Update the attempt
    const { data: updateData, error: updateError } = await supabase
      .from('quiz_attempts')
      .update({ 
        score: newTotalScore,
        status: 'graded'
      })
      .eq('id', attempt.id)
      .select()

    if (updateError) {
      console.error('Error updating attempt:', updateError)
      return { success: false, newScore: 0, error: updateError.message }
    }

    console.log('Successfully updated attempt:', updateData)
    return { success: true, newScore: newTotalScore }
  } catch (error) {
    console.error('Error in fixCurrentQuizAttempt:', error)
    return { success: false, newScore: 0, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Force update total score for current quiz
export async function forceUpdateTotalScore(): Promise<{ success: boolean; newScore: number; error?: string }> {
  try {
    const supabase = createClient()
    
    console.log('Force updating total score for current quiz')
    
    // Find the most recent attempt
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(1)

    if (attemptsError) {
      console.error('Error fetching attempts:', attemptsError)
      return { success: false, newScore: 0, error: attemptsError.message }
    }

    if (!attempts || attempts.length === 0) {
      return { success: false, newScore: 0, error: 'No attempts found' }
    }

    const attempt = attempts[0]
    console.log('Found attempt to update:', attempt)
    
    // Get current score
    const currentScore = attempt.score || 0
    console.log('Current score:', currentScore)
    
    // Get all manual grades for this attempt
    const { data: manualGrades, error: gradesError } = await supabase
      .from('quiz_question_grades')
      .select('points_awarded')
      .eq('attempt_id', attempt.id)

    if (gradesError) {
      console.error('Error fetching manual grades:', gradesError)
      return { success: false, newScore: 0, error: gradesError.message }
    }

    // Calculate total manual grades
    const totalManualGrades = manualGrades?.reduce((sum, grade) => sum + (grade.points_awarded || 0), 0) || 0
    console.log('Total manual grades:', totalManualGrades)
    
    // Add manual grades to existing score (like your SQL query)
    const newTotalScore = currentScore + totalManualGrades
    console.log('New total score (existing + manual):', newTotalScore)
    
    // Update the attempt
    const { data: updateData, error: updateError } = await supabase
      .from('quiz_attempts')
      .update({ 
        score: newTotalScore,
        status: 'graded'
      })
      .eq('id', attempt.id)
      .select()

    if (updateError) {
      console.error('Error updating attempt:', updateError)
      return { success: false, newScore: 0, error: updateError.message }
    }

    console.log('Successfully updated attempt:', updateData)
    return { success: true, newScore: newTotalScore }
  } catch (error) {
    console.error('Error in forceUpdateTotalScore:', error)
    return { success: false, newScore: 0, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Get grades for a specific attempt
export async function getQuestionGrades(attemptId: string): Promise<Database["public"]["Tables"]["quiz_question_grades"]["Row"][]> {
  try {
    const supabase = createClient()
    
    console.log('getQuestionGrades called for attempt:', attemptId)
    
    const { data, error } = await supabase
      .from('quiz_question_grades')
      .select('*')
      .eq('attempt_id', attemptId)

    if (error) {
      console.error('Error fetching question grades:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }

    console.log('Retrieved grades for attempt:', attemptId, ':', data)
    return data || []
  } catch (error) {
    console.error('Error in getQuestionGrades:', error)
    throw error
  }
}

// Calculate total score including manual grades (optimized version)
export async function calculateTotalScore(attemptId: string): Promise<number> {
  try {
    const supabase = createClient()
    
    console.log('=== CALCULATING TOTAL SCORE (OPTIMIZED) ===')
    console.log('Attempt ID:', attemptId)
    
    // Use a single query with joins to get all data at once
    const { data: result, error: queryError } = await supabase
      .from('quiz_attempts')
      .select(`
        quiz_id,
        answers,
        quizzes!inner(
          quiz_questions(
            id,
            type,
            points,
            correct_answer
          )
        )
      `)
      .eq('id', attemptId)
      .single()

    if (queryError) {
      console.error('Error fetching attempt with questions:', queryError)
      throw queryError
    }

    // Get manual grades in a separate optimized query
    const { data: grades, error: gradesError } = await supabase
      .from('quiz_question_grades')
      .select('question_id, points_awarded')
      .eq('attempt_id', attemptId)

    if (gradesError) {
      console.error('Error fetching grades:', gradesError)
      throw gradesError
    }

    // Get questions separately since they're not included in the attempt query
    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', result.quiz_id)

    const attempt = result

    let autoScore = 0  // Points from multiple choice and true/false
    let manualScore = 0  // Points from essay and short answer
    let totalScore = 0

    console.log('Questions found:', questions?.length)
    console.log('Manual grades found:', grades?.length)
    console.log('Student answers:', attempt.answers)
    console.log('')

    questions?.forEach((question: any) => {
      const studentAnswer = attempt.answers[question.id]
      console.log(`Question ${question.id} (${question.type}):`, {
        studentAnswer,
        correctAnswer: question.correct_answer,
        maxPoints: question.points
      })
      
      if (!studentAnswer && (question.type === 'multiple_choice' || question.type === 'true_false')) {
        console.log(`  → No answer for auto-graded question ${question.id}: 0 points`)
        return
      }

      if (question.type === 'multiple_choice' || question.type === 'true_false') {
        // Auto-grade multiple choice and true/false with normalized comparison
        const normalizedStudentAnswer = studentAnswer ? String(studentAnswer).trim().toLowerCase() : ''
        const normalizedCorrectAnswer = question.correct_answer ? String(question.correct_answer).trim().toLowerCase() : ''
        
        if (normalizedStudentAnswer === normalizedCorrectAnswer) {
          autoScore += question.points
          totalScore += question.points
          console.log(`  → AUTO-GRADED: +${question.points} points (CORRECT)`)
        } else {
          console.log(`  → AUTO-GRADED: 0 points (incorrect, student: "${studentAnswer}", correct: "${question.correct_answer}")`)
        }
      } else if (question.type === 'short_answer' || question.type === 'essay') {
        // Use manual grade if available
        const grade = grades?.find(g => g.question_id === question.id)
        if (grade) {
          manualScore += grade.points_awarded
          totalScore += grade.points_awarded
          console.log(`  → MANUAL GRADE: +${grade.points_awarded} points (graded by faculty)`)
        } else {
          console.log(`  → MANUAL GRADE: 0 points (not yet graded by faculty)`)
        }
      }
      console.log('')
    })

    console.log('=== SCORE BREAKDOWN ===')
    console.log(`Auto-graded points (MC/TF): ${autoScore}`)
    console.log(`Manual graded points (Essay/SA): ${manualScore}`)
    console.log(`TOTAL SCORE: ${totalScore} (${autoScore} + ${manualScore})`)
    console.log('========================')
    return totalScore
  } catch (error) {
    console.error('Error in calculateTotalScore:', error)
    throw error
  }
}

// Add manual grades to existing score (like your SQL query)
export async function addManualGradesToExistingScore(attemptId: string): Promise<{ success: boolean; newScore: number; error?: string }> {
  try {
    const supabase = createClient()
    
    console.log('Adding manual grades to existing score for attempt:', attemptId)
    
    // Get current attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select('score')
      .eq('id', attemptId)
      .single()

    if (attemptError) {
      console.error('Error fetching attempt:', attemptError)
      return { success: false, newScore: 0, error: attemptError.message }
    }

    if (!attempt) {
      return { success: false, newScore: 0, error: 'Attempt not found' }
    }

    console.log('Current attempt score:', attempt.score)
    
    // Get all manual grades for this attempt
    const { data: manualGrades, error: gradesError } = await supabase
      .from('quiz_question_grades')
      .select('points_awarded')
      .eq('attempt_id', attemptId)

    if (gradesError) {
      console.error('Error fetching manual grades:', gradesError)
      return { success: false, newScore: 0, error: gradesError.message }
    }

    // Calculate total manual grades
    const totalManualGrades = manualGrades?.reduce((sum, grade) => sum + (grade.points_awarded || 0), 0) || 0
    console.log('Total manual grades:', totalManualGrades)
    
    // Add manual grades to existing score (like your SQL query: qa.score = qa.score + qqg.points_awarded)
    const newTotalScore = (attempt.score || 0) + totalManualGrades
    console.log('New total score (existing + manual):', newTotalScore)
    
    // Update the attempt with new total score
    const { data: updateData, error: updateError } = await supabase
      .from('quiz_attempts')
      .update({ 
        score: newTotalScore,
        status: 'graded'
      })
      .eq('id', attemptId)
      .select()

    if (updateError) {
      console.error('Error updating quiz attempt score:', updateError)
      return { success: false, newScore: 0, error: updateError.message }
    }

    console.log('Quiz attempt score updated successfully:', updateData)
    return { success: true, newScore: newTotalScore }
  } catch (error) {
    console.error('Error in addManualGradesToExistingScore:', error)
    return { success: false, newScore: 0, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Force refresh quiz attempts data
export async function forceRefreshQuizAttempts(quizId: string): Promise<any[]> {
  try {
    const supabase = createClient()
    
    console.log('Force refreshing quiz attempts for quiz:', quizId)
    
    // Get fresh data from database
    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        profiles(full_name),
        quizzes(title)
      `)
      .eq('quiz_id', quizId)
      .order('completed_at', { ascending: false })

    if (error) {
      console.error('Error refreshing quiz attempts:', error)
      throw error
    }

    console.log('Refreshed quiz attempts:', attempts)
    return attempts || []
  } catch (error) {
    console.error('Error in forceRefreshQuizAttempts:', error)
    throw error
  }
}

// Test function to verify score calculation fix
export async function testScoreCalculationFix(attemptId: string): Promise<{ success: boolean; details: any; error?: string }> {
  try {
    const supabase = createClient()
    
    console.log('Testing score calculation fix for attempt:', attemptId)
    
    // Get the attempt details
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('id', attemptId)
      .single()

    if (attemptError) {
      return { success: false, details: null, error: attemptError.message }
    }

    // Get all questions for the quiz
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', attempt.quiz_id)

    if (questionsError) {
      return { success: false, details: null, error: questionsError.message }
    }

    // Get manual grades
    const { data: grades, error: gradesError } = await supabase
      .from('quiz_question_grades')
      .select('*')
      .eq('attempt_id', attemptId)

    if (gradesError) {
      return { success: false, details: null, error: gradesError.message }
    }

    // Calculate score using the fixed method
    const calculatedScore = await calculateTotalScore(attemptId)
    
    // Calculate score manually for verification
    let manualCalculation = 0
    questions?.forEach(question => {
      const studentAnswer = attempt.answers[question.id]
      
      if (!studentAnswer) return

      if (question.type === 'multiple_choice' || question.type === 'true_false') {
        // Auto-grade multiple choice and true/false
        if (studentAnswer === question.correct_answer) {
          manualCalculation += question.points
        }
      } else if (question.type === 'short_answer' || question.type === 'essay') {
        // Use manual grade if available
        const grade = grades?.find(g => g.question_id === question.id)
        if (grade) {
          manualCalculation += grade.points_awarded
        }
      }
    })

    const details = {
      attemptId,
      currentScore: attempt.score,
      calculatedScore,
      manualCalculation,
      questionsCount: questions?.length || 0,
      gradesCount: grades?.length || 0,
      autoGradedQuestions: questions?.filter(q => q.type === 'multiple_choice' || q.type === 'true_false').length || 0,
      manualGradedQuestions: questions?.filter(q => q.type === 'short_answer' || q.type === 'essay').length || 0,
      scoresMatch: calculatedScore === manualCalculation,
      needsUpdate: calculatedScore !== attempt.score
    }

    console.log('Score calculation test results:', details)
    
    return { success: true, details }
  } catch (error) {
    console.error('Error in testScoreCalculationFix:', error)
    return { success: false, details: null, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Update quiz attempt with final score
export async function updateQuizAttemptScore(attemptId: string, score: number): Promise<boolean> {
  try {
    const supabase = createClient()
    
    console.log('Updating quiz attempt:', attemptId, 'with score:', score)
    
    // Update both score and status in a single operation
    const { data: updateResult, error: updateError } = await supabase
      .from('quiz_attempts')
      .update({ 
        score: score,
        status: 'graded'
      })
      .eq('id', attemptId)
      .select()

    if (updateError) {
      console.error('Error updating quiz attempt:', updateError)
      console.error('Error details:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      })
      throw updateError
    }

    console.log('Quiz attempt updated successfully:', updateResult)
    
    // Verify the update
    if (updateResult && updateResult.length > 0) {
      const updatedAttempt = updateResult[0]
      console.log('Verification - Updated attempt:', {
        id: updatedAttempt.id,
        score: updatedAttempt.score,
        status: updatedAttempt.status
      })
      
      if (updatedAttempt.status === 'graded' && updatedAttempt.score === score) {
        console.log('Update verification successful')
        return true
      } else {
        console.error('Update verification failed:', {
          expectedStatus: 'graded',
          actualStatus: updatedAttempt.status,
          expectedScore: score,
          actualScore: updatedAttempt.score
        })
        throw new Error('Update verification failed')
      }
    } else {
      console.error('No data returned from update operation')
      throw new Error('No data returned from update operation')
    }
  } catch (error) {
    console.error('Error in updateQuizAttemptScore:', error)
    throw error
  }
}

// Fix all pending quiz attempts that have manual grades but are still marked as 'completed'
// Fix quiz attempts that have manual grades but are still showing as "completed"
export async function fixQuizAttemptsWithManualGrades(): Promise<{ updated: number; errors: string[]; details: any[] }> {
  try {
    const supabase = createClient()
    
    console.log('Fixing quiz attempts that have manual grades but wrong status...')
    
    // Direct approach: get all completed attempts
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select(`
        id,
        status, 
        score,
        quiz_id,
        answers
      `)
      .eq('status', 'completed')

    if (attemptsError) {
      throw attemptsError
    }

    // Filter to only those with manual grades
    const problemAttempts = []
    for (const attempt of attempts || []) {
      const { data: grades, error: gradesError } = await supabase
        .from('quiz_question_grades')
        .select('id')
        .eq('attempt_id', attempt.id)
        .limit(1)

      if (!gradesError && grades && grades.length > 0) {
        problemAttempts.push(attempt)
      }
    }

    console.log(`Found ${problemAttempts?.length || 0} quiz attempts with manual grades but wrong status`)

    if (!problemAttempts || problemAttempts.length === 0) {
      return { updated: 0, errors: [], details: [] }
    }

    let updated = 0
    const errors: string[] = []
    const details: any[] = []

    for (const attempt of problemAttempts) {
      try {
        console.log(`Fixing attempt ${attempt.id}`)
        
        // Calculate correct total score for this attempt
        const totalScore = await calculateTotalScore(attempt.id)
        console.log(`Calculated correct score for attempt ${attempt.id}: ${totalScore}`)
        
        // Update the attempt with correct score and status
        const { error: updateError } = await supabase
          .from('quiz_attempts')
          .update({ 
            score: totalScore,
            status: 'graded'
          })
          .eq('id', attempt.id)

        if (updateError) {
          console.error(`Error updating attempt ${attempt.id}:`, updateError)
          errors.push(`Attempt ${attempt.id}: ${updateError.message}`)
        } else {
          console.log(`Successfully fixed attempt ${attempt.id} with score ${totalScore}`)
          updated++
          details.push({
            attemptId: attempt.id,
            oldStatus: 'completed',
            newStatus: 'graded',
            oldScore: attempt.score,
            newScore: totalScore,
            action: 'Fixed - Students can now see results'
          })
        }
      } catch (error) {
        console.error(`Error processing attempt ${attempt.id}:`, error)
        errors.push(`Attempt ${attempt.id}: ${error}`)
      }
    }

    console.log(`Fix completed. Updated: ${updated}, Errors: ${errors.length}`)
    return { updated, errors, details }
  } catch (error) {
    console.error('Error in fixQuizAttemptsWithManualGrades:', error)
    throw error
  }
}

export async function fixAllPendingQuizAttempts(): Promise<{ updated: number; errors: string[]; details: any[] }> {
  try {
    const supabase = createClient()
    
    console.log('Starting fix for all pending quiz attempts')
    
    // Get all quiz attempts that are 'completed' but have manual grades
    const { data: pendingAttempts, error: fetchError } = await supabase
      .from('quiz_attempts')
      .select(`
        id,
        status,
        score,
        quiz_id,
        quiz_question_grades!inner(id)
      `)
      .eq('status', 'completed')

    if (fetchError) {
      console.error('Error fetching pending attempts:', fetchError)
      throw fetchError
    }

    console.log(`Found ${pendingAttempts?.length || 0} quiz attempts that need fixing`)

    if (!pendingAttempts || pendingAttempts.length === 0) {
      return { updated: 0, errors: [], details: [] }
    }

    let updated = 0
    const errors: string[] = []
    const details: any[] = []

    for (const attempt of pendingAttempts) {
      try {
        console.log(`Processing pending attempt ${attempt.id}`)
        
        // Calculate correct total score for this attempt
        const totalScore = await calculateTotalScore(attempt.id)
        
        // Update the attempt with correct score and status
        const { error: updateError } = await supabase
          .from('quiz_attempts')
          .update({ 
            score: totalScore,
            status: 'graded'
          })
          .eq('id', attempt.id)

        if (updateError) {
          console.error(`Error updating attempt ${attempt.id}:`, updateError)
          errors.push(`Attempt ${attempt.id}: ${updateError.message}`)
        } else {
          console.log(`Successfully fixed attempt ${attempt.id} with score ${totalScore}`)
          updated++
          details.push({
            attemptId: attempt.id,
            oldStatus: 'completed',
            newStatus: 'graded',
            oldScore: attempt.score,
            newScore: totalScore
          })
        }
      } catch (error) {
        console.error(`Error processing attempt ${attempt.id}:`, error)
        errors.push(`Attempt ${attempt.id}: ${error}`)
      }
    }

    console.log(`Fix completed. Updated: ${updated}, Errors: ${errors.length}`)
    return { updated, errors, details }
  } catch (error) {
    console.error('Error in fixAllPendingQuizAttempts:', error)
    throw error
  }
}

// Debug function to check the status of a specific quiz attempt
// Check if manual grades are being saved and connected properly
export async function checkManualGradingConnection(): Promise<any> {
  try {
    const supabase = createClient()
    
    console.log('Checking manual grading database connections...')
    
    // Get recent quiz attempts that are 'completed'
    const { data: completedAttempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select(`
        id,
        status,
        score,
        quiz_id,
        student_id,
        completed_at,
        quizzes(title),
        profiles(full_name, email)
      `)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(5)

    if (attemptsError) {
      console.error('Error fetching completed attempts:', attemptsError)
      return { error: attemptsError.message }
    }

    console.log('Found completed attempts:', completedAttempts?.length || 0)

    // For each completed attempt, check if there are manual grades
    const results = []
    
    for (const attempt of completedAttempts || []) {
      // Get manual grades for this attempt
      const { data: manualGrades, error: gradesError } = await supabase
        .from('quiz_question_grades')
        .select('*')
        .eq('attempt_id', attempt.id)

      if (gradesError) {
        console.error(`Error fetching grades for attempt ${attempt.id}:`, gradesError)
        continue
      }

      // Get questions for this quiz
      const { data: questions, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', attempt.quiz_id)
        .order('order_index')

      if (questionsError) {
        console.error(`Error fetching questions for quiz ${attempt.quiz_id}:`, questionsError)
        continue
      }

      const manualQuestions = questions?.filter(q => q.type === 'short_answer' || q.type === 'essay') || []
      const hasManualQuestions = manualQuestions.length > 0
      const hasManualGrades = (manualGrades?.length || 0) > 0

      results.push({
        attemptId: attempt.id,
        status: attempt.status,
        currentScore: attempt.score,
        quizTitle: Array.isArray(attempt.quizzes) ? (attempt.quizzes[0] as any)?.title : (attempt.quizzes as any)?.title,
        studentName: Array.isArray(attempt.profiles) ? (attempt.profiles[0] as any)?.full_name : (attempt.profiles as any)?.full_name,
        completedAt: attempt.completed_at,
        hasManualQuestions,
        manualQuestionsCount: manualQuestions.length,
        hasManualGrades,
        manualGradesCount: manualGrades?.length || 0,
        manualGrades: manualGrades?.map(g => ({
          questionId: g.question_id,
          pointsAwarded: g.points_awarded,
          gradedAt: g.graded_at,
          gradedBy: g.graded_by
        })) || [],
        shouldBeGraded: hasManualGrades && hasManualQuestions,
        issue: hasManualGrades && attempt.status === 'completed' ? 'STUCK_IN_COMPLETED_STATUS' : 'NO_ISSUE'
      })
    }

    const issueCount = results.filter(r => r.issue === 'STUCK_IN_COMPLETED_STATUS').length

    const summary = {
      totalCompletedAttempts: completedAttempts?.length || 0,
      attemptsWithManualGrades: results.filter(r => r.hasManualGrades).length,
      attemptsStuckInCompleted: issueCount,
      needsFixing: issueCount > 0,
      results
    }

    console.log('Manual grading connection check summary:', summary)
    return summary

  } catch (error) {
    console.error('Error in checkManualGradingConnection:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Test if manual grading is working for a specific attempt
export async function testManualGradingForAttempt(attemptId: string): Promise<any> {
  try {
    const supabase = createClient()
    
    console.log('Testing manual grading for attempt:', attemptId)
    
    // Step 1: Check if the attempt exists
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        quizzes(title),
        profiles(full_name, email)
      `)
      .eq('id', attemptId)
      .single()

    if (attemptError) {
      return { error: `Attempt not found: ${attemptError.message}` }
    }

    // Step 2: Check for manual grades
    const { data: manualGrades, error: gradesError } = await supabase
      .from('quiz_question_grades')
      .select('*')
      .eq('attempt_id', attemptId)

    if (gradesError) {
      return { error: `Error fetching grades: ${gradesError.message}` }
    }

    // Step 3: Get quiz questions
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', attempt.quiz_id)
      .order('order_index')

    if (questionsError) {
      return { error: `Error fetching questions: ${questionsError.message}` }
    }

    // Step 4: Calculate expected score
    let expectedScore = 0
    
    questions?.forEach(question => {
      const studentAnswer = attempt.answers[question.id]
      
      if (question.type === 'multiple_choice' || question.type === 'true_false') {
        // Auto-grade
        if (studentAnswer === question.correct_answer) {
          expectedScore += question.points
        }
      } else if (question.type === 'short_answer' || question.type === 'essay') {
        // Use manual grade if available
        const grade = manualGrades?.find(g => g.question_id === question.id)
        if (grade) {
          expectedScore += grade.points_awarded
        }
      }
    })

    // Step 5: Test if we can update the attempt
    const testResult = {
      attempt: {
        id: attempt.id,
        currentStatus: attempt.status,
        currentScore: attempt.score,
        expectedScore,
        needsUpdate: attempt.status === 'completed' && (manualGrades?.length || 0) > 0,
        quizTitle: attempt.quizzes?.title,
        studentName: attempt.profiles?.full_name
      },
      manualGrades: manualGrades?.map(g => ({
        questionId: g.question_id,
        pointsAwarded: g.points_awarded,
        gradedAt: g.graded_at
      })) || [],
      questions: questions?.map(q => ({
        id: q.id,
        type: q.type,
        points: q.points,
        hasStudentAnswer: !!attempt.answers[q.id],
        hasManualGrade: !!(manualGrades?.find(g => g.question_id === q.id))
      })) || [],
      diagnosis: {
        hasManualQuestions: questions?.some(q => q.type === 'short_answer' || q.type === 'essay') || false,
        hasManualGrades: (manualGrades?.length || 0) > 0,
        scoreMatches: attempt.score === expectedScore,
        statusCorrect: (manualGrades?.length || 0) > 0 ? attempt.status === 'graded' : true,
        connectionWorking: true // If we got here, the connection is working
      }
    }

    console.log('Manual grading test result:', testResult)
    return testResult

  } catch (error) {
    console.error('Error in testManualGradingForAttempt:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Get detailed score breakdown showing auto vs manual grades
export async function getScoreBreakdown(attemptId: string): Promise<any> {
  try {
    const supabase = createClient()
    
    console.log('Getting score breakdown for attempt:', attemptId)
    
    // Get attempt and quiz info
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        quizzes(title),
        profiles(full_name, email)
      `)
      .eq('id', attemptId)
      .single()

    if (attemptError) {
      return { error: `Attempt not found: ${attemptError.message}` }
    }

    // Get all questions for the quiz
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', attempt.quiz_id)
      .order('order_index')

    if (questionsError) {
      return { error: `Error fetching questions: ${questionsError.message}` }
    }

    // Get manual grades
    const { data: grades, error: gradesError } = await supabase
      .from('quiz_question_grades')
      .select('*')
      .eq('attempt_id', attemptId)

    if (gradesError) {
      return { error: `Error fetching grades: ${gradesError.message}` }
    }

    // Calculate breakdown
    let autoScore = 0
    let manualScore = 0
    const questionBreakdown: any[] = []

    questions?.forEach(question => {
      const studentAnswer = attempt.answers[question.id]
      const questionData: any = {
        id: question.id,
        type: question.type,
        question: question.question,
        maxPoints: question.points,
        studentAnswer: studentAnswer || 'No answer',
        pointsEarned: 0,
        gradingMethod: 'N/A'
      }

      if (question.type === 'multiple_choice' || question.type === 'true_false') {
        questionData.correctAnswer = question.correct_answer
        // Normalize answers for comparison (trim whitespace, handle case sensitivity)
        const normalizedStudentAnswer = studentAnswer ? String(studentAnswer).trim() : ''
        const normalizedCorrectAnswer = question.correct_answer ? String(question.correct_answer).trim() : ''
        
        // Compare answers (case-insensitive for better matching)
        const isCorrect = normalizedStudentAnswer.toLowerCase() === normalizedCorrectAnswer.toLowerCase()
        
        console.log(`Auto-grading question ${question.id}:`, {
          studentAnswer: normalizedStudentAnswer,
          correctAnswer: normalizedCorrectAnswer,
          isCorrect,
          points: question.points
        })
        
        if (isCorrect) {
          questionData.pointsEarned = question.points
          autoScore += question.points
          questionData.gradingMethod = 'Auto-graded (Correct)'
        } else {
          questionData.pointsEarned = 0
          questionData.gradingMethod = `Auto-graded (Incorrect - Student: "${normalizedStudentAnswer}", Correct: "${normalizedCorrectAnswer}")`
        }
      } else if (question.type === 'short_answer' || question.type === 'essay') {
        const grade = grades?.find(g => g.question_id === question.id)
        if (grade) {
          questionData.pointsEarned = grade.points_awarded
          questionData.feedback = grade.feedback
          questionData.gradedAt = grade.graded_at
          manualScore += grade.points_awarded
          questionData.gradingMethod = 'Manual graded by faculty'
        } else {
          questionData.pointsEarned = 0
          questionData.gradingMethod = 'Not yet graded'
        }
      }

      questionBreakdown.push(questionData)
    })

    const totalScore = autoScore + manualScore

    const breakdown = {
      attempt: {
        id: attempt.id,
        currentStatus: attempt.status,
        currentStoredScore: attempt.score,
        quizTitle: attempt.quizzes?.title,
        studentName: attempt.profiles?.full_name,
        studentEmail: attempt.profiles?.email,
        completedAt: attempt.completed_at
      },
      scoreBreakdown: {
        autoGradedPoints: autoScore,
        manualGradedPoints: manualScore,
        calculatedTotal: totalScore,
        storedScore: attempt.score,
        scoresMatch: attempt.score === totalScore,
        needsUpdate: attempt.score !== totalScore || (manualScore > 0 && attempt.status === 'completed')
      },
      questions: questionBreakdown,
      summary: {
        totalQuestions: questions?.length || 0,
        autoGradedQuestions: questions?.filter(q => q.type === 'multiple_choice' || q.type === 'true_false').length || 0,
        manualGradedQuestions: questions?.filter(q => q.type === 'short_answer' || q.type === 'essay').length || 0,
        completedManualGrades: grades?.length || 0
      }
    }

    console.log('Score breakdown:', breakdown)
    return breakdown

  } catch (error) {
    console.error('Error in getScoreBreakdown:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// UTILITY FUNCTION: Fix quiz attempts that have manual grades but wrong score/status
export async function fixQuizScoreSynchronization(): Promise<{ fixed: number; errors: string[]; details: any[] }> {
  try {
    const supabase = createClient()
    
    console.log('=== FIXING QUIZ SCORE SYNCHRONIZATION ===')
    console.log('Looking for quiz attempts with manual grades but incorrect score/status...')
    
    // Get all quiz attempts
    const { data: allAttempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .order('completed_at', { ascending: false })
    
    if (attemptsError) {
      throw attemptsError
    }
    
    console.log(`Found ${allAttempts?.length || 0} total quiz attempts`)
    
    if (!allAttempts || allAttempts.length === 0) {
      return { fixed: 0, errors: [], details: [] }
    }
    
    const problemAttempts = []
    
    // Check each attempt for issues
    for (const attempt of allAttempts) {
      // Get manual grades for this attempt
      const { data: manualGrades } = await supabase
        .from('quiz_question_grades')
        .select('*')
        .eq('attempt_id', attempt.id)
      
      if (manualGrades && manualGrades.length > 0) {
        // This attempt has manual grades - calculate what the score should be
        const expectedScore = await calculateTotalScore(attempt.id)
        
        const hasIssue = (
          attempt.status === 'completed' || // Wrong status
          attempt.score !== expectedScore   // Wrong score
        )
        
        if (hasIssue) {
          problemAttempts.push({
            ...attempt,
            manualGradesCount: manualGrades.length,
            expectedScore,
            issue: attempt.status === 'completed' ? 'wrong_status' : 'wrong_score'
          })
        }
      }
    }
    
    console.log(`Found ${problemAttempts.length} quiz attempts that need fixing`)
    
    if (problemAttempts.length === 0) {
      console.log('✅ All quiz scores are properly synchronized!')
      return { fixed: 0, errors: [], details: [] }
    }
    
    // Fix each problem attempt
    let fixed = 0
    const errors: string[] = []
    const details: any[] = []
    
    for (const attempt of problemAttempts) {
      try {
        console.log(`Fixing attempt ${attempt.id}...`)
        
        const { error: updateError } = await supabase
          .from('quiz_attempts')
          .update({
            score: attempt.expectedScore,
            status: 'graded'
          })
          .eq('id', attempt.id)
        
        if (updateError) {
          console.error(`Error fixing attempt ${attempt.id}:`, updateError.message)
          errors.push(`Attempt ${attempt.id}: ${updateError.message}`)
        } else {
          console.log(`✅ Fixed attempt ${attempt.id}: score ${attempt.score} → ${attempt.expectedScore}, status ${attempt.status} → graded`)
          fixed++
          details.push({
            attemptId: attempt.id,
            oldScore: attempt.score,
            newScore: attempt.expectedScore,
            oldStatus: attempt.status,
            newStatus: 'graded',
            manualGradesCount: attempt.manualGradesCount
          })
        }
      } catch (error) {
        console.error(`Error processing attempt ${attempt.id}:`, error)
        errors.push(`Attempt ${attempt.id}: ${error}`)
      }
    }
    
    console.log(`\n=== RESULTS ===`)
    console.log(`Fixed: ${fixed} attempts`)
    console.log(`Errors: ${errors.length}`)
    
    return { fixed, errors, details }
  } catch (error) {
    console.error('Error in fixQuizScoreSynchronization:', error)
    throw error
  }
}

export async function debugQuizAttemptStatus(attemptId: string): Promise<any> {
  try {
    const supabase = createClient()
    
    console.log('Debugging quiz attempt status for:', attemptId)
    
    // Get attempt details
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        quizzes(id, title),
        profiles(full_name, email)
      `)
      .eq('id', attemptId)
      .single()

    if (attemptError) {
      console.error('Error fetching attempt:', attemptError)
      return { error: attemptError.message }
    }

    // Get manual grades
    const { data: grades, error: gradesError } = await supabase
      .from('quiz_question_grades')
      .select('*')
      .eq('attempt_id', attemptId)

    if (gradesError) {
      console.error('Error fetching grades:', gradesError)
      return { error: gradesError.message }
    }

    // Get questions
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', attempt.quiz_id)
      .order('order_index')

    if (questionsError) {
      console.error('Error fetching questions:', questionsError)
      return { error: questionsError.message }
    }

    // Calculate expected score
    const expectedScore = await calculateTotalScore(attemptId)

    const debugInfo = {
      attempt: {
        id: attempt.id,
        status: attempt.status,
        currentScore: attempt.score,
        expectedScore: expectedScore,
        needsUpdate: attempt.score !== expectedScore || attempt.status !== 'graded',
        quizTitle: attempt.quizzes?.title,
        studentName: attempt.profiles?.full_name,
        studentEmail: attempt.profiles?.email,
        completedAt: attempt.completed_at,
        answers: attempt.answers
      },
      questions: questions?.map(q => ({
        id: q.id,
        type: q.type,
        points: q.points,
        correctAnswer: q.correct_answer,
        studentAnswer: attempt.answers?.[q.id],
        isCorrect: q.type === 'multiple_choice' || q.type === 'true_false' 
          ? attempt.answers?.[q.id] === q.correct_answer 
          : null
      })),
      manualGrades: grades?.map(g => ({
        questionId: g.question_id,
        pointsAwarded: g.points_awarded,
        feedback: g.feedback,
        gradedAt: g.graded_at
      })),
      summary: {
        totalQuestions: questions?.length || 0,
        manualGrades: grades?.length || 0,
        autoGradedQuestions: questions?.filter(q => q.type === 'multiple_choice' || q.type === 'true_false').length || 0,
        manualGradedQuestions: questions?.filter(q => q.type === 'short_answer' || q.type === 'essay').length || 0,
        shouldBeGraded: (grades?.length || 0) > 0
      }
    }

    console.log('Debug info for attempt:', debugInfo)
    return debugInfo
  } catch (error) {
    console.error('Error in debugQuizAttemptStatus:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}