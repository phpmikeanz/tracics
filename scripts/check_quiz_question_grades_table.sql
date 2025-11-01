-- Comprehensive check of quiz_question_grades table in Supabase
-- This script will help identify why data is not being inserted

-- 1. Check if the table exists and get its structure
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

-- 2. Check if there's any data in the table
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT attempt_id) as unique_attempts,
  COUNT(DISTINCT question_id) as unique_questions,
  COUNT(DISTINCT graded_by) as unique_graders,
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record
FROM public.quiz_question_grades;

-- 3. Check RLS (Row Level Security) status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'quiz_question_grades' 
AND schemaname = 'public';

-- 4. Check RLS policies on the table
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'quiz_question_grades'
ORDER BY policyname;

-- 5. Check table constraints
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

-- 6. Check if there are any existing records (if any)
SELECT 
  id,
  attempt_id,
  question_id,
  points_awarded,
  feedback,
  graded_by,
  graded_at,
  created_at
FROM public.quiz_question_grades
ORDER BY created_at DESC
LIMIT 10;

-- 7. Check related tables to ensure foreign key references exist
-- Check quiz_attempts table
SELECT 
  COUNT(*) as total_attempts,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_attempts
FROM public.quiz_attempts;

-- Check quiz_questions table for essay/short answer questions
SELECT 
  COUNT(*) as total_questions,
  COUNT(CASE WHEN type = 'essay' THEN 1 END) as essay_questions,
  COUNT(CASE WHEN type = 'short_answer' THEN 1 END) as short_answer_questions
FROM public.quiz_questions;

-- 8. Test basic table access (this will show if RLS is blocking access)
SELECT 
  'Testing table access' as test_type,
  COUNT(*) as accessible_records
FROM public.quiz_question_grades;

-- 9. Check if there are any recent quiz attempts that should have grades
SELECT 
  qa.id as attempt_id,
  qa.quiz_id,
  qa.student_id,
  qa.status,
  qa.completed_at,
  q.title as quiz_title,
  p.full_name as student_name,
  COUNT(qq.id) as essay_short_answer_questions,
  COUNT(qqg.id) as existing_grades
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
LIMIT 5;

-- 10. Check current user permissions (if you're logged in)
-- This will show your current user ID and role
SELECT 
  'Current user info' as info_type,
  auth.uid() as current_user_id;

-- 11. Test inserting a record (uncomment to test)
-- WARNING: This will actually insert a test record
/*
-- First, get some valid IDs to test with
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

-- Then test inserting (replace with actual IDs from above query)
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
  'Test insertion for debugging',
  auth.uid()
) ON CONFLICT (attempt_id, question_id) DO UPDATE SET
  points_awarded = EXCLUDED.points_awarded,
  feedback = EXCLUDED.feedback,
  graded_by = EXCLUDED.graded_by,
  graded_at = NOW();

-- Check if the test record was inserted
SELECT * FROM public.quiz_question_grades 
WHERE attempt_id = 'REPLACE_WITH_ACTUAL_ATTEMPT_ID';
*/































