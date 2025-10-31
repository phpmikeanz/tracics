-- Test script specifically for essay and short answer grading issues
-- This script helps identify why faculty cannot grade essay and short answer questions

-- 1. Check if the quiz_question_grades table exists and is accessible
SELECT 
  COUNT(*) as total_grades,
  COUNT(DISTINCT attempt_id) as unique_attempts,
  COUNT(DISTINCT question_id) as unique_questions
FROM public.quiz_question_grades;

-- 2. Check RLS policies on quiz_question_grades table
SELECT 
  policyname,
  cmd,
  permissive,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'quiz_question_grades'
ORDER BY policyname;

-- 3. Check if there are any essay/short answer questions in the system
SELECT 
  qq.id as question_id,
  qq.quiz_id,
  qq.question,
  qq.type,
  qq.points,
  qq.order_index,
  q.title as quiz_title,
  c.title as course_title,
  p.full_name as instructor_name
FROM public.quiz_questions qq
JOIN public.quizzes q ON qq.quiz_id = q.id
JOIN public.courses c ON q.course_id = c.id
JOIN public.profiles p ON c.instructor_id = p.id
WHERE qq.type IN ('short_answer', 'essay')
ORDER BY qq.created_at DESC
LIMIT 10;

-- 4. Check quiz attempts that have essay/short answer questions
SELECT 
  qa.id as attempt_id,
  qa.quiz_id,
  qa.student_id,
  qa.status,
  qa.completed_at,
  qa.answers,
  q.title as quiz_title,
  p.full_name as student_name,
  COUNT(qq.id) as essay_short_answer_questions
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.profiles p ON qa.student_id = p.id
JOIN public.quiz_questions qq ON q.id = qq.quiz_id AND qq.type IN ('short_answer', 'essay')
WHERE qa.status = 'completed'
GROUP BY qa.id, qa.quiz_id, qa.student_id, qa.status, qa.completed_at, qa.answers, q.title, p.full_name
ORDER BY qa.completed_at DESC
LIMIT 5;

-- 5. Check if there are any existing grades for essay/short answer questions
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
  qq.points as max_points,
  p.full_name as grader_name
FROM public.quiz_question_grades qqg
JOIN public.quiz_questions qq ON qqg.question_id = qq.id
LEFT JOIN public.profiles p ON qqg.graded_by = p.id
WHERE qq.type IN ('short_answer', 'essay')
ORDER BY qqg.graded_at DESC
LIMIT 10;

-- 6. Test RLS policy by checking if current user can access grades
-- This will show if RLS is blocking access
SELECT 
  'Testing RLS access' as test_type,
  COUNT(*) as accessible_grades
FROM public.quiz_question_grades;

-- 7. Check if there are any constraints or triggers that might be affecting inserts
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'quiz_question_grades'
AND tc.table_schema = 'public';

-- 8. Check if the table has the correct structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'quiz_question_grades' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 9. Check if there are any recent quiz attempts that need grading
SELECT 
  qa.id as attempt_id,
  qa.quiz_id,
  qa.student_id,
  qa.status,
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
WHERE qa.status = 'completed'
AND qa.completed_at IS NOT NULL
GROUP BY qa.id, qa.quiz_id, qa.student_id, qa.status, qa.completed_at, q.title, p.full_name
HAVING COUNT(qq.id) > 0
ORDER BY qa.completed_at DESC
LIMIT 10;

-- 10. Test inserting a manual grade (uncomment and modify to test)
-- Replace the IDs with actual values from your system
/*
-- First, get some actual IDs to test with
SELECT 
  qa.id as attempt_id,
  qq.id as question_id,
  qa.student_id,
  qq.type,
  qq.question
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.quiz_questions qq ON q.id = qq.quiz_id
WHERE qq.type IN ('short_answer', 'essay')
AND qa.status = 'completed'
LIMIT 1;

-- Then test inserting a grade (replace with actual IDs from above query)
INSERT INTO public.quiz_question_grades (
  attempt_id,
  question_id,
  points_awarded,
  feedback,
  graded_by
) VALUES (
  'REPLACE_WITH_ACTUAL_ATTEMPT_ID',
  'REPLACE_WITH_ACTUAL_QUESTION_ID',
  5,
  'Test feedback for debugging',
  'REPLACE_WITH_ACTUAL_USER_ID'
) ON CONFLICT (attempt_id, question_id) DO UPDATE SET
  points_awarded = EXCLUDED.points_awarded,
  feedback = EXCLUDED.feedback,
  graded_by = EXCLUDED.graded_by,
  graded_at = NOW();

-- Check if the grade was inserted
SELECT * FROM public.quiz_question_grades 
WHERE attempt_id = 'REPLACE_WITH_ACTUAL_ATTEMPT_ID';
*/






























