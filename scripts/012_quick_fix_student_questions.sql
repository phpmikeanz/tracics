-- Quick fix to check and resolve student quiz questions issue
-- Run these queries to identify the problem

-- 1. Check all quizzes and their question counts
SELECT 
  q.id as quiz_id,
  q.title as quiz_title,
  q.status as quiz_status,
  q.course_id,
  c.title as course_title,
  COUNT(qq.id) as question_count
FROM public.quizzes q
LEFT JOIN public.quiz_questions qq ON q.id = qq.quiz_id
LEFT JOIN public.courses c ON q.course_id = c.id
WHERE q.title = 'test'  -- Replace with your quiz title
GROUP BY q.id, q.title, q.status, q.course_id, c.title
ORDER BY q.created_at DESC;

-- 2. Check specific quiz questions
SELECT 
  qq.id as question_id,
  qq.quiz_id,
  qq.question,
  qq.type,
  qq.points,
  qq.order_index,
  qq.created_at
FROM public.quiz_questions qq
JOIN public.quizzes q ON qq.quiz_id = q.id
WHERE q.title = 'test'  -- Replace with your quiz title
ORDER BY qq.order_index;

-- 3. Check if there are any RLS policy issues
-- This will show if the current user can see the questions
SELECT 
  qq.id,
  qq.quiz_id,
  qq.question,
  qq.type
FROM public.quiz_questions qq
JOIN public.quizzes q ON qq.quiz_id = q.id
WHERE q.title = 'test'  -- Replace with your quiz title
LIMIT 5;
