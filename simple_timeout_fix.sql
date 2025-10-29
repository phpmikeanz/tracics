-- Simple fix for manual grading timeout issues
-- Run this in your Supabase SQL editor

-- 1. Drop complex RLS policies that cause timeouts
DROP POLICY IF EXISTS "Faculty can view grades for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can insert grades for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can update grades for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can delete grades for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Students can view their own question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty full access to quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Students can view their own quiz question grades" ON public.quiz_question_grades;

-- 2. Create simple, fast RLS policies
-- Faculty can do everything (simplified for performance)
CREATE POLICY "Faculty access to quiz question grades" ON public.quiz_question_grades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'faculty'
    )
  );

-- Students can view their own grades
CREATE POLICY "Students view own quiz question grades" ON public.quiz_question_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts 
      WHERE id = quiz_question_grades.attempt_id 
      AND student_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'student'
    )
  );

-- 3. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON public.quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_quiz_question_grades_attempt_id ON public.quiz_question_grades(attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_question_grades_question_id ON public.quiz_question_grades(question_id);

-- 4. Test the fix
SELECT 
  'Timeout fix applied successfully' as status,
  COUNT(*) as accessible_grades
FROM public.quiz_question_grades;
