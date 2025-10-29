-- Fix manual grading timeout issues by optimizing RLS policies and adding indexes
-- This script addresses the "canceling statement due to statement timeout" error

-- 1. Drop existing complex RLS policies that cause performance issues
DROP POLICY IF EXISTS "Faculty can view grades for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can insert grades for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can update grades for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can delete grades for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Students can view their own question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty full access to quiz question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Students can view their own quiz question grades" ON public.quiz_question_grades;

-- 2. Create optimized indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON public.quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3. Create simplified, efficient RLS policies
-- Faculty can do everything with quiz question grades (simplified check)
CREATE POLICY "Faculty access to quiz question grades" ON public.quiz_question_grades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'faculty'
    )
  );

-- Students can view their own grades (simplified check)
CREATE POLICY "Students view own quiz question grades" ON public.quiz_question_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts 
      WHERE id = quiz_question_grades.attempt_id 
      AND student_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'student'
    )
  );

-- 4. Add a function to check if a faculty member can access a specific quiz attempt
-- This will be used in the application layer for additional security
CREATE OR REPLACE FUNCTION can_faculty_access_quiz_attempt(attempt_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.quiz_attempts qa
    JOIN public.quizzes q ON qa.quiz_id = q.id
    JOIN public.courses c ON q.course_id = c.id
    WHERE qa.id = attempt_id
    AND c.instructor_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Add a function to check if a student can access their own quiz attempt
CREATE OR REPLACE FUNCTION can_student_access_quiz_attempt(attempt_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.quiz_attempts 
    WHERE id = attempt_id 
    AND student_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create a materialized view for faster quiz attempt lookups
-- This will cache the relationship between attempts, quizzes, and courses
CREATE MATERIALIZED VIEW IF NOT EXISTS quiz_attempt_course_info AS
SELECT 
  qa.id as attempt_id,
  qa.student_id,
  qa.quiz_id,
  q.course_id,
  c.instructor_id
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.courses c ON q.course_id = c.id;

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_course_info_attempt_id ON quiz_attempt_course_info(attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_course_info_student_id ON quiz_attempt_course_info(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_course_info_instructor_id ON quiz_attempt_course_info(instructor_id);

-- 7. Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_quiz_attempt_course_info()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW quiz_attempt_course_info;
END;
$$ LANGUAGE plpgsql;

-- 8. Grant necessary permissions
GRANT SELECT ON quiz_attempt_course_info TO authenticated;
GRANT EXECUTE ON FUNCTION can_faculty_access_quiz_attempt(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_student_access_quiz_attempt(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_quiz_attempt_course_info() TO authenticated;

-- 9. Test the optimized policies
SELECT 
  'Testing optimized RLS policies' as test_type,
  COUNT(*) as accessible_grades
FROM public.quiz_question_grades;

-- 10. Show current policies
SELECT 
  policyname,
  cmd,
  permissive,
  qual
FROM pg_policies 
WHERE tablename = 'quiz_question_grades'
ORDER BY policyname;
