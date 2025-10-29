-- COMPREHENSIVE QUIZ RLS POLICIES
-- This script creates stable RLS policies for the entire quiz system
-- Fixes the issue where students cannot view quiz questions

-- ===========================================
-- STEP 1: DROP ALL EXISTING QUIZ POLICIES
-- ===========================================

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Faculty can create quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Faculty can update quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Faculty can delete quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Faculty can view quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Students can view quizzes" ON public.quizzes;

DROP POLICY IF EXISTS "Faculty can create quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Faculty can update quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Faculty can delete quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Faculty can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Students can view quiz questions" ON public.quiz_questions;

DROP POLICY IF EXISTS "Faculty can create quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Faculty can update quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Faculty can delete quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Faculty can view quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Students can create quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Students can update quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Students can view quiz attempts" ON public.quiz_attempts;

DROP POLICY IF EXISTS "Faculty can create quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can update quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can delete quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can view quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Students can view quiz question grades" ON public.quiz_question_grades;

-- ===========================================
-- STEP 2: ENABLE RLS ON ALL TABLES
-- ===========================================

-- Ensure RLS is enabled on all quiz-related tables
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_question_grades ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- STEP 3: QUIZZES TABLE POLICIES
-- ===========================================

-- Faculty can create quizzes for their courses
CREATE POLICY "Faculty can create quizzes" ON public.quizzes FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses c 
    WHERE c.id = course_id 
    AND c.instructor_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'faculty'
  )
);

-- Faculty can view all quizzes for their courses
CREATE POLICY "Faculty can view quizzes" ON public.quizzes FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.courses c 
    WHERE c.id = course_id 
    AND c.instructor_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'faculty'
  )
);

-- Faculty can update quizzes for their courses
CREATE POLICY "Faculty can update quizzes" ON public.quizzes FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.courses c 
    WHERE c.id = course_id 
    AND c.instructor_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'faculty'
  )
);

-- Faculty can delete quizzes for their courses
CREATE POLICY "Faculty can delete quizzes" ON public.quizzes FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.courses c 
    WHERE c.id = course_id 
    AND c.instructor_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'faculty'
  )
);

-- Students can view published/closed quizzes in courses they're enrolled in
CREATE POLICY "Students can view quizzes" ON public.quizzes FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e 
    WHERE e.course_id = course_id 
    AND e.student_id = auth.uid() 
    AND e.status = 'approved'
  )
  AND status IN ('published', 'closed')
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'student'
  )
);

-- ===========================================
-- STEP 4: QUIZ_QUESTIONS TABLE POLICIES
-- ===========================================

-- Faculty can create quiz questions for their courses
CREATE POLICY "Faculty can create quiz questions" ON public.quiz_questions FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE q.id = quiz_id 
    AND c.instructor_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'faculty'
  )
);

-- Faculty can view quiz questions for their courses
CREATE POLICY "Faculty can view quiz questions" ON public.quiz_questions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE q.id = quiz_id 
    AND c.instructor_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'faculty'
  )
);

-- Faculty can update quiz questions for their courses
CREATE POLICY "Faculty can update quiz questions" ON public.quiz_questions FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE q.id = quiz_id 
    AND c.instructor_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'faculty'
  )
);

-- Faculty can delete quiz questions for their courses
CREATE POLICY "Faculty can delete quiz questions" ON public.quiz_questions FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE q.id = quiz_id 
    AND c.instructor_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'faculty'
  )
);

-- Students can view quiz questions for published/closed quizzes in courses they're enrolled in
CREATE POLICY "Students can view quiz questions" ON public.quiz_questions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.enrollments e ON q.course_id = e.course_id 
    WHERE q.id = quiz_id 
    AND e.student_id = auth.uid() 
    AND e.status = 'approved'
    AND q.status IN ('published', 'closed')
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'student'
  )
);

-- ===========================================
-- STEP 5: QUIZ_ATTEMPTS TABLE POLICIES
-- ===========================================

-- Faculty can create quiz attempts (for testing purposes)
CREATE POLICY "Faculty can create quiz attempts" ON public.quiz_attempts FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE q.id = quiz_id 
    AND c.instructor_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'faculty'
  )
);

-- Faculty can view all quiz attempts for their courses
CREATE POLICY "Faculty can view quiz attempts" ON public.quiz_attempts FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE q.id = quiz_id 
    AND c.instructor_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'faculty'
  )
);

-- Faculty can update quiz attempts for their courses
CREATE POLICY "Faculty can update quiz attempts" ON public.quiz_attempts FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE q.id = quiz_id 
    AND c.instructor_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'faculty'
  )
);

