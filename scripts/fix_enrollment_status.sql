-- Fix enrollment status for students to access quiz questions
-- Replace the quiz ID and student ID with actual values

-- First, let's find the course ID for the quiz
SELECT 
  q.id as quiz_id,
  q.title as quiz_title,
  q.course_id,
  c.title as course_title
FROM public.quizzes q
JOIN public.courses c ON q.course_id = c.id
WHERE q.id = 'c9be9b0f-6f4d-497e-b150-c421109d3efa';

-- Check current enrollments for this course
SELECT 
  e.id as enrollment_id,
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

-- Option 1: Approve ALL pending enrollments for this course
UPDATE public.enrollments 
SET status = 'approved' 
WHERE course_id = (
  SELECT course_id 
  FROM public.quizzes 
  WHERE id = 'c9be9b0f-6f4d-497e-b150-c421109d3efa'
)
AND status = 'pending';

-- Option 2: Approve a specific student (replace with actual student UUID)
-- UPDATE public.enrollments 
-- SET status = 'approved' 
-- WHERE course_id = (
--   SELECT course_id 
--   FROM public.quizzes 
--   WHERE id = 'c9be9b0f-6f4d-497e-b150-c421109d3efa'
-- )
-- AND student_id = 'ACTUAL_STUDENT_UUID_HERE';

-- Verify the update worked
SELECT 
  e.id as enrollment_id,
  e.student_id,
  e.status,
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

-- Check if there are any questions for this quiz
SELECT 
  qq.id,
  qq.question,
  qq.type,
  qq.points,
  qq.order_index
FROM public.quiz_questions qq
WHERE qq.quiz_id = 'c9be9b0f-6f4d-497e-b150-c421109d3efa'
ORDER BY qq.order_index;
