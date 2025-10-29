-- Final fix for manual grading system
-- This ensures all RLS policies are correct and manual grading works

-- 1. Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Faculty access to quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Students view own quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty full access" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Students view own grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty full access to quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Students access own quiz attempts" ON public.quiz_attempts;

-- 2. Create simple, permissive policies for quiz_question_grades
-- Faculty can do everything (no complex joins)
CREATE POLICY "Faculty full access to grades" ON public.quiz_question_grades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'faculty'
    )
  );

-- Students can view their own grades
CREATE POLICY "Students view own grades" ON public.quiz_question_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts 
      WHERE id = quiz_question_grades.attempt_id 
      AND student_id = auth.uid()
    )
  );

-- 3. Create simple, permissive policies for quiz_attempts
-- Faculty can do everything
CREATE POLICY "Faculty full access to attempts" ON public.quiz_attempts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'faculty'
    )
  );

-- Students can view and update their own attempts
CREATE POLICY "Students access own attempts" ON public.quiz_attempts
  FOR ALL USING (
    student_id = auth.uid()
  );

-- 4. Ensure RLS is enabled
ALTER TABLE public.quiz_question_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- 5. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_quiz_question_grades_attempt_id ON public.quiz_question_grades(attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_question_grades_question_id ON public.quiz_question_grades(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON public.quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 6. Test the policies
SELECT 
  'Testing quiz_question_grades access' as test_type,
  COUNT(*) as accessible_grades
FROM public.quiz_question_grades;

SELECT 
  'Testing quiz_attempts access' as test_type,
  COUNT(*) as accessible_attempts
FROM public.quiz_attempts;

-- 7. Show final policies
SELECT 
  'Final RLS policies' as info,
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename IN ('quiz_question_grades', 'quiz_attempts')
ORDER BY tablename, policyname;

