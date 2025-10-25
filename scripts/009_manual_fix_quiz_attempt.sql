-- Manual fix for quiz attempt status and score
-- Use this to manually update a quiz attempt if the automatic update fails

-- First, check the current status of quiz attempts
SELECT 
  qa.id,
  qa.quiz_id,
  qa.student_id,
  qa.status,
  qa.score,
  qa.completed_at,
  q.title as quiz_title,
  p.full_name as student_name
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.profiles p ON qa.student_id = p.id
WHERE qa.status = 'completed'
ORDER BY qa.created_at DESC;

-- Check if there are manual grades for completed attempts
SELECT 
  qa.id as attempt_id,
  qa.status,
  qa.score,
  COUNT(qqg.id) as manual_grades_count,
  SUM(qqg.points_awarded) as total_manual_points
FROM public.quiz_attempts qa
LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id
WHERE qa.status = 'completed'
GROUP BY qa.id, qa.status, qa.score
ORDER BY qa.created_at DESC;

-- Manual update example (replace 'ATTEMPT_ID' with actual attempt ID)
-- UPDATE public.quiz_attempts 
-- SET status = 'graded', score = 85  -- Replace with actual score
-- WHERE id = 'ATTEMPT_ID';
