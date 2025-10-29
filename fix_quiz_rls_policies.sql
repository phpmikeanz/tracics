-- COMPLETE QUIZ FIX - RLS POLICIES
-- This script fixes the RLS policies to allow quiz creation and access

-- ===========================================
-- STEP 1: DROP EXISTING PROBLEMATIC POLICIES
-- ===========================================

-- Drop existing policies that might be blocking access
DROP POLICY IF EXISTS "Faculty can create quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Faculty can update quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Faculty can delete quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Faculty can view quizzes" ON public.quizzes;

DROP POLICY IF EXISTS "Faculty can create quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Faculty can update quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Faculty can delete quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Faculty can view quiz questions" ON public.quiz_questions;

DROP POLICY IF EXISTS "Faculty can create enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Faculty can update enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Faculty can view enrollments" ON public.enrollments;

-- ===========================================
-- STEP 2: CREATE QUIZ POLICIES
-- ===========================================

-- Allow faculty to create quizzes for their courses
CREATE POLICY "Faculty can create quizzes" ON public.quizzes FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.courses c 
  WHERE c.id = course_id 
  AND c.instructor_id = auth.uid()
));

-- Allow faculty to view quizzes for their courses
CREATE POLICY "Faculty can view quizzes" ON public.quizzes FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.courses c 
  WHERE c.id = course_id 
  AND c.instructor_id = auth.uid()
));

-- Allow faculty to update quizzes for their courses
CREATE POLICY "Faculty can update quizzes" ON public.quizzes FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.courses c 
  WHERE c.id = course_id 
  AND c.instructor_id = auth.uid()
));

-- Allow faculty to delete quizzes for their courses
CREATE POLICY "Faculty can delete quizzes" ON public.quizzes FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.courses c 
  WHERE c.id = course_id 
  AND c.instructor_id = auth.uid()
));

-- Allow students to view published/closed quizzes in courses they're enrolled in
CREATE POLICY "Students can view quizzes" ON public.quizzes FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.enrollments e 
  WHERE e.course_id = course_id 
  AND e.student_id = auth.uid() 
  AND e.status = 'approved'
  AND status IN ('published', 'closed')
));

-- ===========================================
-- STEP 3: CREATE QUIZ_QUESTIONS POLICIES
-- ===========================================

-- Allow faculty to create quiz questions for their courses
CREATE POLICY "Faculty can create quiz questions" ON public.quiz_questions FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.quizzes q 
  JOIN public.courses c ON q.course_id = c.id 
  WHERE q.id = quiz_id 
  AND c.instructor_id = auth.uid()
));

-- Allow faculty to view quiz questions for their courses
CREATE POLICY "Faculty can view quiz questions" ON public.quiz_questions FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.quizzes q 
  JOIN public.courses c ON q.course_id = c.id 
  WHERE q.id = quiz_id 
  AND c.instructor_id = auth.uid()
));

-- Allow faculty to update quiz questions for their courses
CREATE POLICY "Faculty can update quiz questions" ON public.quiz_questions FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.quizzes q 
  JOIN public.courses c ON q.course_id = c.id 
  WHERE q.id = quiz_id 
  AND c.instructor_id = auth.uid()
));

-- Allow faculty to delete quiz questions for their courses
CREATE POLICY "Faculty can delete quiz questions" ON public.quiz_questions FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.quizzes q 
  JOIN public.courses c ON q.course_id = c.id 
  WHERE q.id = quiz_id 
  AND c.instructor_id = auth.uid()
));

-- Allow students to view quiz questions for published/closed quizzes in courses they're enrolled in
CREATE POLICY "Students can view quiz questions" ON public.quiz_questions FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.quizzes q 
  JOIN public.enrollments e ON q.course_id = e.course_id 
  WHERE q.id = quiz_id 
  AND e.student_id = auth.uid() 
  AND e.status = 'approved'
  AND q.status IN ('published', 'closed')
));

-- ===========================================
-- STEP 4: CREATE ENROLLMENT POLICIES
-- ===========================================

-- Allow faculty to create enrollments for their courses
CREATE POLICY "Faculty can create enrollments" ON public.enrollments FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.courses c 
  WHERE c.id = course_id 
  AND c.instructor_id = auth.uid()
));

-- Allow faculty to view enrollments for their courses
CREATE POLICY "Faculty can view enrollments" ON public.enrollments FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.courses c 
  WHERE c.id = course_id 
  AND c.instructor_id = auth.uid()
));

-- Allow faculty to update enrollments for their courses
CREATE POLICY "Faculty can update enrollments" ON public.enrollments FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.courses c 
  WHERE c.id = course_id 
  AND c.instructor_id = auth.uid()
));

-- Allow students to view their own enrollments
CREATE POLICY "Students can view own enrollments" ON public.enrollments FOR SELECT 
USING (student_id = auth.uid());

-- ===========================================
-- STEP 5: VERIFY POLICIES
-- ===========================================

-- Check that all policies are created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('quizzes', 'quiz_questions', 'enrollments')
ORDER BY tablename, policyname;


