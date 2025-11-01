-- Comprehensive Manual Grading Fix Script
-- This script diagnoses and fixes all manual grading issues

-- 1. Check if quiz_question_grades table exists and has correct structure
SELECT 
  'Table Structure Check' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'quiz_question_grades' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check RLS policies on quiz_question_grades table
SELECT 
  'RLS Policies Check' as check_type,
  policyname,
  cmd,
  permissive,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'quiz_question_grades'
ORDER BY policyname;

-- 3. Check for any existing manual grades
SELECT 
  'Existing Grades Check' as check_type,
  COUNT(*) as total_grades,
  COUNT(DISTINCT attempt_id) as unique_attempts,
  COUNT(DISTINCT question_id) as unique_questions,
  MIN(graded_at) as earliest_grade,
  MAX(graded_at) as latest_grade
FROM public.quiz_question_grades;

-- 4. Find quiz attempts that need manual grading
SELECT 
  'Attempts Needing Grading' as check_type,
  qa.id as attempt_id,
  qa.quiz_id,
  qa.student_id,
  qa.status,
  qa.score,
  qa.completed_at,
  q.title as quiz_title,
  p.full_name as student_name,
  COUNT(qq.id) as essay_short_answer_questions,
  COUNT(qqg.id) as graded_questions,
  COUNT(qq.id) - COUNT(qqg.id) as ungraded_questions
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.profiles p ON qa.student_id = p.id
LEFT JOIN public.quiz_questions qq ON q.id = qq.quiz_id AND qq.type IN ('short_answer', 'essay')
LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id AND qq.id = qqg.question_id
WHERE qa.status = 'completed'
AND qa.completed_at IS NOT NULL
GROUP BY qa.id, qa.quiz_id, qa.student_id, qa.status, qa.score, qa.completed_at, q.title, p.full_name
HAVING COUNT(qq.id) > 0
ORDER BY qa.completed_at DESC
LIMIT 10;

-- 5. Check for quiz attempts with manual grades but wrong status
SELECT 
  'Inconsistent Status Check' as check_type,
  qa.id as attempt_id,
  qa.status,
  qa.score,
  COUNT(qqg.id) as manual_grades_count,
  SUM(qqg.points_awarded) as total_manual_points,
  q.title as quiz_title,
  p.full_name as student_name
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.profiles p ON qa.student_id = p.id
LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id
WHERE qa.status = 'completed'
AND qqg.id IS NOT NULL
GROUP BY qa.id, qa.status, qa.score, q.title, p.full_name
ORDER BY qa.completed_at DESC;

-- 6. Fix RLS policies (drop and recreate)
DROP POLICY IF EXISTS "Faculty can view and grade questions for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Students can view their own question grades" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can view grades for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can insert grades for their quizzes" ON public.quiz_question_grades;
DROP POLICY IF EXISTS "Faculty can update grades for their quizzes" ON public.quiz_question_grades;

-- Create comprehensive RLS policies
CREATE POLICY "Faculty can view grades for their quizzes" ON public.quiz_question_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      JOIN public.quizzes q ON qa.quiz_id = q.id
      JOIN public.courses c ON q.course_id = c.id
      WHERE qa.id = quiz_question_grades.attempt_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Faculty can insert grades for their quizzes" ON public.quiz_question_grades
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      JOIN public.quizzes q ON qa.quiz_id = q.id
      JOIN public.courses c ON q.course_id = c.id
      WHERE qa.id = quiz_question_grades.attempt_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Faculty can update grades for their quizzes" ON public.quiz_question_grades
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      JOIN public.quizzes q ON qa.quiz_id = q.id
      JOIN public.courses c ON q.course_id = c.id
      WHERE qa.id = quiz_question_grades.attempt_id
      AND c.instructor_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      JOIN public.quizzes q ON qa.quiz_id = q.id
      JOIN public.courses c ON q.course_id = c.id
      WHERE qa.id = quiz_question_grades.attempt_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their own question grades" ON public.quiz_question_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      WHERE qa.id = quiz_question_grades.attempt_id
      AND qa.student_id = auth.uid()
    )
  );

-- 7. Create a function to fix quiz attempts with manual grades
CREATE OR REPLACE FUNCTION fix_quiz_attempts_with_manual_grades()
RETURNS TABLE(
  attempt_id UUID,
  old_status TEXT,
  new_status TEXT,
  old_score INTEGER,
  new_score INTEGER,
  manual_grades_count BIGINT,
  total_manual_points BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH manual_grade_totals AS (
    SELECT 
      qa.id as attempt_id,
      qa.status as old_status,
      qa.score as old_score,
      COUNT(qqg.id) as manual_grades_count,
      COALESCE(SUM(qqg.points_awarded), 0) as total_manual_points,
      -- Calculate auto-graded points
      COALESCE((
        SELECT SUM(qq.points)
        FROM public.quiz_questions qq
        WHERE qq.quiz_id = qa.quiz_id
        AND qq.type IN ('multiple_choice', 'true_false')
        AND qa.answers->>qq.id::text = qq.correct_answer
      ), 0) as auto_graded_points
    FROM public.quiz_attempts qa
    LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id
    WHERE qa.status = 'completed'
    AND EXISTS (
      SELECT 1 FROM public.quiz_question_grades qqg2 
      WHERE qqg2.attempt_id = qa.id
    )
    GROUP BY qa.id, qa.status, qa.score
  ),
  updated_attempts AS (
    UPDATE public.quiz_attempts qa
    SET 
      status = 'graded',
      score = mgt.auto_graded_points + mgt.total_manual_points
    FROM manual_grade_totals mgt
    WHERE qa.id = mgt.attempt_id
    RETURNING qa.id, qa.status, qa.score
  )
  SELECT 
    mgt.attempt_id,
    mgt.old_status,
    ua.status as new_status,
    mgt.old_score,
    ua.score as new_score,
    mgt.manual_grades_count,
    mgt.total_manual_points
  FROM manual_grade_totals mgt
  LEFT JOIN updated_attempts ua ON mgt.attempt_id = ua.id;
END;
$$ LANGUAGE plpgsql;

-- 8. Run the fix function
SELECT * FROM fix_quiz_attempts_with_manual_grades();

-- 9. Verify the fix worked
SELECT 
  'Fix Verification' as check_type,
  COUNT(*) as total_attempts,
  COUNT(CASE WHEN status = 'graded' THEN 1 END) as graded_attempts,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_attempts,
  AVG(score) as average_score
FROM public.quiz_attempts qa
WHERE EXISTS (
  SELECT 1 FROM public.quiz_question_grades qqg 
  WHERE qqg.attempt_id = qa.id
);

-- 10. Test RLS access
SELECT 
  'RLS Access Test' as check_type,
  COUNT(*) as accessible_grades
FROM public.quiz_question_grades;

-- 11. Clean up the function
DROP FUNCTION IF EXISTS fix_quiz_attempts_with_manual_grades();















