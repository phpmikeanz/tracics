-- Test script for manual grading system
-- This script helps verify that the manual grading system is working correctly

-- 1. Check if the quiz_question_grades table exists and has the correct structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'quiz_question_grades' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check RLS policies on quiz_question_grades table
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

-- 3. Test inserting a manual grade (replace with actual IDs)
-- This is just for testing - you would normally use the application interface
/*
INSERT INTO public.quiz_question_grades (
  attempt_id,
  question_id,
  points_awarded,
  feedback,
  graded_by
) VALUES (
  'ATTEMPT_ID_HERE',  -- Replace with actual attempt ID
  'QUESTION_ID_HERE', -- Replace with actual question ID
  5,
  'Good answer!',
  'GRADER_ID_HERE'    -- Replace with actual grader ID
) ON CONFLICT (attempt_id, question_id) DO UPDATE SET
  points_awarded = EXCLUDED.points_awarded,
  feedback = EXCLUDED.feedback,
  graded_by = EXCLUDED.graded_by,
  graded_at = NOW();
*/

-- 4. Check if there are any existing manual grades
SELECT 
  qqg.id,
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
ORDER BY qqg.graded_at DESC
LIMIT 10;

-- 5. Check quiz attempts that need manual grading
SELECT 
  qa.id as attempt_id,
  qa.quiz_id,
  qa.student_id,
  qa.status,
  qa.score,
  q.title as quiz_title,
  p.full_name as student_name,
  COUNT(qq.id) as total_questions,
  COUNT(qqg.id) as graded_questions,
  COUNT(qq.id) - COUNT(qqg.id) as remaining_questions
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.profiles p ON qa.student_id = p.id
LEFT JOIN public.quiz_questions qq ON q.id = qq.quiz_id AND qq.type IN ('short_answer', 'essay')
LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id AND qq.id = qqg.question_id
WHERE qa.status = 'completed'
GROUP BY qa.id, qa.quiz_id, qa.student_id, qa.status, qa.score, q.title, p.full_name
HAVING COUNT(qq.id) > 0
ORDER BY qa.created_at DESC;

-- 6. Test the RLS policy by checking if a specific user can access grades
-- Replace 'USER_ID_HERE' with the actual user ID
/*
SELECT 
  qqg.id,
  qqg.attempt_id,
  qqg.question_id,
  qqg.points_awarded,
  qqg.feedback
FROM public.quiz_question_grades qqg
WHERE qqg.attempt_id = 'ATTEMPT_ID_HERE';
*/




























