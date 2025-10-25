-- Fix RLS policy for quiz_attempts to allow faculty to update scores and status
-- This fixes the issue where faculty can't update quiz attempts after manual grading

-- Drop the existing policies
DROP POLICY IF EXISTS "Students can manage own quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Faculty can view quiz attempts for their courses" ON public.quiz_attempts;

-- Create new policies that allow faculty to update quiz attempts for their courses
CREATE POLICY "Students can manage own quiz attempts" ON public.quiz_attempts FOR ALL USING (
  student_id = auth.uid()
);

-- Faculty can view quiz attempts for their courses
CREATE POLICY "Faculty can view quiz attempts for their courses" ON public.quiz_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON q.course_id = c.id 
          WHERE q.id = quiz_id AND c.instructor_id = auth.uid())
);

-- Faculty can update quiz attempts for their courses (for grading purposes)
CREATE POLICY "Faculty can update quiz attempts for their courses" ON public.quiz_attempts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON q.course_id = c.id 
          WHERE q.id = quiz_id AND c.instructor_id = auth.uid())
);

-- Verify the policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'quiz_attempts'
ORDER BY policyname;
