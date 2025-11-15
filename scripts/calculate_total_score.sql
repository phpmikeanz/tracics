-- Calculate total score for quiz attempts
-- This script shows how to calculate total scores from your database tables

-- 1. Calculate total score for a specific attempt
-- Replace 'YOUR_ATTEMPT_ID' with the actual attempt ID
SELECT 
  qa.id as attempt_id,
  qa.quiz_id,
  qa.student_id,
  qa.status,
  qa.score as current_score,
  qa.completed_at,
  q.title as quiz_title,
  
  -- Calculate total possible points
  SUM(qq.points) as total_possible_points,
  
  -- Calculate auto-graded points (multiple choice, true/false)
  SUM(
    CASE 
      WHEN qq.type IN ('multiple_choice', 'true_false') 
           AND qa.answers->>qq.id::text = qq.correct_answer 
      THEN qq.points 
      ELSE 0 
    END
  ) as auto_graded_points,
  
  -- Calculate manual graded points (essay, short answer)
  COALESCE(SUM(qqg.points_awarded), 0) as manual_graded_points,
  
  -- Calculate total score
  (
    SUM(
      CASE 
        WHEN qq.type IN ('multiple_choice', 'true_false') 
             AND qa.answers->>qq.id::text = qq.correct_answer 
        THEN qq.points 
        ELSE 0 
      END
    ) + COALESCE(SUM(qqg.points_awarded), 0)
  ) as calculated_total_score

FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.quiz_questions qq ON q.id = qq.quiz_id
LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id AND qq.id = qqg.question_id
WHERE qa.id = 'YOUR_ATTEMPT_ID'
GROUP BY qa.id, qa.quiz_id, qa.student_id, qa.status, qa.score, qa.completed_at, q.title;

-- 2. Calculate total scores for all attempts that need grading
SELECT 
  qa.id as attempt_id,
  qa.quiz_id,
  qa.student_id,
  qa.status,
  qa.score as current_score,
  q.title as quiz_title,
  
  -- Calculate total possible points
  SUM(qq.points) as total_possible_points,
  
  -- Calculate auto-graded points
  SUM(
    CASE 
      WHEN qq.type IN ('multiple_choice', 'true_false') 
           AND qa.answers->>qq.id::text = qq.correct_answer 
      THEN qq.points 
      ELSE 0 
    END
  ) as auto_graded_points,
  
  -- Calculate manual graded points
  COALESCE(SUM(qqg.points_awarded), 0) as manual_graded_points,
  
  -- Calculate total score
  (
    SUM(
      CASE 
        WHEN qq.type IN ('multiple_choice', 'true_false') 
             AND qa.answers->>qq.id::text = qq.correct_answer 
        THEN qq.points 
        ELSE 0 
      END
    ) + COALESCE(SUM(qqg.points_awarded), 0)
  ) as calculated_total_score,
  
  -- Check if all manual questions are graded
  COUNT(CASE WHEN qq.type IN ('essay', 'short_answer') THEN 1 END) as manual_questions_count,
  COUNT(qqg.id) as graded_manual_questions_count,
  
  -- Status check
  CASE 
    WHEN COUNT(CASE WHEN qq.type IN ('essay', 'short_answer') THEN 1 END) = COUNT(qqg.id)
         AND COUNT(CASE WHEN qq.type IN ('essay', 'short_answer') THEN 1 END) > 0
    THEN 'READY_TO_FINALIZE'
    WHEN COUNT(CASE WHEN qq.type IN ('essay', 'short_answer') THEN 1 END) = 0
    THEN 'AUTO_GRADED'
    ELSE 'NEEDS_MANUAL_GRADING'
  END as grading_status

FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.quiz_questions qq ON q.id = qq.quiz_id
LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id AND qq.id = qqg.question_id
WHERE qa.status = 'completed'
GROUP BY qa.id, qa.quiz_id, qa.student_id, qa.status, qa.score, q.title
ORDER BY qa.completed_at DESC;

-- 3. Update quiz attempt scores (use this to fix scores)
-- Replace 'YOUR_ATTEMPT_ID' with the actual attempt ID
-- Replace 'CALCULATED_SCORE' with the calculated score from query 1
/*
UPDATE public.quiz_attempts 
SET 
  score = CALCULATED_SCORE,
  status = 'graded'
WHERE id = 'YOUR_ATTEMPT_ID';
*/

-- 4. Bulk update all completed attempts with correct scores
-- WARNING: This will update all completed attempts. Use with caution!
/*
WITH calculated_scores AS (
  SELECT 
    qa.id as attempt_id,
    (
      SUM(
        CASE 
          WHEN qq.type IN ('multiple_choice', 'true_false') 
               AND qa.answers->>qq.id::text = qq.correct_answer 
          THEN qq.points 
          ELSE 0 
        END
      ) + COALESCE(SUM(qqg.points_awarded), 0)
    ) as calculated_score
  FROM public.quiz_attempts qa
  JOIN public.quizzes q ON qa.quiz_id = q.id
  JOIN public.quiz_questions qq ON q.id = qq.quiz_id
  LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id AND qq.id = qqg.question_id
  WHERE qa.status = 'completed'
  GROUP BY qa.id
)
UPDATE public.quiz_attempts 
SET 
  score = cs.calculated_score,
  status = 'graded'
FROM calculated_scores cs
WHERE quiz_attempts.id = cs.attempt_id;
*/

-- 5. Check specific attempt details
-- Replace 'YOUR_ATTEMPT_ID' with the actual attempt ID
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

-- 6. Check manual grades for specific attempt
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



































