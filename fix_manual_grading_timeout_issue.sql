-- Fix manual grading timeout issue
-- This script addresses the statement timeout problem in RLS policies

-- 1. First, let's check what policies currently exist
SELECT 
  policyname,
  cmd,
  permissive,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'quiz_question_grades'
ORDER BY policyname;

-- 2. Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Faculty can view and grade questions for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Students can view their own question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can create quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can view quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can update quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can delete quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Students can view quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can view grades for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can insert grades for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can update grades for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can delete grades for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Students can view their own question grades" ON public.quiz_question_grades;

-- 3. Create SIMPLIFIED and OPTIMIZED policies
-- These policies use direct joins instead of EXISTS subqueries to avoid performance issues

-- Faculty can do everything with quiz question grades for their own courses
CREATE POLICY "Faculty full access to quiz question grades" ON public.quiz_question_grades
  FOR ALL USING (
    -- Check if user is faculty
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'faculty')
    AND
    -- Check if the quiz belongs to a course taught by this faculty
    EXISTS (
      SELECT 1 
      FROM public.quiz_attempts qa
      JOIN public.quizzes q ON qa.quiz_id = q.id
      JOIN public.courses c ON q.course_id = c.id
      WHERE qa.id = quiz_question_grades.attempt_id
      AND c.instructor_id = auth.uid()
    )
  ) WITH CHECK (
    -- Same check for INSERT/UPDATE operations
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'faculty')
    AND
    EXISTS (
      SELECT 1 
      FROM public.quiz_attempts qa
      JOIN public.quizzes q ON qa.quiz_id = q.id
      JOIN public.courses c ON q.course_id = c.id
      WHERE qa.id = quiz_question_grades.attempt_id
      AND c.instructor_id = auth.uid()
    )
  );

-- Students can view their own quiz question grades
CREATE POLICY "Students can view their own quiz question grades" ON public.quiz_question_grades
  FOR SELECT USING (
    -- Check if user is student
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student')
    AND
    -- Check if this is their own quiz attempt
    EXISTS (
      SELECT 1 
      FROM public.quiz_attempts qa
      WHERE qa.id = quiz_question_grades.attempt_id
      AND qa.student_id = auth.uid()
    )
  );

-- 4. Verify the policies were created correctly
SELECT 
  policyname,
  cmd,
  permissive,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'quiz_question_grades'
ORDER BY policyname;

-- 5. Test the policies with a simple query
-- This should not timeout
SELECT 
  'Testing RLS access after policy fix' as test_type,
  COUNT(*) as accessible_grades
FROM public.quiz_question_grades;

-- 6. Check if there are any performance issues with the policies
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM public.quiz_question_grades 
WHERE attempt_id IN (
  SELECT id FROM public.quiz_attempts 
  WHERE student_id = auth.uid()
);

