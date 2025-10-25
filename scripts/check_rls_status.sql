-- Check RLS Status and Policies
-- This script helps you verify your current RLS configuration

-- 1. Check if RLS is enabled on tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('quiz_attempts', 'quiz_questions', 'quiz_question_grades', 'quizzes')
ORDER BY tablename;

-- 2. Check all RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('quiz_attempts', 'quiz_questions', 'quiz_question_grades', 'quizzes')
ORDER BY tablename, policyname;

-- 3. Check specific policies for quiz_attempts
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN '👁️ View'
    WHEN cmd = 'INSERT' THEN '➕ Create'
    WHEN cmd = 'UPDATE' THEN '✏️ Update'
    WHEN cmd = 'DELETE' THEN '🗑️ Delete'
    WHEN cmd = 'ALL' THEN '🔧 All Operations'
    ELSE cmd
  END as operation_type,
  qual
FROM pg_policies 
WHERE tablename = 'quiz_attempts'
ORDER BY policyname;

-- 4. Check specific policies for quiz_questions
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN '👁️ View'
    WHEN cmd = 'INSERT' THEN '➕ Create'
    WHEN cmd = 'UPDATE' THEN '✏️ Update'
    WHEN cmd = 'DELETE' THEN '🗑️ Delete'
    WHEN cmd = 'ALL' THEN '🔧 All Operations'
    ELSE cmd
  END as operation_type,
  qual
FROM pg_policies 
WHERE tablename = 'quiz_questions'
ORDER BY policyname;

-- 5. Check user authentication and roles
SELECT 
  'Current User Info' as info_type,
  auth.uid() as user_id,
  p.email,
  p.full_name,
  p.role
FROM public.profiles p
WHERE p.id = auth.uid();

-- 6. Test permissions (this will show what the current user can access)
SELECT 
  'Quiz Attempts Access Test' as test_type,
  COUNT(*) as accessible_attempts
FROM public.quiz_attempts;

SELECT 
  'Quiz Questions Access Test' as test_type,
  COUNT(*) as accessible_questions
FROM public.quiz_questions;

-- 7. Check for missing policies (tables that need RLS policies)
SELECT 
  t.tablename,
  CASE 
    WHEN COUNT(p.policyname) = 0 THEN '❌ NO POLICIES'
    WHEN COUNT(p.policyname) < 4 THEN '⚠️ INCOMPLETE POLICIES'
    ELSE '✅ HAS POLICIES'
  END as policy_status,
  COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
AND t.tablename IN ('quiz_attempts', 'quiz_questions', 'quiz_question_grades', 'quizzes')
GROUP BY t.tablename
ORDER BY t.tablename;
