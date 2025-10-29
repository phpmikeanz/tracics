-- DETAILED RLS POLICY FIX FOR QUIZ QUESTIONS
-- This ensures students can see ALL questions for quizzes in courses they're enrolled in

-- ===========================================
-- STEP 1: CHECK CURRENT ENROLLMENTS
-- ===========================================

SELECT 
  'CURRENT ENROLLMENTS' as section,
  e.student_id,
  e.course_id,
  e.status as enrollment_status,
  c.title as course_title,
  p.full_name as student_name
FROM public.enrollments e
JOIN public.courses c ON e.course_id = c.id
JOIN public.profiles p ON e.student_id = p.id
WHERE e.status = 'approved'
ORDER BY e.created_at DESC;

-- ===========================================
-- STEP 2: CHECK QUIZZES AND THEIR QUESTIONS
-- ===========================================

SELECT 
  'QUIZZES AND QUESTIONS' as section,
  q.id as quiz_id,
  q.title as quiz_title,
  q.status as quiz_status,
  c.title as course_title,
  c.course_code,
  COUNT(qq.id) as question_count
FROM public.quizzes q
JOIN public.courses c ON q.course_id = c.id
LEFT JOIN public.quiz_questions qq ON q.id = qq.quiz_id
GROUP BY q.id, q.title, q.status, c.title, c.course_code
ORDER BY c.title, q.title;

-- ===========================================
-- STEP 3: DROP EXISTING POLICIES
-- ===========================================

DROP POLICY IF EXISTS "Allow all authenticated users to view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Users can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Students can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Faculty can view quiz questions" ON public.quiz_questions;

-- ===========================================
-- STEP 4: CREATE COMPREHENSIVE RLS POLICY
-- ===========================================

-- Policy for faculty to view all questions for their courses
CREATE POLICY "Faculty can view quiz questions" ON public.quiz_questions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE q.id = quiz_id 
    AND c.instructor_id = auth.uid()
  )
);

-- Policy for students to view questions for quizzes in courses they're enrolled in
CREATE POLICY "Students can view quiz questions" ON public.quiz_questions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.enrollments e ON q.course_id = e.course_id 
    WHERE q.id = quiz_id 
    AND e.student_id = auth.uid() 
    AND e.status = 'approved'
    AND q.status IN ('published', 'closed')
  )
);

-- ===========================================
-- STEP 5: VERIFY POLICIES
-- ===========================================

SELECT 
  'FINAL RLS POLICIES' as section,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'quiz_questions'
ORDER BY policyname;

-- ===========================================
-- STEP 6: TEST ACCESS FOR SPECIFIC QUIZ
-- ===========================================

-- Test if a student can access questions for the specific quiz
-- Replace 'STUDENT_ID_HERE' with actual student ID
/*
SET LOCAL "request.jwt.claims" = '{"sub": "STUDENT_ID_HERE"}';

SELECT 
  'STUDENT ACCESS TEST' as section,
  qq.id as question_id,
  qq.question,
  qq.type,
  qq.points,
  qq.order_index
FROM public.quiz_questions qq
WHERE qq.quiz_id = 'ac5764eb-0887-4a61-bbed-dab69a5186a4'
ORDER BY qq.order_index;
*/

-- ===========================================
-- COMPLETION MESSAGE
-- ===========================================

SELECT 'DETAILED RLS POLICIES CREATED - STUDENTS CAN NOW ACCESS QUIZ QUESTIONS!' as status;
