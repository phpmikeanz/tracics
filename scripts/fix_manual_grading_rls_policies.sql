-- Fix RLS policies for manual grading system
-- This script addresses potential RLS policy issues that might prevent grade insertion

-- 1. Drop existing policies to recreate them with better logic
DROP POLICY IF EXISTS "Faculty can view and grade questions for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Students can view their own question grades" ON public.quiz_question_grades;

-- 2. Create separate policies for different operations

-- Faculty can SELECT (view) grades for their own quizzes
CREATE POLICY "Faculty can view grades for their quizzes" ON public.quiz_question_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      JOIN public.quizzes q ON qa.quiz_id = q.id
      JOIN public.courses c ON q.course_id = c.id
      WHERE qa.id = quiz_question_grades.attempt_id
      AND c.instructor_id = auth.uid()
    )
  );

-- Faculty can INSERT grades for their own quizzes
CREATE POLICY "Faculty can insert grades for their quizzes" ON public.quiz_question_grades
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      JOIN public.quizzes q ON qa.quiz_id = q.id
      JOIN public.courses c ON q.course_id = c.id
      WHERE qa.id = quiz_question_grades.attempt_id
      AND c.instructor_id = auth.uid()
    )
  );

-- Faculty can UPDATE grades for their own quizzes
CREATE POLICY "Faculty can update grades for their quizzes" ON public.quiz_question_grades
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      JOIN public.quizzes q ON qa.quiz_id = q.id
      JOIN public.courses c ON q.course_id = c.id
      WHERE qa.id = quiz_question_grades.attempt_id
      AND c.instructor_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      JOIN public.quizzes q ON qa.quiz_id = q.id
      JOIN public.courses c ON q.course_id = c.id
      WHERE qa.id = quiz_question_grades.attempt_id
      AND c.instructor_id = auth.uid()
    )
  );

-- Students can view their own grades
CREATE POLICY "Students can view their own question grades" ON public.quiz_question_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      WHERE qa.id = quiz_question_grades.attempt_id
      AND qa.student_id = auth.uid()
    )
  );

-- 3. Verify the policies were created correctly
SELECT 
  policyname,
  cmd,
  permissive,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'quiz_question_grades'
ORDER BY policyname;

-- 4. Test the policies by checking if current user can access grades
-- This should work if the user is properly authenticated and has the right permissions
SELECT 
  'Testing RLS access after policy fix' as test_type,
  COUNT(*) as accessible_grades
FROM public.quiz_question_grades;

































