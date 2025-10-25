-- Debug script to identify why students can't access quiz questions
-- This script helps diagnose enrollment and RLS policy issues

-- Replace 'STUDENT_ID' and 'QUIZ_ID' with actual values
-- Example: SET @student_id = '12345678-1234-1234-1234-123456789012';
-- Example: SET @quiz_id = '87654321-4321-4321-4321-210987654321';

-- 1. Check if the student exists and their role
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM public.profiles 
WHERE id = auth.uid();

-- 2. Check if the quiz exists and its details
SELECT 
  q.id,
  q.title,
  q.description,
  q.status,
  q.course_id,
  c.title as course_title,
  c.course_code,
  c.instructor_id
FROM public.quizzes q
JOIN public.courses c ON q.course_id = c.id
WHERE q.id = 'QUIZ_ID'; -- Replace with actual quiz ID

-- 3. Check student's enrollment status for the course
SELECT 
  e.id,
  e.student_id,
  e.course_id,
  e.status as enrollment_status,
  e.created_at,
  c.title as course_title,
  c.course_code
FROM public.enrollments e
JOIN public.courses c ON e.course_id = c.id
WHERE e.student_id = auth.uid()
AND e.course_id = (
  SELECT course_id FROM public.quizzes WHERE id = 'QUIZ_ID'
);

-- 4. Check if quiz questions exist for the quiz
SELECT 
  qq.id,
  qq.quiz_id,
  qq.question,
  qq.type,
  qq.points,
  qq.order_index,
  qq.created_at
FROM public.quiz_questions qq
WHERE qq.quiz_id = 'QUIZ_ID'; -- Replace with actual quiz ID

-- 5. Test the RLS policy by trying to select quiz questions
-- This should show what the RLS policy allows/denies
SELECT 
  qq.id,
  qq.quiz_id,
  qq.question,
  qq.type,
  qq.points,
  qq.order_index
FROM public.quiz_questions qq
WHERE qq.quiz_id = 'QUIZ_ID'; -- Replace with actual quiz ID

-- 6. Check RLS policies on quiz_questions table
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

-- 7. Check if there are any other policies that might interfere
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('quizzes', 'courses', 'enrollments', 'quiz_questions')
ORDER BY tablename, policyname;

-- 8. Check table permissions
SELECT 
  grantee,
  table_name,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges 
WHERE table_name IN ('quizzes', 'courses', 'enrollments', 'quiz_questions')
AND grantee IN ('authenticated', 'anon', 'public')
ORDER BY table_name, grantee, privilege_type;
