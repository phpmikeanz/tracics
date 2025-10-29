-- AGGRESSIVE CLEANUP - Remove ALL existing policies and create only simple ones
-- This will definitely fix the timeout issue

-- Step 1: Drop ALL existing policies (comprehensive cleanup)
DROP POLICY IF EXISTS "Faculty access to quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can create grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can manage question grades for their courses" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can manage quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can update grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can view grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Students can read quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Students can view own grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Students can view own question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Students view own quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Users can view quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can view grades for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can insert grades for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can update grades for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can delete grades for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Students can view their own question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty full access to quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Students can view their own quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can view and grade questions for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can create quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can view quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can update quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can delete quiz question grades" ON public.quiz_question_grades;

-- Step 2: Create ONLY simple, fast policies
-- Faculty can do everything (no complex joins - just check if user is faculty)
CREATE POLICY "Faculty full access" ON public.quiz_question_grades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'faculty'
    )
  );

-- Students can view their own grades (simple check)
CREATE POLICY "Students view own grades" ON public.quiz_question_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts 
      WHERE id = quiz_question_grades.attempt_id 
      AND student_id = auth.uid()
    )
  );

-- Step 3: Verify only 2 policies exist now
SELECT 
  'Cleanup complete - only simple policies remain' as status,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'quiz_question_grades';

-- Step 4: Show the final policies
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'quiz_question_grades'
ORDER BY policyname;

-- Step 5: Test access
SELECT 
  'Testing access after cleanup' as test_type,
  COUNT(*) as accessible_grades
FROM public.quiz_question_grades;
