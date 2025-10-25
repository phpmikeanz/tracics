-- Debug quiz question loading for specific quiz
-- Quiz ID: c9be9b0f-6f4d-497e-b150-c421109d3efa

-- 1. Check the exact enrollment status
SELECT 
  e.id as enrollment_id,
  e.student_id,
  e.status,
  e.created_at,
  p.full_name as student_name,
  p.email as student_email,
  CASE 
    WHEN e.status = 'approved' THEN '✅ APPROVED'
    WHEN e.status = 'pending' THEN '⏳ PENDING'
    WHEN e.status = 'declined' THEN '❌ DECLINED'
    ELSE '❓ UNKNOWN'
  END as status_icon
FROM public.enrollments e
JOIN public.profiles p ON e.student_id = p.id
WHERE e.course_id = (
  SELECT course_id 
  FROM public.quizzes 
  WHERE id = 'c9be9b0f-6f4d-497e-b150-c421109d3efa'
)
ORDER BY e.created_at;

-- 2. Test the RLS policy for quiz questions (simulate what a student would see)
-- Replace 'STUDENT_USER_ID_HERE' with an actual student UUID from the query above
SELECT 
  qq.id,
  qq.question,
  qq.type,
  qq.points,
  qq.order_index,
  'Should be visible to student' as access_status
FROM public.quiz_questions qq
WHERE qq.quiz_id = 'c9be9b0f-6f4d-497e-b150-c421109d3efa'
AND (
  -- Check if student is enrolled and approved (RLS policy simulation)
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.enrollments e ON q.course_id = e.course_id 
    WHERE q.id = qq.quiz_id 
    AND e.student_id = 'STUDENT_USER_ID_HERE'  -- Replace with actual student UUID
    AND e.status = 'approved'
  )
  OR
  -- Check if user is the instructor
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE q.id = qq.quiz_id 
    AND c.instructor_id = 'STUDENT_USER_ID_HERE'  -- Replace with actual student UUID
  )
)
ORDER BY qq.order_index;

-- 3. Check if there are any quiz attempts for this quiz
SELECT 
  qa.id as attempt_id,
  qa.student_id,
  qa.status,
  qa.score,
  qa.created_at,
  qa.completed_at,
  p.full_name as student_name,
  CASE 
    WHEN qa.status = 'in_progress' THEN '🔄 In Progress'
    WHEN qa.status = 'completed' THEN '✅ Completed'
    WHEN qa.status = 'graded' THEN '📊 Graded'
    ELSE '❓ Unknown'
  END as status_icon
FROM public.quiz_attempts qa
JOIN public.profiles p ON qa.student_id = p.id
WHERE qa.quiz_id = 'c9be9b0f-6f4d-497e-b150-c421109d3efa'
ORDER BY qa.created_at;

-- 4. Check the quiz status and settings
SELECT 
  q.id,
  q.title,
  q.status as quiz_status,
  q.time_limit,
  q.max_attempts,
  q.due_date,
  c.title as course_title,
  CASE 
    WHEN q.status = 'draft' THEN '📝 Draft'
    WHEN q.status = 'published' THEN '📢 Published'
    WHEN q.status = 'closed' THEN '🔒 Closed'
    ELSE '❓ Unknown'
  END as status_icon
FROM public.quizzes q
JOIN public.courses c ON q.course_id = c.id
WHERE q.id = 'c9be9b0f-6f4d-497e-b150-c421109d3efa';

-- 5. Check all questions with their details
SELECT 
  qq.id,
  qq.question,
  qq.type,
  qq.points,
  qq.order_index,
  qq.correct_answer,
  qq.options,
  qq.created_at
FROM public.quiz_questions qq
WHERE qq.quiz_id = 'c9be9b0f-6f4d-497e-b150-c421109d3efa'
ORDER BY qq.order_index;
