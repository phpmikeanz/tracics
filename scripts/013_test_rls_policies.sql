-- Test RLS policies for quiz questions
-- This script helps identify if RLS policies are blocking student access

-- 1. Check current RLS policies on quiz_questions table
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

-- 2. Test if a student can access quiz questions
-- Replace 'STUDENT_ID' with the actual student's user ID
-- Replace 'QUIZ_ID' with the actual quiz ID

-- First, check if the student is enrolled
SELECT 
  e.student_id,
  e.course_id,
  e.status as enrollment_status,
  c.title as course_title
FROM public.enrollments e
JOIN public.courses c ON e.course_id = c.id
WHERE e.student_id = 'STUDENT_ID'  -- Replace with actual student ID
AND e.status = 'approved';

-- Check if the quiz exists and is published
SELECT 
  q.id as quiz_id,
  q.title as quiz_title,
  q.status as quiz_status,
  q.course_id,
  c.title as course_title
FROM public.quizzes q
JOIN public.courses c ON q.course_id = c.id
WHERE q.id = 'QUIZ_ID'  -- Replace with actual quiz ID
AND q.status IN ('published', 'closed');

-- Test the RLS policy by trying to select quiz questions
-- This should work if the student is properly enrolled
SELECT 
  qq.id as question_id,
  qq.quiz_id,
  qq.question,
  qq.type,
  qq.points
FROM public.quiz_questions qq
WHERE qq.quiz_id = 'QUIZ_ID'  -- Replace with actual quiz ID
ORDER BY qq.order_index;
