-- Debug script to check quiz attempt statuses
-- Run this to see the current status of quiz attempts

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
ORDER BY qa.created_at DESC
LIMIT 10;
