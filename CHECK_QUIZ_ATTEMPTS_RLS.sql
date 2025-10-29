-- Check RLS policies for quiz_attempts table
-- This will help identify if RLS policies are blocking manual grading updates

-- 1. Check current RLS policies for quiz_attempts
SELECT 
  'Current RLS policies for quiz_attempts' as info,
  policyname,
  cmd,
  permissive,
  qual
FROM pg_policies 
WHERE tablename = 'quiz_attempts'
ORDER BY policyname;

-- 2. Check if RLS is enabled
SELECT 
  'RLS status for quiz_attempts' as info,
  relname as table_name,
  relrowsecurity as rls_enabled
FROM pg_class 
WHERE relname = 'quiz_attempts';

-- 3. Test if we can update quiz_attempts (this should work with service key)
SELECT 
  'Testing quiz_attempts update access' as test_type,
  COUNT(*) as total_attempts
FROM public.quiz_attempts;

-- 4. Check if there are any constraints or triggers
SELECT 
  'Constraints on quiz_attempts' as info,
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'public.quiz_attempts'::regclass;

-- 5. Check if there are any triggers
SELECT 
  'Triggers on quiz_attempts' as info,
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'quiz_attempts';

