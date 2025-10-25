-- COMPLETE RLS POLICY FIX FOR QUIZ SYSTEM
-- This script fixes all RLS policies to allow proper quiz functionality

-- ===========================================
-- STEP 1: DROP EXISTING PROBLEMATIC POLICIES
-- ===========================================

-- Drop existing policies that might be blocking access
DROP POLICY IF EXISTS "Users can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Students can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Faculty can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Users can view quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can view quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can create enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Faculty can create quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Faculty can create quiz questions" ON public.quiz_questions;

-- ===========================================
-- STEP 2: ENABLE RLS ON ALL TABLES
-- ===========================================

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_question_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- STEP 3: CREATE QUIZ_QUESTIONS POLICIES
-- ===========================================

-- Allow faculty to view all quiz questions for their courses
CREATE POLICY "Faculty can view quiz questions" ON public.quiz_questions FOR SELECT 
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

-- Allow faculty to create quiz questions for their courses
CREATE POLICY "Faculty can create quiz questions" ON public.quiz_questions FOR INSERT 
WITH CHECK (EXISTS (
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

-- ===========================================
-- STEP 4: CREATE QUIZZES POLICIES
-- ===========================================

-- Allow faculty to view all quizzes for their courses
CREATE POLICY "Faculty can view quizzes" ON public.quizzes FOR SELECT 
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

-- Allow faculty to create quizzes for their courses
CREATE POLICY "Faculty can create quizzes" ON public.quizzes FOR INSERT 
WITH CHECK (EXISTS (
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

-- ===========================================
-- STEP 5: CREATE ENROLLMENTS POLICIES
-- ===========================================

-- Allow faculty to view enrollments for their courses
CREATE POLICY "Faculty can view enrollments" ON public.enrollments FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.courses c 
  WHERE c.id = course_id 
  AND c.instructor_id = auth.uid()
));

-- Allow students to view their own enrollments
CREATE POLICY "Students can view own enrollments" ON public.enrollments FOR SELECT 
USING (student_id = auth.uid());

-- Allow faculty to create enrollments for their courses
CREATE POLICY "Faculty can create enrollments" ON public.enrollments FOR INSERT 
WITH CHECK (EXISTS (
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

-- ===========================================
-- STEP 6: CREATE QUIZ_ATTEMPTS POLICIES
-- ===========================================

-- Allow students to view their own quiz attempts
CREATE POLICY "Students can view own quiz attempts" ON public.quiz_attempts FOR SELECT 
USING (student_id = auth.uid());

-- Allow faculty to view quiz attempts for their courses
CREATE POLICY "Faculty can view quiz attempts" ON public.quiz_attempts FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.quizzes q 
  JOIN public.courses c ON q.course_id = c.id 
  WHERE q.id = quiz_id 
  AND c.instructor_id = auth.uid()
));

-- Allow students to create their own quiz attempts
CREATE POLICY "Students can create quiz attempts" ON public.quiz_attempts FOR INSERT 
WITH CHECK (student_id = auth.uid());

-- Allow students to update their own quiz attempts
CREATE POLICY "Students can update own quiz attempts" ON public.quiz_attempts FOR UPDATE 
USING (student_id = auth.uid());

-- Allow faculty to update quiz attempts for their courses
CREATE POLICY "Faculty can update quiz attempts" ON public.quiz_attempts FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.quizzes q 
  JOIN public.courses c ON q.course_id = c.id 
  WHERE q.id = quiz_id 
  AND c.instructor_id = auth.uid()
));

-- ===========================================
-- STEP 7: CREATE QUIZ_QUESTION_GRADES POLICIES
-- ===========================================

-- Allow students to view grades for their own attempts
CREATE POLICY "Students can view own grades" ON public.quiz_question_grades FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.quiz_attempts qa 
  WHERE qa.id = attempt_id 
  AND qa.student_id = auth.uid()
));

-- Allow faculty to view grades for their courses
CREATE POLICY "Faculty can view grades" ON public.quiz_question_grades FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.quiz_attempts qa 
  JOIN public.quizzes q ON qa.quiz_id = q.id 
  JOIN public.courses c ON q.course_id = c.id 
  WHERE qa.id = attempt_id 
  AND c.instructor_id = auth.uid()
));

-- Allow faculty to create grades for their courses
CREATE POLICY "Faculty can create grades" ON public.quiz_question_grades FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.quiz_attempts qa 
  JOIN public.quizzes q ON qa.quiz_id = q.id 
  JOIN public.courses c ON q.course_id = c.id 
  WHERE qa.id = attempt_id 
  AND c.instructor_id = auth.uid()
));

-- Allow faculty to update grades for their courses
CREATE POLICY "Faculty can update grades" ON public.quiz_question_grades FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.quiz_attempts qa 
  JOIN public.quizzes q ON qa.quiz_id = q.id 
  JOIN public.courses c ON q.course_id = c.id 
  WHERE qa.id = attempt_id 
  AND c.instructor_id = auth.uid()
));

-- ===========================================
-- STEP 8: VERIFY POLICIES ARE CREATED
-- ===========================================

-- Check that all policies were created successfully
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('quiz_questions', 'quizzes', 'enrollments', 'quiz_attempts', 'quiz_question_grades')
ORDER BY tablename, policyname;

-- ===========================================
-- STEP 9: TEST STUDENT ACCESS
-- ===========================================

-- This query should work for students to access quiz questions
SELECT 
  'Student Access Test' as test_name,
  COUNT(DISTINCT qq.id) as accessible_questions,
  COUNT(DISTINCT q.id) as accessible_quizzes,
  COUNT(DISTINCT e.id) as approved_enrollments
FROM public.quiz_questions qq
JOIN public.quizzes q ON qq.quiz_id = q.id
JOIN public.courses c ON q.course_id = c.id
JOIN public.enrollments e ON c.id = e.course_id
WHERE e.student_id = auth.uid() 
AND e.status = 'approved'
AND q.status IN ('published', 'closed');

-- ===========================================
-- COMPLETION MESSAGE
-- ===========================================

SELECT 'RLS Policies Fixed Successfully!' as status;



