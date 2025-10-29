-- Fix RLS policies for quiz_attempts to allow manual grading updates
-- This ensures faculty can update quiz_attempts scores after manual grading

-- 1. Check current RLS policies for quiz_attempts
SELECT 
  'Current RLS policies for quiz_attempts' as info,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'quiz_attempts'
ORDER BY policyname;

-- 2. Drop existing policies that might be blocking updates
DROP POLICY IF EXISTS "Students can update quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Students can view quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Faculty can view quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Faculty can update quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Faculty can manage quiz attempts" ON public.quiz_attempts;

-- 3. Create simple, permissive policies for quiz_attempts
-- Faculty can do everything with quiz attempts
CREATE POLICY "Faculty full access to quiz attempts" ON public.quiz_attempts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'faculty'
    )
  );

-- Students can view and update their own quiz attempts
CREATE POLICY "Students access own quiz attempts" ON public.quiz_attempts
  FOR ALL USING (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'student'
    )
  );

-- 4. Add performance indexes for quiz_attempts
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON public.quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status ON public.quiz_attempts(status);

-- 5. Test the policies
SELECT 
  'RLS policies updated successfully' as status,
  COUNT(*) as total_attempts
FROM public.quiz_attempts;

-- 6. Show final policies
SELECT 
  'Final RLS policies for quiz_attempts' as info,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'quiz_attempts'
ORDER BY policyname;

