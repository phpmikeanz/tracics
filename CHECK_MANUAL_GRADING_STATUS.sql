-- Check manual grading system status
-- This will help identify why grades aren't updating the database

-- 1. Check RLS policies for quiz_question_grades
SELECT 
  'RLS policies for quiz_question_grades' as info,
  policyname,
  cmd,
  permissive,
  qual
FROM pg_policies 
WHERE tablename = 'quiz_question_grades'
ORDER BY policyname;

-- 2. Check RLS policies for quiz_attempts
SELECT 
  'RLS policies for quiz_attempts' as info,
  policyname,
  cmd,
  permissive,
  qual
FROM pg_policies 
WHERE tablename = 'quiz_attempts'
ORDER BY policyname;

-- 3. Check if RLS is enabled on both tables
SELECT 
  'RLS status' as info,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('quiz_question_grades', 'quiz_attempts')
ORDER BY tablename;

-- 4. Check current manual grades
SELECT 
  'Current manual grades' as info,
  COUNT(*) as total_grades,
  COUNT(DISTINCT attempt_id) as unique_attempts,
  AVG(points_awarded) as avg_points
FROM public.quiz_question_grades;

-- 5. Check quiz attempts with their scores
SELECT 
  'Quiz attempts status' as info,
  status,
  COUNT(*) as count,
  AVG(score) as avg_score
FROM public.quiz_attempts
GROUP BY status
ORDER BY status;

-- 6. Check if there are any attempts with manual grades but wrong scores
SELECT 
  'Attempts with manual grades' as info,
  qa.id as attempt_id,
  qa.score as current_score,
  qa.status,
  COUNT(qqg.id) as manual_grades_count,
  SUM(qqg.points_awarded) as manual_points_total
FROM public.quiz_attempts qa
LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id
WHERE qqg.id IS NOT NULL
GROUP BY qa.id, qa.score, qa.status
ORDER BY qa.id
LIMIT 10;

-- 7. Test if we can insert a test grade (this will show if RLS is blocking)
-- Note: This will only work if you're authenticated as a faculty user
SELECT 
  'Testing grade insertion permissions' as test_type,
  'This test requires faculty authentication' as note;

