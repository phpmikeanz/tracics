-- Complete debug script for quiz questions access issues
-- Run this in Supabase SQL editor

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

-- Step 2: Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'quiz_questions';

-- Step 3: Count total questions in database
SELECT 
  COUNT(*) as total_questions,
  COUNT(DISTINCT quiz_id) as quizzes_with_questions
FROM public.quiz_questions;

-- Step 4: Check questions for a specific quiz (replace QUIZ_ID)
-- First, let's see what quizzes exist
SELECT 
  q.id,
  q.title,
  q.status,
  q.course_id,
  COUNT(qq.id) as question_count
FROM public.quizzes q
LEFT JOIN public.quiz_questions qq ON q.id = qq.quiz_id
GROUP BY q.id, q.title, q.status, q.course_id
ORDER BY q.created_at DESC
LIMIT 10;

-- Step 5: Check all questions for a specific quiz (replace QUIZ_ID with actual ID)
/*
SELECT 
  qq.*,
  q.title as quiz_title,
  q.status as quiz_status,
  c.title as course_title
FROM public.quiz_questions qq
JOIN public.quizzes q ON qq.quiz_id = q.id
JOIN public.courses c ON q.course_id = c.id
WHERE qq.quiz_id = 'REPLACE_WITH_QUIZ_ID'
ORDER BY qq.order_index ASC, qq.created_at ASC;
*/

-- Step 6: Check enrollments for debugging
SELECT 
  e.*,
  c.title as course_title,
  p.full_name as student_name
FROM public.enrollments e
JOIN public.courses c ON e.course_id = c.id
JOIN public.profiles p ON e.student_id = p.id
WHERE e.status = 'approved'
ORDER BY e.created_at DESC
LIMIT 10;

-- Step 7: Test RLS policy with a specific user (replace USER_ID)
/*
-- First, set the user context (this simulates what happens when a user logs in)
SET LOCAL "request.jwt.claims" = '{"sub": "REPLACE_WITH_USER_ID"}';

-- Now test the query that the application uses
SELECT 
  qq.*,
  q.title as quiz_title,
  q.status as quiz_status
FROM public.quiz_questions qq
JOIN public.quizzes q ON qq.quiz_id = q.id
WHERE qq.quiz_id = 'REPLACE_WITH_QUIZ_ID'
ORDER BY qq.order_index ASC;
*/

-- Step 8: Check for any questions with missing or invalid data
SELECT 
  id,
  quiz_id,
  question,
  type,
  points,
  order_index,
  created_at,
  CASE 
    WHEN question IS NULL OR question = '' THEN 'Missing question text'
    WHEN type IS NULL OR type = '' THEN 'Missing type'
    WHEN points IS NULL THEN 'Missing points'
    ELSE 'Valid'
  END as validation_status
FROM public.quiz_questions
WHERE quiz_id IN (
  SELECT id FROM public.quizzes 
  WHERE status IN ('published', 'closed')
)
ORDER BY quiz_id, order_index;

-- Step 9: Check for duplicate questions or ordering issues
SELECT 
  quiz_id,
  COUNT(*) as total_questions,
  COUNT(DISTINCT order_index) as unique_order_indices,
  MIN(order_index) as min_order,
  MAX(order_index) as max_order,
  COUNT(CASE WHEN order_index IS NULL THEN 1 END) as null_order_count
FROM public.quiz_questions
GROUP BY quiz_id
HAVING COUNT(*) > 0
ORDER BY total_questions DESC;

-- Step 10: Create a comprehensive fix for RLS policies
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Students can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Faculty can view quiz questions" ON public.quiz_questions;

-- Create a more permissive policy for testing
CREATE POLICY "Users can view quiz questions" ON public.quiz_questions FOR SELECT USING (
  -- Faculty can view questions for their own courses
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
WHERE tablename = 'quiz_questions'
ORDER BY policyname;