-- Faculty can delete quiz attempts for their courses
CREATE POLICY "Faculty can delete quiz attempts" ON public.quiz_attempts FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE q.id = quiz_id 
    AND c.instructor_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'faculty'
  )
);

-- Students can create quiz attempts for quizzes they have access to
CREATE POLICY "Students can create quiz attempts" ON public.quiz_attempts FOR INSERT 
WITH CHECK (
  student_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.enrollments e ON q.course_id = e.course_id 
    WHERE q.id = quiz_id 
    AND e.student_id = auth.uid() 
    AND e.status = 'approved'
    AND q.status IN ('published', 'closed')
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'student'
  )
);

-- Students can update their own quiz attempts
CREATE POLICY "Students can update quiz attempts" ON public.quiz_attempts FOR UPDATE 
USING (
  student_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'student'
  )
);

-- Students can view their own quiz attempts
CREATE POLICY "Students can view quiz attempts" ON public.quiz_attempts FOR SELECT 
USING (
  student_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'student'
  )
);

-- ===========================================
-- STEP 6: QUIZ_QUESTION_GRADES TABLE POLICIES
-- ===========================================

-- Faculty can create quiz question grades
CREATE POLICY "Faculty can create quiz question grades" ON public.quiz_question_grades FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa 
    JOIN public.quizzes q ON qa.quiz_id = q.id 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE qa.id = attempt_id 
    AND c.instructor_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'faculty'
  )
);

-- Faculty can view quiz question grades for their courses
CREATE POLICY "Faculty can view quiz question grades" ON public.quiz_question_grades FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa 
    JOIN public.quizzes q ON qa.quiz_id = q.id 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE qa.id = attempt_id 
    AND c.instructor_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'faculty'
  )
);

-- Faculty can update quiz question grades
CREATE POLICY "Faculty can update quiz question grades" ON public.quiz_question_grades FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa 
    JOIN public.quizzes q ON qa.quiz_id = q.id 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE qa.id = attempt_id 
    AND c.instructor_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'faculty'
  )
);

-- Faculty can delete quiz question grades
CREATE POLICY "Faculty can delete quiz question grades" ON public.quiz_question_grades FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa 
    JOIN public.quizzes q ON qa.quiz_id = q.id 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE qa.id = attempt_id 
    AND c.instructor_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'faculty'
  )
);

-- Students can view quiz question grades for their own attempts
CREATE POLICY "Students can view quiz question grades" ON public.quiz_question_grades FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa 
    WHERE qa.id = attempt_id 
    AND qa.student_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'student'
  )
);

-- ===========================================
-- STEP 7: VERIFY POLICIES
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
WHERE tablename IN ('quizzes', 'quiz_questions', 'quiz_attempts', 'quiz_question_grades')
ORDER BY tablename, policyname;

-- ===========================================
-- STEP 8: TEST QUERIES
-- ===========================================

-- Test query to verify student access to quiz questions
-- This should return quiz questions for published quizzes in courses the student is enrolled in
/*
SELECT 
  qq.id,
  qq.question,
  qq.type,
  qq.points,
  q.title as quiz_title,
  q.status as quiz_status,
  c.title as course_title
FROM quiz_questions qq
JOIN quizzes q ON qq.quiz_id = q.id
JOIN courses c ON q.course_id = c.id
JOIN enrollments e ON c.id = e.course_id
WHERE e.student_id = auth.uid()
  AND e.status = 'approved'
  AND q.status IN ('published', 'closed');
*/

-- ===========================================
-- STEP 9: COMMON ISSUES AND SOLUTIONS
-- ===========================================

/*
COMMON ISSUES AND SOLUTIONS:

1. STUDENT CANNOT SEE QUIZ QUESTIONS:
   - Check if student is enrolled in the course (enrollments table)
   - Check if enrollment status is 'approved'
   - Check if quiz status is 'published' or 'closed'
   - Check if student role is 'student' in profiles table

2. FACULTY CANNOT CREATE QUIZ QUESTIONS:
   - Check if faculty is the instructor of the course
   - Check if faculty role is 'faculty' in profiles table

3. RLS POLICY ERRORS:
   - Make sure all foreign key relationships are correct
   - Check that auth.uid() returns the correct user ID
   - Verify that the user exists in the profiles table

4. DEBUGGING STEPS:
   - Run the test query above to see what data is accessible
   - Check the pg_policies view to see all active policies
   - Use the debug script to test specific scenarios
*/
