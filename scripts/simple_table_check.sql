-- Simple check for quiz_question_grades table
-- Run this first to get basic information

-- 1. Check if table exists
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name = 'quiz_question_grades' 
AND table_schema = 'public';

-- 2. Count records in table
SELECT COUNT(*) as total_records FROM public.quiz_question_grades;

-- 3. Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'quiz_question_grades' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'quiz_question_grades' 
AND schemaname = 'public';

-- 5. Check RLS policies
SELECT 
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'quiz_question_grades';
























