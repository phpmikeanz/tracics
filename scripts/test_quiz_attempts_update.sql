-- Test script to verify that faculty can update quiz attempts
-- This script helps verify that the RLS policy fix works correctly

-- 1. Check current RLS policies on quiz_attempts
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'quiz_attempts'
ORDER BY policyname;

-- 2. Test query to see what faculty can access
-- This simulates what a faculty member would see when trying to update quiz attempts
SELECT 
  qa.id,
  qa.quiz_id,
  qa.student_id,
  qa.score,
  qa.status,
  q.title as quiz_title,
  c.title as course_title,
  c.instructor_id,
  p.full_name as student_name
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.courses c ON q.course_id = c.id
JOIN public.profiles p ON qa.student_id = p.id
WHERE qa.status IN ('completed', 'submitted')
ORDER BY c.title, q.title, p.full_name;

-- 3. Check which quiz attempts need manual grading
SELECT 
  qa.id,
  qa.quiz_id,
  qa.student_id,
  qa.score,
  qa.status,
  q.title as quiz_title,
  c.title as course_title,
  COUNT(qqg.id) as manual_grades_count,
  SUM(qqg.points_awarded) as total_manual_points
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.courses c ON q.course_id = c.id
LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id
WHERE qa.status IN ('completed', 'submitted')
GROUP BY qa.id, qa.quiz_id, qa.student_id, qa.score, qa.status, q.title, c.title
HAVING COUNT(qqg.id) > 0
ORDER BY c.title, q.title;

-- 4. Test update permission (this will only work if faculty has proper permissions)
-- Replace 'FACULTY_ID' and 'ATTEMPT_ID' with actual values for testing
/*
UPDATE public.quiz_attempts 
SET score = 30, status = 'graded'
WHERE id = 'ATTEMPT_ID'
AND EXISTS (
  SELECT 1 FROM public.quizzes q 
  JOIN public.courses c ON q.course_id = c.id 
  WHERE q.id = quiz_id 
  AND c.instructor_id = 'FACULTY_ID'
);
*/
