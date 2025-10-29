-- DYNAMIC QUIZ QUESTIONS RLS FIX
-- This creates policies that work for ALL users and ALL quizzes dynamically

-- ===========================================
-- STEP 1: CLEAN UP EXISTING POLICIES
-- ===========================================

-- Drop all existing policies
DROP POLICY IF EXISTS "quiz_questions_select_policy" ON public.quiz_questions;
DROP POLICY IF EXISTS "Allow all authenticated users to view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Users can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Students can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Faculty can view quiz questions" ON public.quiz_questions;

-- ===========================================
-- STEP 2: CREATE COMPREHENSIVE RLS POLICIES
-- ===========================================

-- Policy 1: Faculty can view all questions for their courses
CREATE POLICY "faculty_view_quiz_questions" ON public.quiz_questions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE q.id = quiz_questions.quiz_id 
    AND c.instructor_id = auth.uid()
  )
);

-- Policy 2: Students can view questions for quizzes in courses they're enrolled in
CREATE POLICY "students_view_quiz_questions" ON public.quiz_questions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.enrollments e ON q.course_id = e.course_id 
    WHERE q.id = quiz_questions.quiz_id 
    AND e.student_id = auth.uid() 
    AND e.status = 'approved'
    AND q.status IN ('published', 'closed')
  )
);

-- Policy 3: Admin users can view all questions
CREATE POLICY "admin_view_quiz_questions" ON public.quiz_questions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- ===========================================
-- STEP 3: VERIFY POLICIES
-- ===========================================

-- Check RLS status
SELECT 
  'RLS STATUS' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'quiz_questions';

-- Check all policies
SELECT 
  'POLICIES' as check_type,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'quiz_questions'
ORDER BY policyname;

-- ===========================================
-- STEP 4: TEST ACCESS FOR DIFFERENT USER TYPES
-- ===========================================

-- Check all quizzes and their question counts
SELECT 
  'ALL QUIZZES' as check_type,
  q.id as quiz_id,
  q.title as quiz_title,
  q.status as quiz_status,
  c.title as course_title,
  c.course_code,
  c.instructor_id,
  COUNT(qq.id) as question_count
FROM public.quizzes q
JOIN public.courses c ON q.course_id = c.id
LEFT JOIN public.quiz_questions qq ON q.id = qq.quiz_id
GROUP BY q.id, q.title, q.status, c.title, c.course_code, c.instructor_id
ORDER BY c.title, q.title;

-- Check enrollments for all courses
SELECT 
  'ENROLLMENTS' as check_type,
  e.student_id,
  e.course_id,
  e.status as enrollment_status,
  p.full_name as student_name,
  p.role as student_role,
  c.title as course_title,
  c.instructor_id
FROM public.enrollments e
JOIN public.courses c ON e.course_id = c.id
JOIN public.profiles p ON e.student_id = p.id
WHERE e.status = 'approved'
ORDER BY c.title, p.full_name;

-- ===========================================
-- COMPLETION MESSAGE
-- ===========================================

SELECT 'DYNAMIC RLS POLICIES CREATED - ALL USERS CAN NOW ACCESS QUIZ QUESTIONS BASED ON THEIR ROLE!' as status;

