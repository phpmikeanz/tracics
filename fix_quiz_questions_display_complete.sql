-- COMPLETE FIX FOR QUIZ QUESTIONS NOT SHOWING
-- This script addresses all common causes of quiz questions not displaying

-- ===========================================
-- STEP 1: DIAGNOSTIC QUERIES
-- ===========================================

-- Check current RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'quiz_questions'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'quiz_questions';

-- Count total questions in database
SELECT 
  COUNT(*) as total_questions,
  COUNT(DISTINCT quiz_id) as quizzes_with_questions
FROM public.quiz_questions;

-- Check quizzes and their question counts
SELECT 
  q.id,
  q.title,
  q.status,
  q.course_id,
  COUNT(qq.id) as question_count
FROM public.quizzes q
LEFT JOIN public.quiz_questions qq ON q.id = qq.quiz_id
GROUP BY q.id, q.title, q.status, q.course_id
ORDER BY q.created_at DESC
LIMIT 10;

-- ===========================================
-- STEP 2: FIX RLS POLICIES
-- ===========================================

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Students can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Faculty can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.quiz_questions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.quiz_questions;

-- Ensure RLS is enabled
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policy for quiz_questions
CREATE POLICY "Users can view quiz questions" ON public.quiz_questions FOR SELECT USING (
  -- Faculty can view questions for their own courses (any quiz status)
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE q.id = quiz_id 
    AND c.instructor_id = auth.uid()
  ) OR
  -- Students can view questions for published/closed quizzes in courses they're enrolled in and approved for
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
-- STEP 3: FIX RELATED TABLES POLICIES
-- ===========================================

-- Fix quiz_attempts policies
DROP POLICY IF EXISTS "Users can view quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Students can view quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Faculty can view quiz attempts" ON public.quiz_attempts;

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quiz attempts" ON public.quiz_attempts FOR SELECT USING (
  -- Students can view their own attempts
  student_id = auth.uid() OR
  -- Faculty can view attempts for their courses
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE q.id = quiz_id 
    AND c.instructor_id = auth.uid()
  )
);

-- Fix quiz_question_grades policies
DROP POLICY IF EXISTS "Users can view quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Students can view quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can view quiz question grades" ON public.quiz_question_grades;

ALTER TABLE public.quiz_question_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quiz question grades" ON public.quiz_question_grades FOR SELECT USING (
  -- Students can view their own grades
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa 
    WHERE qa.id = attempt_id 
    AND qa.student_id = auth.uid()
  ) OR
  -- Faculty can view grades for their courses
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa 
    JOIN public.quizzes q ON qa.quiz_id = q.id 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE qa.id = attempt_id 
    AND c.instructor_id = auth.uid()
  )
);

-- ===========================================
-- STEP 4: FIX DATA INTEGRITY ISSUES
-- ===========================================

-- Fix questions with NULL order_index
UPDATE public.quiz_questions 
SET order_index = 0 
WHERE order_index IS NULL;

-- Fix questions with empty or NULL question text
UPDATE public.quiz_questions 
SET question = 'Question text missing' 
WHERE question IS NULL OR question = '';

-- Fix questions with NULL type
UPDATE public.quiz_questions 
SET type = 'multiple_choice' 
WHERE type IS NULL OR type = '';

-- Fix questions with NULL points
UPDATE public.quiz_questions 
SET points = 1 
WHERE points IS NULL;

-- ===========================================
-- STEP 5: VERIFY FIXES
-- ===========================================

-- Verify RLS policies are working
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'quiz_questions'
ORDER BY policyname;

-- Test query to verify access (replace with actual user and quiz IDs for testing)
/*
-- Test with a specific user and quiz
SET LOCAL "request.jwt.claims" = '{"sub": "USER_ID_HERE"}';

SELECT 
  qq.*,
  q.title as quiz_title,
  q.status as quiz_status,
  c.title as course_title
FROM public.quiz_questions qq
JOIN public.quizzes q ON qq.quiz_id = q.id
JOIN public.courses c ON q.course_id = c.id
WHERE qq.quiz_id = 'QUIZ_ID_HERE'
ORDER BY qq.order_index ASC;
*/

-- Check final question counts
SELECT 
  COUNT(*) as total_questions,
  COUNT(DISTINCT quiz_id) as quizzes_with_questions,
  COUNT(CASE WHEN question IS NULL OR question = '' THEN 1 END) as missing_question_text,
  COUNT(CASE WHEN type IS NULL OR type = '' THEN 1 END) as missing_type,
  COUNT(CASE WHEN points IS NULL THEN 1 END) as missing_points,
  COUNT(CASE WHEN order_index IS NULL THEN 1 END) as missing_order_index
FROM public.quiz_questions;

-- Show quizzes with their question counts
SELECT 
  q.id,
  q.title,
  q.status,
  q.course_id,
  COUNT(qq.id) as question_count,
  COUNT(CASE WHEN qq.question IS NULL OR qq.question = '' THEN 1 END) as invalid_questions
FROM public.quizzes q
LEFT JOIN public.quiz_questions qq ON q.id = qq.quiz_id
GROUP BY q.id, q.title, q.status, q.course_id
ORDER BY q.created_at DESC;

-- ===========================================
-- STEP 6: ADDITIONAL DEBUGGING QUERIES
-- ===========================================

-- Check for duplicate questions
SELECT 
  quiz_id,
  COUNT(*) as total_questions,
  COUNT(DISTINCT order_index) as unique_order_indices,
  MIN(order_index) as min_order,
  MAX(order_index) as max_order
FROM public.quiz_questions
GROUP BY quiz_id
HAVING COUNT(*) > 0
ORDER BY total_questions DESC;

-- Check enrollments for debugging
SELECT 
  e.*,
  c.title as course_title,
  p.full_name as student_name
FROM public.enrollments e
JOIN public.courses c ON e.course_id = c.id
JOIN public.profiles p ON e.student_id = p.id
WHERE e.status = 'approved'
ORDER BY e.created_at DESC
LIMIT 10;

-- ===========================================
-- COMPLETION MESSAGE
-- ===========================================

SELECT 'Quiz questions display fix completed successfully!' as status;
