-- Debug script to check student quiz access issues
-- Replace 'STUDENT_ID' with the actual student's user ID

-- 1. Check if student is enrolled in any courses
SELECT 
  e.id as enrollment_id,
  e.student_id,
  e.course_id,
  e.status as enrollment_status,
  c.title as course_title,
  c.course_code
FROM public.enrollments e
JOIN public.courses c ON e.course_id = c.id
WHERE e.student_id = 'STUDENT_ID'  -- Replace with actual student ID
ORDER BY e.created_at DESC;

-- 2. Check quizzes in enrolled courses
SELECT 
  q.id as quiz_id,
  q.title as quiz_title,
  q.status as quiz_status,
  q.course_id,
  c.title as course_title,
  c.course_code
FROM public.quizzes q
JOIN public.courses c ON q.course_id = c.id
JOIN public.enrollments e ON q.course_id = e.course_id
WHERE e.student_id = 'STUDENT_ID'  -- Replace with actual student ID
AND e.status = 'approved'
ORDER BY q.created_at DESC;

-- 3. Check quiz questions for a specific quiz
-- Replace 'QUIZ_ID' with the actual quiz ID
SELECT 
  qq.id as question_id,
  qq.quiz_id,
  qq.question,
  qq.type,
  qq.points,
  qq.order_index
FROM public.quiz_questions qq
WHERE qq.quiz_id = 'QUIZ_ID'  -- Replace with actual quiz ID
ORDER BY qq.order_index;

-- 4. Check all quizzes and their question counts
SELECT 
  q.id as quiz_id,
  q.title as quiz_title,
  q.status as quiz_status,
  COUNT(qq.id) as question_count
FROM public.quizzes q
LEFT JOIN public.quiz_questions qq ON q.id = qq.quiz_id
GROUP BY q.id, q.title, q.status
ORDER BY q.created_at DESC;
