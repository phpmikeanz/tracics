-- Diagnostic script for grade persistence issues
-- This script helps identify why grades are not persisting in the manual grading system

-- 1. Check if the quiz_question_grades table exists and has data
SELECT 
  COUNT(*) as total_grades,
  COUNT(DISTINCT attempt_id) as unique_attempts,
  COUNT(DISTINCT question_id) as unique_questions,
  MIN(created_at) as earliest_grade,
  MAX(created_at) as latest_grade
FROM public.quiz_question_grades;

-- 2. Check recent quiz attempts that should have manual grades
SELECT 
  qa.id as attempt_id,
  qa.quiz_id,
  qa.student_id,
  qa.status,
  qa.score,
  qa.completed_at,
  q.title as quiz_title,
  p.full_name as student_name,
  COUNT(qq.id) as total_questions,
  COUNT(qqg.id) as graded_questions,
  COUNT(qq.id) - COUNT(qqg.id) as ungraded_questions
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.profiles p ON qa.student_id = p.id
LEFT JOIN public.quiz_questions qq ON q.id = qq.quiz_id AND qq.type IN ('short_answer', 'essay')
LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id AND qq.id = qqg.question_id
WHERE qa.status IN ('completed', 'graded')
AND qa.completed_at IS NOT NULL
GROUP BY qa.id, qa.quiz_id, qa.student_id, qa.status, qa.score, qa.completed_at, q.title, p.full_name
ORDER BY qa.completed_at DESC
LIMIT 10;

-- 3. Check specific quiz attempts with their answers and grades
-- Replace 'ATTEMPT_ID_HERE' with the actual attempt ID you're having issues with
/*
SELECT 
  qa.id as attempt_id,
  qa.quiz_id,
  qa.student_id,
  qa.answers,
  qa.status,
  qa.score,
  q.title as quiz_title
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
WHERE qa.id = 'ATTEMPT_ID_HERE';
*/

-- 4. Check questions that need grading for a specific attempt
-- Replace 'ATTEMPT_ID_HERE' with the actual attempt ID
/*
SELECT 
  qq.id as question_id,
  qq.quiz_id,
  qq.question,
  qq.type,
  qq.points,
  qq.order_index,
  qa.answers->>qq.id as student_answer
FROM public.quiz_questions qq
JOIN public.quiz_attempts qa ON qq.quiz_id = qa.quiz_id
WHERE qa.id = 'ATTEMPT_ID_HERE'
AND qq.type IN ('short_answer', 'essay')
AND qa.answers->>qq.id IS NOT NULL
ORDER BY qq.order_index;
*/

-- 5. Check existing grades for a specific attempt
-- Replace 'ATTEMPT_ID_HERE' with the actual attempt ID
/*
SELECT 
  qqg.id as grade_id,
  qqg.attempt_id,
  qqg.question_id,
  qqg.points_awarded,
  qqg.feedback,
  qqg.graded_by,
  qqg.graded_at,
  qq.question,
  qq.type,
  qq.points as max_points
FROM public.quiz_question_grades qqg
JOIN public.quiz_questions qq ON qqg.question_id = qq.id
WHERE qqg.attempt_id = 'ATTEMPT_ID_HERE'
ORDER BY qqg.graded_at DESC;
*/

-- 6. Check RLS policies on quiz_question_grades table
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
WHERE tablename = 'quiz_question_grades';

-- 7. Test RLS policy by checking if current user can access grades
-- This will show if RLS is blocking access
/*
SELECT 
  qqg.id,
  qqg.attempt_id,
  qqg.question_id,
  qqg.points_awarded,
  qqg.feedback
FROM public.quiz_question_grades qqg
LIMIT 5;
*/

-- 8. Check for any recent errors in the application logs
-- (This would need to be checked in your application logs, not in SQL)

-- 9. Verify the table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'quiz_question_grades' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 10. Check if there are any constraints or triggers that might be affecting inserts
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  tc.table_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'quiz_question_grades'
AND tc.table_schema = 'public';































