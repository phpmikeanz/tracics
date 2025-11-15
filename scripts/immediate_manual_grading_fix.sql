-- IMMEDIATE MANUAL GRADING FIX
-- Run this script to fix the most common manual grading issues

-- 1. Fix RLS policies (most common issue)
DROP POLICY IF EXISTS "Faculty can view and grade questions for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Students can view their own question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can view grades for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can insert grades for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can update grades for their quizzes" ON public.quiz_question_grades;

-- Create simple, permissive policies
CREATE POLICY "Faculty can manage grades" ON public.quiz_question_grades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      JOIN public.quizzes q ON qa.quiz_id = q.id
      JOIN public.courses c ON q.course_id = c.id
      WHERE qa.id = quiz_question_grades.attempt_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their grades" ON public.quiz_question_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      WHERE qa.id = quiz_question_grades.attempt_id
      AND qa.student_id = auth.uid()
    )
  );

-- 2. Check if you have faculty role
SELECT 
  'User Role Check' as check_type,
  id,
  email,
  role,
  full_name
FROM public.profiles
WHERE id = auth.uid();

-- 3. Check for quiz attempts that need grading
SELECT 
  'Quiz Attempts Needing Grading' as check_type,
  qa.id as attempt_id,
  qa.status,
  qa.score,
  q.title as quiz_title,
  p.full_name as student_name,
  COUNT(qq.id) as essay_short_answer_questions
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.profiles p ON qa.student_id = p.id
LEFT JOIN public.quiz_questions qq ON q.id = qq.quiz_id AND qq.type IN ('short_answer', 'essay')
WHERE qa.status = 'completed'
AND qa.completed_at IS NOT NULL
GROUP BY qa.id, qa.status, qa.score, q.title, p.full_name
HAVING COUNT(qq.id) > 0
ORDER BY qa.completed_at DESC
LIMIT 5;

-- 4. Test if you can access the quiz_question_grades table
SELECT 
  'Table Access Test' as check_type,
  COUNT(*) as total_grades
FROM public.quiz_question_grades;

-- 5. Create a simple function to manually update quiz scores
CREATE OR REPLACE FUNCTION update_quiz_score_manually(attempt_id_param UUID)
RETURNS TABLE(
  attempt_id UUID,
  old_score NUMERIC,
  new_score NUMERIC,
  old_status TEXT,
  new_status TEXT
) AS $$
DECLARE
  total_auto_score NUMERIC := 0;
  total_manual_score NUMERIC := 0;
  final_score NUMERIC := 0;
  quiz_id_val UUID;
  answers_json JSONB;
  old_score_val NUMERIC;
  old_status_val TEXT;
BEGIN
  -- Get quiz details
  SELECT quiz_id, answers, score, status 
  INTO quiz_id_val, answers_json, old_score_val, old_status_val
  FROM quiz_attempts 
  WHERE id = attempt_id_param;
  
  -- Calculate auto-graded score
  SELECT COALESCE(SUM(qq.points), 0) INTO total_auto_score
  FROM quiz_questions qq
  WHERE qq.quiz_id = quiz_id_val
  AND qq.type IN ('multiple_choice', 'true_false')
  AND answers_json->>qq.id::text = qq.correct_answer;
  
  -- Calculate manual graded score
  SELECT COALESCE(SUM(points_awarded), 0) INTO total_manual_score
  FROM quiz_question_grades
  WHERE attempt_id = attempt_id_param;
  
  -- Calculate final score
  final_score := total_auto_score + total_manual_score;
  
  -- Update quiz attempt
  UPDATE quiz_attempts 
  SET 
    score = final_score,
    status = 'graded'
  WHERE id = attempt_id_param;
  
  -- Return results
  attempt_id := attempt_id_param;
  old_score := old_score_val;
  new_score := final_score;
  old_status := old_status_val;
  new_status := 'graded';
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 6. Test the function (uncomment and modify with real attempt ID)
/*
SELECT * FROM update_quiz_score_manually('your-attempt-id-here');
*/

-- 7. Show instructions for testing
SELECT 
  'Next Steps' as instruction,
  '1. Check your user role above' as step1,
  '2. Find an attempt ID from the list above' as step2,
  '3. Try to grade that attempt in the UI' as step3,
  '4. If it fails, run: SELECT * FROM update_quiz_score_manually(''attempt-id'');' as step4;


















