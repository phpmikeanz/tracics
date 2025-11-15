-- Debug automatic finalization issues
-- This script helps identify why automatic finalization is not working

-- 1. Check current quiz attempts and their status
SELECT 
  qa.id as attempt_id,
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
WHERE qa.status IN ('completed', 'graded')
ORDER BY qa.completed_at DESC
LIMIT 10;

-- 2. Check manual grades for each attempt
SELECT 
  qa.id as attempt_id,
  qa.status as attempt_status,
  qa.score as attempt_score,
  COUNT(qqg.id) as manual_grades_count,
  SUM(qqg.points_awarded) as total_manual_points,
  MAX(qqg.graded_at) as last_graded_at
FROM public.quiz_attempts qa
LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id
WHERE qa.status = 'completed'
GROUP BY qa.id, qa.status, qa.score
ORDER BY qa.completed_at DESC
LIMIT 10;

-- 3. Check specific attempt details (replace with actual attempt ID)
-- Replace 'YOUR_ATTEMPT_ID' with the actual attempt ID from the first query
/*
SELECT 
  qa.id as attempt_id,
  qa.quiz_id,
  qa.student_id,
  qa.status,
  qa.score,
  qa.answers,
  qa.completed_at,
  q.title as quiz_title
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
WHERE qa.id = 'YOUR_ATTEMPT_ID';
*/

-- 4. Check manual grades for specific attempt
-- Replace 'YOUR_ATTEMPT_ID' with the actual attempt ID
/*
SELECT 
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
WHERE qqg.attempt_id = 'YOUR_ATTEMPT_ID'
ORDER BY qqg.graded_at DESC;
*/

-- 5. Check if there are any quiz attempts that should be graded but aren't
SELECT 
  qa.id as attempt_id,
  qa.status,
  qa.score,
  q.title as quiz_title,
  COUNT(qq.id) as essay_short_answer_questions,
  COUNT(qqg.id) as manual_grades_count,
  CASE 
    WHEN COUNT(qq.id) > 0 AND COUNT(qqg.id) > 0 AND qa.status = 'completed' 
    THEN 'SHOULD BE GRADED' 
    ELSE 'OK' 
  END as status_check
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
LEFT JOIN public.quiz_questions qq ON q.id = qq.quiz_id AND qq.type IN ('short_answer', 'essay')
LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id AND qq.id = qqg.question_id
WHERE qa.status = 'completed'
GROUP BY qa.id, qa.status, qa.score, q.title
HAVING COUNT(qq.id) > 0
ORDER BY qa.completed_at DESC;

-- 6. Check the most recent manual grades
SELECT 
  qqg.id as grade_id,
  qqg.attempt_id,
  qqg.question_id,
  qqg.points_awarded,
  qqg.feedback,
  qqg.graded_by,
  qqg.graded_at,
  qq.question,
  qq.type,
  qq.points as max_points,
  qa.status as attempt_status
FROM public.quiz_question_grades qqg
JOIN public.quiz_questions qq ON qqg.question_id = qq.id
JOIN public.quiz_attempts qa ON qqg.attempt_id = qa.id
ORDER BY qqg.graded_at DESC
LIMIT 10;


































