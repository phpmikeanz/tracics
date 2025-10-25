-- Update the quiz questions RLS policy to ensure students can only access published quiz questions
-- This fixes the issue where students can't see quiz questions

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view quiz questions" ON public.quiz_questions;

-- Create a new policy that ensures:
-- 1. Faculty can view questions for their own courses (any quiz status)
-- 2. Students can only view questions for published/closed quizzes in courses they're enrolled in and approved for
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
