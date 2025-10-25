-- Test script to verify quiz questions access for students
-- This script helps verify that the RLS policy fix works correctly

-- 1. Check current RLS policies on quiz_questions
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'quiz_questions'
ORDER BY policyname;

-- 2. Test query to see what students can access
-- This simulates what a student would see when trying to access quiz questions
SELECT 
  qq.id,
  qq.quiz_id,
  qq.question,
  qq.type,
  qq.points,
  qq.order_index,
  q.title as quiz_title,
  q.status as quiz_status,
  c.title as course_title,
  c.course_code
FROM public.quiz_questions qq
JOIN public.quizzes q ON qq.quiz_id = q.id
JOIN public.courses c ON q.course_id = c.id
WHERE q.status IN ('published', 'closed')
ORDER BY q.title, qq.order_index;

-- 3. Check enrollments to see which students are approved for which courses
SELECT 
  e.id,
  e.student_id,
  e.course_id,
  e.status as enrollment_status,
  c.title as course_title,
  c.course_code,
  p.full_name as student_name,
  p.email as student_email
FROM public.enrollments e
JOIN public.courses c ON e.course_id = c.id
JOIN public.profiles p ON e.student_id = p.id
WHERE e.status = 'approved'
ORDER BY c.title, p.full_name;

-- 4. Check which quizzes are published and have questions
SELECT 
  q.id,
  q.title,
  q.status,
  q.course_id,
  c.title as course_title,
  c.course_code,
  COUNT(qq.id) as question_count
FROM public.quizzes q
JOIN public.courses c ON q.course_id = c.id
LEFT JOIN public.quiz_questions qq ON q.id = qq.quiz_id
WHERE q.status IN ('published', 'closed')
GROUP BY q.id, q.title, q.status, q.course_id, c.title, c.course_code
ORDER BY c.title, q.title;
