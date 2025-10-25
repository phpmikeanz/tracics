-- Test quiz questions with simple ID system
-- Replace 'YOUR_QUIZ_ID' with the actual quiz ID you're using

-- 1. Check if the quiz exists with simple ID
SELECT 
  q.id,
  q.title,
  q.status,
  q.course_id,
  q.time_limit,
  q.max_attempts,
  q.due_date
FROM public.quizzes q
WHERE q.id = 'YOUR_QUIZ_ID';  -- Replace with your actual quiz ID

-- 2. Get all questions for this quiz
SELECT 
  qq.id,
  qq.quiz_id,
  qq.question,
  qq.type,
  qq.points,
  qq.order_index,
  qq.correct_answer,
  qq.options
FROM public.quiz_questions qq
WHERE qq.quiz_id = 'YOUR_QUIZ_ID'  -- Replace with your actual quiz ID
ORDER BY qq.order_index;

-- 3. Count questions
SELECT 
  COUNT(*) as total_questions,
  COUNT(CASE WHEN type = 'multiple_choice' THEN 1 END) as multiple_choice,
  COUNT(CASE WHEN type = 'true_false' THEN 1 END) as true_false,
  COUNT(CASE WHEN type = 'short_answer' THEN 1 END) as short_answer,
  COUNT(CASE WHEN type = 'essay' THEN 1 END) as essay
FROM public.quiz_questions qq
WHERE qq.quiz_id = 'YOUR_QUIZ_ID';  -- Replace with your actual quiz ID

-- 4. Check all quizzes to see the ID format
SELECT 
  q.id,
  q.title,
  q.status,
  COUNT(qq.id) as question_count
FROM public.quizzes q
LEFT JOIN public.quiz_questions qq ON q.id = qq.quiz_id
GROUP BY q.id, q.title, q.status
ORDER BY q.id;

-- 5. Check enrollments for the course
SELECT 
  e.id,
  e.student_id,
  e.status,
  p.full_name as student_name,
  p.email
FROM public.enrollments e
JOIN public.profiles p ON e.student_id = p.id
WHERE e.course_id = (
  SELECT course_id 
  FROM public.quizzes 
  WHERE id = 'YOUR_QUIZ_ID'  -- Replace with your actual quiz ID
);
