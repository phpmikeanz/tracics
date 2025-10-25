-- Simple Manual Grading Test Script
-- This script tests the basic functionality of manual grading

-- 1. Check if we can access the quiz_question_grades table
SELECT 
  'Table Access Test' as test_name,
  COUNT(*) as total_records
FROM public.quiz_question_grades;

-- 2. Check for any quiz attempts that have essay/short answer questions
SELECT 
  'Quiz Attempts with Manual Questions' as test_name,
  qa.id as attempt_id,
  qa.status,
  qa.score,
  q.title as quiz_title,
  p.full_name as student_name,
  COUNT(qq.id) as manual_questions_count
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.profiles p ON qa.student_id = p.id
JOIN public.quiz_questions qq ON q.id = qq.quiz_id
WHERE qq.type IN ('short_answer', 'essay')
AND qa.status = 'completed'
GROUP BY qa.id, qa.status, qa.score, q.title, p.full_name
ORDER BY qa.completed_at DESC
LIMIT 5;

-- 3. Check for any existing manual grades
SELECT 
  'Existing Manual Grades' as test_name,
  qqg.id as grade_id,
  qqg.attempt_id,
  qqg.question_id,
  qqg.points_awarded,
  qqg.feedback,
  qqg.graded_by,
  qqg.graded_at,
  qq.question,
  qq.type,
  qq.points as max_points
FROM public.quiz_question_grades qqg
JOIN public.quiz_questions qq ON qqg.question_id = qq.id
WHERE qq.type IN ('short_answer', 'essay')
ORDER BY qqg.graded_at DESC
LIMIT 5;

-- 4. Check RLS policies
SELECT 
  'RLS Policies' as test_name,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'quiz_question_grades'
ORDER BY policyname;

-- 5. Test if we can insert a test grade (this will fail if RLS is blocking)
-- Note: This is commented out to avoid actually inserting test data
/*
INSERT INTO public.quiz_question_grades (
  attempt_id,
  question_id,
  points_awarded,
  feedback,
  graded_by
) VALUES (
  'test-attempt-id',
  'test-question-id',
  5,
  'Test feedback',
  'test-user-id'
);
*/