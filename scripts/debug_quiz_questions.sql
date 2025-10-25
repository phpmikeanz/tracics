-- Debug script to check why quiz questions are not loading for students
-- Replace the quiz_id with the actual quiz ID from the error

-- Set the quiz ID from the error message
-- Quiz ID: c9be9b0f-6f4d-497e-b150-c421109d3efa

-- 1. Check if the quiz exists and get its details
SELECT 
  q.id,
  q.title,
  q.status,
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
  qq.id,
  qq.question,
  qq.type,
  qq.points,
  qq.order_index,
  qq.created_at
FROM public.quiz_questions qq
WHERE qq.quiz_id = 'c9be9b0f-6f4d-497e-b150-c421109d3efa'
ORDER BY qq.order_index;

-- 3. Check enrollments for this course
SELECT 
  e.id,
  e.student_id,
  e.status,
  e.created_at,
  p.full_name as student_name,
  p.email as student_email
FROM public.enrollments e
JOIN public.profiles p ON e.student_id = p.id
WHERE e.course_id = (
  SELECT course_id 
  FROM public.quizzes 
  WHERE id = 'c9be9b0f-6f4d-497e-b150-c421109d3efa'
)
ORDER BY e.created_at;

-- 4. Check if there are any quiz attempts for this quiz
SELECT 
  qa.id,
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

-- 5. Test the RLS policy by checking what a student would see
-- Replace 'STUDENT_USER_ID' with an actual student ID who should have access
-- This simulates what the RLS policy would return
SELECT 
  qq.id,
  qq.question,
  qq.type,
  qq.points
FROM public.quiz_questions qq
WHERE qq.quiz_id = 'c9be9b0f-6f4d-497e-b150-c421109d3efa'
AND (
  -- Check if student is enrolled and approved
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.enrollments e ON q.course_id = e.course_id 
    WHERE q.id = qq.quiz_id 
    AND e.student_id = 'STUDENT_USER_ID' 
    AND e.status = 'approved'
  )
  OR
  -- Check if user is the instructor
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE q.id = qq.quiz_id 
    AND c.instructor_id = 'STUDENT_USER_ID'
  )
)
ORDER BY qq.order_index;
