-- Check quiz questions with mixed question types
-- This script helps diagnose why mixed question types show "No Questions Available"

-- 1. Check all quizzes and their question counts by type
SELECT 
  q.id as quiz_id,
  q.title as quiz_title,
  q.status as quiz_status,
  COUNT(qq.id) as total_questions,
  COUNT(CASE WHEN qq.type = 'multiple_choice' THEN 1 END) as multiple_choice_count,
  COUNT(CASE WHEN qq.type = 'true_false' THEN 1 END) as true_false_count,
  COUNT(CASE WHEN qq.type = 'short_answer' THEN 1 END) as short_answer_count,
  COUNT(CASE WHEN qq.type = 'essay' THEN 1 END) as essay_count
FROM public.quizzes q
LEFT JOIN public.quiz_questions qq ON q.id = qq.quiz_id
GROUP BY q.id, q.title, q.status
ORDER BY q.created_at DESC;

-- 2. Check specific quiz questions with all details
-- Replace 'YOUR_QUIZ_ID' with the actual quiz ID that has mixed question types
/*
SELECT 
  qq.id as question_id,
  qq.quiz_id,
  qq.question,
  qq.type,
  qq.points,
  qq.correct_answer,
  qq.options,
  qq.order_index,
  qq.created_at
FROM public.quiz_questions qq
WHERE qq.quiz_id = 'YOUR_QUIZ_ID'
ORDER BY qq.order_index;
*/

-- 3. Check for any questions with NULL or invalid correct_answer
SELECT 
  qq.id as question_id,
  qq.quiz_id,
  qq.question,
  qq.type,
  qq.correct_answer,
  qq.options,
  CASE 
    WHEN qq.correct_answer IS NULL THEN 'NULL correct_answer'
    WHEN qq.correct_answer = '' THEN 'EMPTY correct_answer'
    WHEN qq.type IN ('multiple_choice', 'true_false') AND qq.correct_answer IS NULL THEN 'MISSING correct_answer for auto-graded question'
    WHEN qq.type IN ('essay', 'short_answer') AND qq.correct_answer IS NOT NULL THEN 'HAS correct_answer for manual-graded question'
    ELSE 'OK'
  END as correct_answer_status
FROM public.quiz_questions qq
WHERE qq.correct_answer IS NULL 
   OR qq.correct_answer = ''
   OR (qq.type IN ('multiple_choice', 'true_false') AND qq.correct_answer IS NULL)
ORDER BY qq.quiz_id, qq.order_index;

-- 4. Check quiz attempts and their status
SELECT 
  qa.id as attempt_id,
  qa.quiz_id,
  qa.student_id,
  qa.status,
  qa.score,
  qa.completed_at,
  q.title as quiz_title,
  p.full_name as student_name
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.profiles p ON qa.student_id = p.id
WHERE qa.status IN ('in_progress', 'completed', 'graded')
ORDER BY qa.completed_at DESC
LIMIT 10;

-- 5. Check if there are any RLS policy issues
-- This will show if RLS is enabled on quiz_questions table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'quiz_questions';

-- 6. Check RLS policies on quiz_questions table
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'quiz_questions';

-- 7. Test direct access to quiz questions (run as the current user)
-- Replace 'YOUR_QUIZ_ID' with the actual quiz ID
/*
SELECT 
  id,
  quiz_id,
  question,
  type,
  points,
  correct_answer,
  options,
  order_index
FROM public.quiz_questions 
WHERE quiz_id = 'YOUR_QUIZ_ID'
ORDER BY order_index;
*/




























