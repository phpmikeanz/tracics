-- QUICK CHECK FOR QUIZ QUESTIONS ISSUE
-- This will help us see what's happening

-- 1. Check RLS policies on quiz_questions
SELECT 
  'RLS POLICIES' as check_type,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'quiz_questions'
ORDER BY policyname;

-- 2. Check if RLS is enabled
SELECT 
  'RLS STATUS' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'quiz_questions';

-- 3. Check specific quiz questions count
SELECT 
  'QUIZ QUESTIONS COUNT' as check_type,
  q.id as quiz_id,
  q.title as quiz_title,
  q.status as quiz_status,
  c.title as course_title,
  COUNT(qq.id) as question_count
FROM public.quizzes q
JOIN public.courses c ON q.course_id = c.id
LEFT JOIN public.quiz_questions qq ON q.id = qq.quiz_id
WHERE q.id = 'ac5764eb-0887-4a61-bbed-dab69a5186a4'
GROUP BY q.id, q.title, q.status, c.title;

-- 4. Check actual questions data
SELECT 
  'QUESTIONS DATA' as check_type,
  qq.id,
  qq.question,
  qq.type,
  qq.points,
  qq.order_index,
  qq.created_at
FROM public.quiz_questions qq
WHERE qq.quiz_id = 'ac5764eb-0887-4a61-bbed-dab69a5186a4'
ORDER BY qq.order_index;

-- 5. Check enrollments for the course
SELECT 
  'ENROLLMENTS' as check_type,
  e.student_id,
  e.course_id,
  e.status as enrollment_status,
  p.full_name as student_name,
  c.title as course_title
FROM public.enrollments e
JOIN public.courses c ON e.course_id = c.id
JOIN public.profiles p ON e.student_id = p.id
WHERE c.id = '1624f5bd-1cc1-41d0-9084-4210cf266070'
AND e.status = 'approved';

