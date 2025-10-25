-- Test quiz questions access directly (RLS disabled)
-- Quiz ID: c9be9b0f-6f4d-497e-b150-c421109d3efa

-- 1. Direct query to get questions (should work with RLS disabled)
SELECT 
  qq.id,
  qq.quiz_id,
  qq.question,
  qq.type,
  qq.options,
  qq.correct_answer,
  qq.points,
  qq.order_index,
  qq.created_at
FROM public.quiz_questions qq
WHERE qq.quiz_id = 'c9be9b0f-6f4d-497e-b150-c421109d3efa'
ORDER BY qq.order_index;

-- 2. Check if the quiz exists and is accessible
SELECT 
  q.id,
  q.title,
  q.status,
  q.course_id,
  q.time_limit,
  q.max_attempts,
  q.due_date,
  q.created_at
FROM public.quizzes q
WHERE q.id = 'c9be9b0f-6f4d-497e-b150-c421109d3efa';

-- 3. Check the exact structure of questions
SELECT 
  COUNT(*) as total_questions,
  COUNT(CASE WHEN type = 'multiple_choice' THEN 1 END) as multiple_choice_count,
  COUNT(CASE WHEN type = 'true_false' THEN 1 END) as true_false_count,
  COUNT(CASE WHEN type = 'short_answer' THEN 1 END) as short_answer_count,
  COUNT(CASE WHEN type = 'essay' THEN 1 END) as essay_count,
  SUM(points) as total_points
FROM public.quiz_questions qq
WHERE qq.quiz_id = 'c9be9b0f-6f4d-497e-b150-c421109d3efa';

-- 4. Check for any data type issues
SELECT 
  qq.id,
  qq.question,
  qq.type,
  qq.points,
  qq.order_index,
  pg_typeof(qq.id) as id_type,
  pg_typeof(qq.quiz_id) as quiz_id_type,
  pg_typeof(qq.points) as points_type,
  pg_typeof(qq.order_index) as order_index_type
FROM public.quiz_questions qq
WHERE qq.quiz_id = 'c9be9b0f-6f4d-497e-b150-c421109d3efa'
ORDER BY qq.order_index
LIMIT 5;
