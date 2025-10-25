-- Complete RLS Policy Fix for Quiz Questions Access
-- This script ensures students can access quiz questions properly

-- Step 1: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Students can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Faculty can view quiz questions" ON public.quiz_questions;

-- Step 2: Create comprehensive RLS policy for quiz_questions
CREATE POLICY "Users can view quiz questions" ON public.quiz_questions FOR SELECT USING (
  -- Faculty can view questions for their own courses (any quiz status)
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE q.id = quiz_id 
    AND c.instructor_id = auth.uid()
  ) OR
  -- Students can view questions for published/closed quizzes in courses they're enrolled in and approved for
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.enrollments e ON q.course_id = e.course_id 
    WHERE q.id = quiz_id 
    AND e.student_id = auth.uid() 
    AND e.status = 'approved'
    AND q.status IN ('published', 'closed')
  )
);

-- Step 3: Ensure RLS is enabled on quiz_questions table
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- Step 4: Create additional policies for other quiz-related tables if needed

-- Policy for quiz_attempts (students can view their own attempts)
DROP POLICY IF EXISTS "Users can view quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can view quiz attempts" ON public.quiz_attempts FOR SELECT USING (
  -- Students can view their own attempts
  student_id = auth.uid() OR
  -- Faculty can view attempts for their courses
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE q.id = quiz_id 
    AND c.instructor_id = auth.uid()
  )
);

-- Policy for quiz_question_grades (students can view their own grades)
DROP POLICY IF EXISTS "Users can view quiz question grades" ON public.quiz_question_grades;
CREATE POLICY "Users can view quiz question grades" ON public.quiz_question_grades FOR SELECT USING (
  -- Students can view grades for their own attempts
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa 
    WHERE qa.id = attempt_id 
    AND qa.student_id = auth.uid()
  ) OR
  -- Faculty can view grades for their courses
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa 
    JOIN public.quizzes q ON qa.quiz_id = q.id 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE qa.id = attempt_id 
    AND c.instructor_id = auth.uid()
  )
);

-- Step 5: Verify the policies are working
-- This query should show the policies we just created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('quiz_questions', 'quiz_attempts', 'quiz_question_grades')
ORDER BY tablename, policyname;

-- Step 6: Test query to verify student access
-- This simulates what a student should be able to see
SELECT 
  'Testing student access to quiz questions' as test_description,
  COUNT(*) as accessible_questions
FROM public.quiz_questions qq
JOIN public.quizzes q ON qq.quiz_id = q.id
JOIN public.courses c ON q.course_id = c.id
JOIN public.enrollments e ON c.id = e.course_id
WHERE e.student_id = auth.uid() 
AND e.status = 'approved'
AND q.status IN ('published', 'closed');

-- Step 7: Check for any missing enrollments or quiz status issues
SELECT 
  'Checking quiz and enrollment data' as check_description,
  COUNT(DISTINCT q.id) as total_published_quizzes,
  COUNT(DISTINCT e.id) as total_approved_enrollments,
  COUNT(DISTINCT qq.id) as total_quiz_questions
FROM public.quizzes q
LEFT JOIN public.quiz_questions qq ON q.id = qq.quiz_id
LEFT JOIN public.enrollments e ON q.course_id = e.course_id
WHERE q.status IN ('published', 'closed')
AND e.status = 'approved';
