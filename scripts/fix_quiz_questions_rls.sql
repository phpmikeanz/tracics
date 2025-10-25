-- Fix quiz questions RLS policy to ensure students can access questions
-- This script addresses the issue where students can't see quiz questions

-- First, let's check the current policy
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'quiz_questions';

-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Users can view quiz questions" ON public.quiz_questions;

-- Create a new, more permissive policy for viewing quiz questions
-- This policy allows:
-- 1. Faculty to view questions for their own courses
-- 2. Students to view questions for courses they are enrolled in and approved for
-- 3. Ensures the quiz is published (not draft)
CREATE POLICY "Users can view quiz questions" ON public.quiz_questions FOR SELECT USING (
  -- Faculty can view questions for their own courses
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE q.id = quiz_id 
    AND c.instructor_id = auth.uid()
  ) OR
  -- Students can view questions for courses they are enrolled in and approved for
  -- AND the quiz must be published (not draft)
  (
    EXISTS (
      SELECT 1 FROM public.quizzes q 
      JOIN public.enrollments e ON q.course_id = e.course_id 
      WHERE q.id = quiz_id 
      AND e.student_id = auth.uid() 
      AND e.status = 'approved'
      AND q.status IN ('published', 'closed')
    )
  )
);

-- Verify the new policy
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'quiz_questions';

-- Test query to see if students can access quiz questions
-- Replace 'STUDENT_ID' and 'QUIZ_ID' with actual values for testing
/*
SELECT qq.*, q.title as quiz_title, q.status as quiz_status, c.title as course_title
FROM public.quiz_questions qq
JOIN public.quizzes q ON qq.quiz_id = q.id
JOIN public.courses c ON q.course_id = c.id
WHERE qq.quiz_id = 'QUIZ_ID'
AND q.status IN ('published', 'closed');
*/
