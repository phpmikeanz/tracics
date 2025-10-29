-- Fix for missing quiz questions issue
-- This script ensures students can access all quiz questions properly

-- Step 1: Check current RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'quiz_questions'
ORDER BY policyname;

-- Step 2: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Students can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Faculty can view quiz questions" ON public.quiz_questions;

-- Step 3: Create comprehensive RLS policy for quiz_questions
-- This policy ensures students can access ALL questions for published/closed quizzes
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

-- Step 4: Ensure RLS is enabled
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- Step 5: Test the policy with a sample query
-- Replace 'STUDENT_ID' and 'QUIZ_ID' with actual values for testing
/*
SELECT 
  qq.*, 
  q.title as quiz_title, 
  q.status as quiz_status, 
  c.title as course_title,
  e.status as enrollment_status
FROM public.quiz_questions qq
JOIN public.quizzes q ON qq.quiz_id = q.id
JOIN public.courses c ON q.course_id = c.id
LEFT JOIN public.enrollments e ON e.course_id = c.id AND e.student_id = auth.uid()
WHERE qq.quiz_id = 'QUIZ_ID';
*/

-- Step 6: Verify the new policy
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'quiz_questions'
ORDER BY policyname;

-- Step 7: Check if there are any questions in the database
SELECT 
  COUNT(*) as total_questions,
  COUNT(DISTINCT quiz_id) as quizzes_with_questions
FROM public.quiz_questions;

-- Step 8: Check quiz statuses
SELECT 
  q.id,
  q.title,
  q.status,
  COUNT(qq.id) as question_count
FROM public.quizzes q
LEFT JOIN public.quiz_questions qq ON q.id = qq.quiz_id
GROUP BY q.id, q.title, q.status
ORDER BY q.created_at DESC;
