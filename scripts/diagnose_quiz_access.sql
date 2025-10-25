-- Comprehensive diagnosis for quiz access issues
-- Quiz ID: c9be9b0f-6f4d-497e-b150-c421109d3efa

-- 1. Check if the quiz exists and get its details
SELECT 
  q.id as quiz_id,
  q.title as quiz_title,
  q.status as quiz_status,
  q.course_id,
  c.title as course_title,
  c.instructor_id,
  p.full_name as instructor_name
FROM public.quizzes q
JOIN public.courses c ON q.course_id = c.id
JOIN public.profiles p ON c.instructor_id = p.id
WHERE q.id = 'c9be9b0f-6f4d-497e-b150-c421109d3efa';

-- 2. Check if there are any questions for this quiz
SELECT 
  COUNT(*) as question_count,
  CASE 
    WHEN COUNT(*) = 0 THEN 'NO QUESTIONS - This is the main issue!'
    ELSE 'Questions exist'
  END as status
FROM public.quiz_questions qq
WHERE qq.quiz_id = 'c9be9b0f-6f4d-497e-b150-c421109d3efa';

-- 3. Show all questions for this quiz (if any exist)
SELECT 
  qq.id,
  qq.question,
  qq.type,
  qq.points,
  qq.order_index,
  qq.created_at
FROM public.quiz_questions qq
WHERE qq.quiz_id = 'c9be9b0f-6f4d-497e-b150-c421109d3efa'
ORDER BY qq.order_index;

-- 4. Check all enrollments for this course
SELECT 
  e.id as enrollment_id,
  e.student_id,
  e.status,
  e.created_at,
  p.full_name as student_name,
  p.email as student_email,
  p.role
FROM public.enrollments e
JOIN public.profiles p ON e.student_id = p.id
WHERE e.course_id = (
  SELECT course_id 
  FROM public.quizzes 
  WHERE id = 'c9be9b0f-6f4d-497e-b150-c421109d3efa'
)
ORDER BY e.created_at;

-- 5. Check if there are any quiz attempts for this quiz
SELECT 
  qa.id as attempt_id,
  qa.student_id,
  qa.status,
  qa.score,
  qa.created_at,
  qa.completed_at,
  p.full_name as student_name
FROM public.quiz_attempts qa
JOIN public.profiles p ON qa.student_id = p.id
WHERE qa.quiz_id = 'c9be9b0f-6f4d-497e-b150-c421109d3efa'
ORDER BY qa.created_at;

-- 6. Check all students in the system (to see who might need to be enrolled)
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.created_at
FROM public.profiles p
WHERE p.role = 'student'
ORDER BY p.created_at;

-- 7. Check all courses to see the course structure
SELECT 
  c.id,
  c.title,
  c.course_code,
  c.instructor_id,
  p.full_name as instructor_name,
  COUNT(e.id) as enrollment_count
FROM public.courses c
JOIN public.profiles p ON c.instructor_id = p.id
LEFT JOIN public.enrollments e ON c.id = e.course_id
GROUP BY c.id, c.title, c.course_code, c.instructor_id, p.full_name
ORDER BY c.created_at;
