-- Add manual grading system for quiz questions
-- Create table for manual question grades
CREATE TABLE IF NOT EXISTS public.quiz_question_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  points_awarded INTEGER DEFAULT 0,
  feedback TEXT,
  graded_by UUID REFERENCES public.profiles(id),
  graded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_question_grades_attempt_id ON public.quiz_question_grades(attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_question_grades_question_id ON public.quiz_question_grades(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_question_grades_graded_by ON public.quiz_question_grades(graded_by);

-- Enable RLS for the new table
ALTER TABLE public.quiz_question_grades ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quiz_question_grades
-- Faculty can view and grade questions for their own quizzes
CREATE POLICY "Faculty can view and grade questions for their quizzes" ON public.quiz_question_grades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      JOIN public.quizzes q ON qa.quiz_id = q.id
      JOIN public.courses c ON q.course_id = c.id
      WHERE qa.id = quiz_question_grades.attempt_id
      AND c.instructor_id = auth.uid()
    )
  );

-- Students can view their own grades
CREATE POLICY "Students can view their own question grades" ON public.quiz_question_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      WHERE qa.id = quiz_question_grades.attempt_id
      AND qa.student_id = auth.uid()
    )
  );
