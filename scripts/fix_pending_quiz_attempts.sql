-- Fix Pending Quiz Attempts Script
-- This script identifies and fixes quiz attempts that should be marked as 'graded' 
-- but are still showing as 'completed' status

-- Step 1: Identify quiz attempts that have manual grades but are still 'completed'
SELECT 
  qa.id as attempt_id,
  qa.status as current_status,
  qa.score as current_score,
  q.title as quiz_title,
  p.full_name as student_name,
  p.email as student_email,
  COUNT(qqg.id) as manual_grades_count,
  SUM(qqg.points_awarded) as total_manual_points
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.profiles p ON qa.student_id = p.id
LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id
WHERE qa.status = 'completed'
  AND qa.completed_at IS NOT NULL
GROUP BY qa.id, qa.status, qa.score, q.title, p.full_name, p.email
HAVING COUNT(qqg.id) > 0
ORDER BY qa.completed_at DESC;

-- Step 2: Get detailed information about these quiz attempts
SELECT 
  'DETAILED ANALYSIS' as section,
  qa.id as attempt_id,
  qa.quiz_id,
  qa.status,
  qa.score,
  qa.completed_at,
  q.title as quiz_title
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
WHERE qa.status = 'completed'
  AND qa.id IN (
    SELECT DISTINCT qa2.id 
    FROM public.quiz_attempts qa2
    LEFT JOIN public.quiz_question_grades qqg2 ON qa2.id = qqg2.attempt_id
    WHERE qa2.status = 'completed' 
      AND qqg2.id IS NOT NULL
  );

-- Step 3: Show the questions and grades for these attempts
SELECT 
  'QUESTIONS AND GRADES' as section,
  qa.id as attempt_id,
  qq.id as question_id,
  qq.type as question_type,
  qq.points as max_points,
  qqg.points_awarded,
  qqg.feedback,
  qqg.graded_at
FROM public.quiz_attempts qa
JOIN public.quiz_questions qq ON qa.quiz_id = qq.quiz_id
LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id AND qq.id = qqg.question_id
WHERE qa.status = 'completed'
  AND qa.id IN (
    SELECT DISTINCT qa2.id 
    FROM public.quiz_attempts qa2
    LEFT JOIN public.quiz_question_grades qqg2 ON qa2.id = qqg2.attempt_id
    WHERE qa2.status = 'completed' 
      AND qqg2.id IS NOT NULL
  )
ORDER BY qa.id, qq.order_index;

-- Step 4: Calculate correct scores for each attempt
WITH attempt_scores AS (
  SELECT 
    qa.id as attempt_id,
    qa.current_score,
    -- Auto-graded questions (multiple choice and true/false)
    COALESCE(SUM(
      CASE 
        WHEN qq.type IN ('multiple_choice', 'true_false') 
             AND qa.answers->qq.id::text = qq.correct_answer::jsonb
        THEN qq.points 
        ELSE 0 
      END
    ), 0) as auto_score,
    -- Manual grades (essay and short answer)  
    COALESCE(SUM(qqg.points_awarded), 0) as manual_score,
    -- Total calculated score
    COALESCE(SUM(
      CASE 
        WHEN qq.type IN ('multiple_choice', 'true_false') 
             AND qa.answers->qq.id::text = qq.correct_answer::jsonb
        THEN qq.points 
        ELSE 0 
      END
    ), 0) + COALESCE(SUM(qqg.points_awarded), 0) as calculated_total
  FROM public.quiz_attempts qa
  JOIN public.quiz_questions qq ON qa.quiz_id = qq.quiz_id
  LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id AND qq.id = qqg.question_id
  WHERE qa.status = 'completed'
  GROUP BY qa.id, qa.score
)
SELECT 
  'SCORE CALCULATION' as section,
  attempt_id,
  current_score,
  auto_score,
  manual_score,
  calculated_total,
  CASE 
    WHEN current_score != calculated_total THEN 'NEEDS UPDATE'
    ELSE 'CORRECT'
  END as status
FROM attempt_scores
ORDER BY attempt_id;

-- Step 5: Show the UPDATE statements to fix these attempts
-- (Don't execute automatically - review first)
WITH attempt_scores AS (
  SELECT 
    qa.id as attempt_id,
    COALESCE(SUM(
      CASE 
        WHEN qq.type IN ('multiple_choice', 'true_false') 
             AND qa.answers->qq.id::text = qq.correct_answer::jsonb
        THEN qq.points 
        ELSE 0 
      END
    ), 0) + COALESCE(SUM(qqg.points_awarded), 0) as calculated_total
  FROM public.quiz_attempts qa
  JOIN public.quiz_questions qq ON qa.quiz_id = qq.quiz_id
  LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id AND qq.id = qqg.question_id
  WHERE qa.status = 'completed'
    AND qa.id IN (
      SELECT DISTINCT qa2.id 
      FROM public.quiz_attempts qa2
      LEFT JOIN public.quiz_question_grades qqg2 ON qa2.id = qqg2.attempt_id
      WHERE qa2.status = 'completed' 
        AND qqg2.id IS NOT NULL
    )
  GROUP BY qa.id
)
SELECT 
  'FIX STATEMENTS' as section,
  'UPDATE public.quiz_attempts SET status = ''graded'', score = ' || calculated_total || ' WHERE id = ''' || attempt_id || ''';' as update_statement
FROM attempt_scores
ORDER BY attempt_id;

-- Step 6: Execute the fixes (uncomment to run)
-- WARNING: Review the above statements first!

/*
-- Update all quiz attempts that have manual grades to 'graded' status with correct scores
WITH attempt_scores AS (
  SELECT 
    qa.id as attempt_id,
    COALESCE(SUM(
      CASE 
        WHEN qq.type IN ('multiple_choice', 'true_false') 
             AND qa.answers->qq.id::text = qq.correct_answer::jsonb
        THEN qq.points 
        ELSE 0 
      END
    ), 0) + COALESCE(SUM(qqg.points_awarded), 0) as calculated_total
  FROM public.quiz_attempts qa
  JOIN public.quiz_questions qq ON qa.quiz_id = qq.quiz_id
  LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id AND qq.id = qqg.question_id
  WHERE qa.status = 'completed'
    AND qa.id IN (
      SELECT DISTINCT qa2.id 
      FROM public.quiz_attempts qa2
      LEFT JOIN public.quiz_question_grades qqg2 ON qa2.id = qqg2.attempt_id
      WHERE qa2.status = 'completed' 
        AND qqg2.id IS NOT NULL
    )
  GROUP BY qa.id
)
UPDATE public.quiz_attempts 
SET 
  status = 'graded',
  score = attempt_scores.calculated_total
FROM attempt_scores
WHERE public.quiz_attempts.id = attempt_scores.attempt_id;
*/

-- Step 7: Verify the fixes
SELECT 
  'VERIFICATION' as section,
  qa.id as attempt_id,
  qa.status as final_status,
  qa.score as final_score,
  q.title as quiz_title,
  p.full_name as student_name
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.profiles p ON qa.student_id = p.id
WHERE qa.id IN (
  SELECT DISTINCT qa2.id 
  FROM public.quiz_attempts qa2
  LEFT JOIN public.quiz_question_grades qqg2 ON qa2.id = qqg2.attempt_id
  WHERE qqg2.id IS NOT NULL
)
ORDER BY qa.completed_at DESC;
