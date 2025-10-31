-- Fix the specific attempt for Micho A. Robledo
-- This script will find and fix the attempt that shows "30" score but should be "50"

-- 1. Find the attempt ID for Micho A. Robledo
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
WHERE p.full_name LIKE '%Micho%'
ORDER BY qa.completed_at DESC;

-- 2. Check manual grades for this attempt
-- Replace 'YOUR_ATTEMPT_ID' with the actual attempt ID from step 1
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

-- 3. Calculate the correct total score
-- Replace 'YOUR_ATTEMPT_ID' with the actual attempt ID
/*
SELECT 
  qa.id as attempt_id,
  qa.score as current_score,
  -- Auto-graded points
  (SELECT COALESCE(SUM(qq.points), 0)
   FROM public.quiz_questions qq
   JOIN public.quiz_attempts qa2 ON qq.quiz_id = qa2.quiz_id
   WHERE qa2.id = 'YOUR_ATTEMPT_ID'
     AND qq.type IN ('multiple_choice', 'true_false')
     AND qa2.answers->>qq.id::text = qq.correct_answer
  ) as auto_graded_points,
  -- Manual graded points
  (SELECT COALESCE(SUM(qqg.points_awarded), 0)
   FROM public.quiz_question_grades qqg
   WHERE qqg.attempt_id = 'YOUR_ATTEMPT_ID'
  ) as manual_graded_points,
  -- Total score
  (
    (SELECT COALESCE(SUM(qq.points), 0)
     FROM public.quiz_questions qq
     JOIN public.quiz_attempts qa2 ON qq.quiz_id = qa2.quiz_id
     WHERE qa2.id = 'YOUR_ATTEMPT_ID'
       AND qq.type IN ('multiple_choice', 'true_false')
       AND qa2.answers->>qq.id::text = qq.correct_answer
    ) +
    (SELECT COALESCE(SUM(qqg.points_awarded), 0)
     FROM public.quiz_question_grades qqg
     WHERE qqg.attempt_id = 'YOUR_ATTEMPT_ID'
    )
  ) as calculated_total_score
FROM public.quiz_attempts qa
WHERE qa.id = 'YOUR_ATTEMPT_ID';
*/

-- 4. Update the attempt with the correct score
-- Replace 'YOUR_ATTEMPT_ID' with the actual attempt ID
-- Replace 'CORRECT_SCORE' with the calculated score from step 3
/*
UPDATE public.quiz_attempts 
SET 
  score = CORRECT_SCORE,
  status = 'graded'
WHERE id = 'YOUR_ATTEMPT_ID';
*/

-- 5. Verify the update
-- Replace 'YOUR_ATTEMPT_ID' with the actual attempt ID
/*
SELECT 
  qa.id as attempt_id,
  qa.status,
  qa.score,
  q.title as quiz_title,
  p.full_name as student_name
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.profiles p ON qa.student_id = p.id
WHERE qa.id = 'YOUR_ATTEMPT_ID';
*/






























