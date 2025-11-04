-- Test data insertion into quiz_question_grades table
-- This script will help test if data can be inserted

-- 1. First, find a valid attempt and question to test with
SELECT 
  qa.id as attempt_id,
  qq.id as question_id,
  qa.student_id,
  qq.type,
  qq.question,
  q.title as quiz_title
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.quiz_questions qq ON q.id = qq.quiz_id
WHERE qq.type IN ('short_answer', 'essay')
AND qa.status = 'completed'
LIMIT 3;

-- 2. Check current user (if logged in)
SELECT 
  'Current user' as info,
  auth.uid() as user_id;

-- 3. Test insertion (uncomment and modify with actual IDs)
-- Replace the IDs with actual values from query 1 above
/*
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
  auth.uid()
);
*/

-- 4. Check if any records exist after insertion
SELECT 
  COUNT(*) as total_records,
  MAX(created_at) as latest_record
FROM public.quiz_question_grades;

-- 5. Show recent records
SELECT 
  id,
  attempt_id,
  question_id,
  points_awarded,
  feedback,
  graded_by,
  created_at
FROM public.quiz_question_grades
ORDER BY created_at DESC
LIMIT 5;
































