-- Fix the "test sql" quiz that shows "No Questions Available"
-- Quiz ID: 86de9180-fbd1-47bb-bfc4-1faf2013cee6

-- 1. Check if the quiz exists and its details
SELECT 
  q.id as quiz_id,
  q.title as quiz_title,
  q.status as quiz_status,
  q.course_id,
  c.title as course_title
FROM public.quizzes q
LEFT JOIN public.courses c ON q.course_id = c.id
WHERE q.id = '86de9180-fbd1-47bb-bfc4-1faf2013cee6';

-- 2. Check if there are any questions for this quiz
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
WHERE qq.quiz_id = '86de9180-fbd1-47bb-bfc4-1faf2013cee6'
ORDER BY qq.order_index;

-- 3. Check if there are any questions with NULL or invalid correct_answer
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
WHERE qq.quiz_id = '86de9180-fbd1-47bb-bfc4-1faf2013cee6'
ORDER BY qq.order_index;

-- 4. Check RLS policies on quiz_questions table
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'quiz_questions';

-- 5. Test direct access to quiz questions (run as the current user)
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
WHERE quiz_id = '86de9180-fbd1-47bb-bfc4-1faf2013cee6'
ORDER BY order_index;

-- 6. Check if there are any questions in the database at all
SELECT 
  COUNT(*) as total_questions,
  COUNT(CASE WHEN quiz_id = '86de9180-fbd1-47bb-bfc4-1faf2013cee6' THEN 1 END) as questions_for_this_quiz
FROM public.quiz_questions;

-- 7. Check quiz attempts for this quiz
SELECT 
  qa.id as attempt_id,
  qa.quiz_id,
  qa.student_id,
  qa.status,
  qa.score,
  qa.completed_at,
  p.full_name as student_name
FROM public.quiz_attempts qa
JOIN public.profiles p ON qa.student_id = p.id
WHERE qa.quiz_id = '86de9180-fbd1-47bb-bfc4-1faf2013cee6'
ORDER BY qa.completed_at DESC;






























