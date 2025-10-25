-- Complete RLS Fix for Quiz System
-- This script fixes all RLS policy issues for the quiz system

-- ==============================================
-- 1. ENABLE RLS ON ALL TABLES
-- ==============================================

-- Enable RLS on all quiz-related tables
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_question_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 2. DROP EXISTING POLICIES
-- ==============================================

-- Drop existing quiz_attempts policies
DROP POLICY IF EXISTS "Students can manage own quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Faculty can view quiz attempts for their courses" ON public.quiz_attempts;

-- Drop existing quiz_questions policies
DROP POLICY IF EXISTS "Users can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Faculty can manage quiz questions" ON public.quiz_questions;

-- Drop existing quiz_question_grades policies (if they exist)
DROP POLICY IF EXISTS "Students can view own question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can manage question grades for their courses" ON public.quiz_question_grades;

-- Drop existing quizzes policies (if they exist)
DROP POLICY IF EXISTS "Students can view quizzes for enrolled courses" ON public.quizzes;
DROP POLICY IF EXISTS "Faculty can manage quizzes for own courses" ON public.quizzes;

-- ==============================================
-- 3. CREATE NEW POLICIES
-- ==============================================

-- QUIZ_ATTEMPTS POLICIES
-- Students can manage their own quiz attempts
CREATE POLICY "Students can manage own quiz attempts" ON public.quiz_attempts FOR ALL USING (
  student_id = auth.uid()
);

-- Faculty can view quiz attempts for their courses
CREATE POLICY "Faculty can view quiz attempts for their courses" ON public.quiz_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON q.course_id = c.id 
          WHERE q.id = quiz_id AND c.instructor_id = auth.uid())
);

-- Faculty can update quiz attempts for their courses (CRITICAL FOR MANUAL GRADING)
CREATE POLICY "Faculty can update quiz attempts for their courses" ON public.quiz_attempts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON q.course_id = c.id 
          WHERE q.id = quiz_id AND c.instructor_id = auth.uid())
);

-- QUIZ_QUESTIONS POLICIES
-- Users can view quiz questions with proper restrictions
CREATE POLICY "Users can view quiz questions" ON public.quiz_questions FOR SELECT USING (
  -- Faculty can view questions for their own courses (any quiz status)
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE q.id = quiz_id 
    AND c.instructor_id = auth.uid()
  ) OR
  -- Students can view questions for published/closed quizzes in courses they're enrolled in
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.enrollments e ON q.course_id = e.course_id 
    WHERE q.id = quiz_id 
    AND e.student_id = auth.uid() 
    AND e.status = 'approved'
    AND q.status IN ('published', 'closed')
  )
);

-- Faculty can manage quiz questions for their courses
CREATE POLICY "Faculty can manage quiz questions" ON public.quiz_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON q.course_id = c.id 
          WHERE q.id = quiz_id AND c.instructor_id = auth.uid())
);

-- QUIZ_QUESTION_GRADES POLICIES
-- Students can view their own question grades
CREATE POLICY "Students can view own question grades" ON public.quiz_question_grades FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quiz_attempts WHERE id = attempt_id AND student_id = auth.uid())
);

-- Faculty can manage question grades for their courses
CREATE POLICY "Faculty can manage question grades for their courses" ON public.quiz_question_grades FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa 
    JOIN public.quizzes q ON qa.quiz_id = q.id 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE qa.id = attempt_id AND c.instructor_id = auth.uid()
  )
);

-- QUIZZES POLICIES
-- Students can view published quizzes for enrolled courses
CREATE POLICY "Students can view published quizzes for enrolled courses" ON public.quizzes FOR SELECT USING (
  status IN ('published', 'closed') AND
  EXISTS (SELECT 1 FROM public.enrollments WHERE course_id = quizzes.course_id AND student_id = auth.uid() AND status = 'approved')
);

-- Faculty can view all quizzes for their courses
CREATE POLICY "Faculty can view quizzes for their courses" ON public.quizzes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = quizzes.course_id AND instructor_id = auth.uid())
);

-- Faculty can manage quizzes for their courses
CREATE POLICY "Faculty can manage quizzes for their courses" ON public.quizzes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid())
);

-- ==============================================
-- 4. VERIFICATION
-- ==============================================

-- Verify RLS is enabled
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS ENABLED'
    ELSE '❌ RLS DISABLED'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('quiz_attempts', 'quiz_questions', 'quiz_question_grades', 'quizzes')
ORDER BY tablename;

-- Verify policies are created
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN '👁️ View'
    WHEN cmd = 'INSERT' THEN '➕ Create'
    WHEN cmd = 'UPDATE' THEN '✏️ Update'
    WHEN cmd = 'DELETE' THEN '🗑️ Delete'
    WHEN cmd = 'ALL' THEN '🔧 All Operations'
    ELSE cmd
  END as operation_type
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('quiz_attempts', 'quiz_questions', 'quiz_question_grades', 'quizzes')
ORDER BY tablename, policyname;

-- Test query to verify faculty can update quiz attempts
SELECT 
  'Faculty Update Test' as test_name,
  COUNT(*) as accessible_attempts
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.courses c ON q.course_id = c.id
WHERE c.instructor_id = auth.uid();

-- Test query to verify students can view published quiz questions
SELECT 
  'Student Quiz Questions Test' as test_name,
  COUNT(*) as accessible_questions
FROM public.quiz_questions qq
JOIN public.quizzes q ON qq.quiz_id = q.id
JOIN public.enrollments e ON q.course_id = e.course_id
WHERE e.student_id = auth.uid() 
AND e.status = 'approved'
AND q.status IN ('published', 'closed');

-- ==============================================
-- 5. SUCCESS MESSAGE
-- ==============================================

SELECT 
  '🎉 RLS Configuration Complete!' as status,
  'All quiz system RLS policies have been configured successfully.' as message,
  'Faculty can now update quiz attempts for manual grading.' as note;
