-- Debug Quiz Grading Relationship Issues
-- This script checks the relationship between quiz_attempts and quiz_question_grades tables

-- Step 1: Check the structure of both tables
SELECT 'QUIZ_ATTEMPTS TABLE STRUCTURE' as section;
\d public.quiz_attempts;

SELECT 'QUIZ_QUESTION_GRADES TABLE STRUCTURE' as section;
\d public.quiz_question_grades;

-- Step 2: Check if there are quiz attempts that are 'completed' but should be 'graded'
SELECT 
  'COMPLETED ATTEMPTS WITH MANUAL GRADES' as section,
  qa.id as attempt_id,
  qa.status as current_status,
  qa.score as current_score,
  qa.completed_at,
  q.title as quiz_title,
  p.full_name as student_name,
  COUNT(qqg.id) as manual_grades_count,
  STRING_AGG(qqg.question_id::text, ', ') as graded_questions,
  SUM(qqg.points_awarded) as total_manual_points
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.profiles p ON qa.student_id = p.id
LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id
WHERE qa.status = 'completed'
  AND qa.completed_at IS NOT NULL
GROUP BY qa.id, qa.status, qa.score, qa.completed_at, q.title, p.full_name
ORDER BY qa.completed_at DESC;

-- Step 3: Check for orphaned manual grades (grades without valid attempts)
SELECT 
  'ORPHANED MANUAL GRADES' as section,
  qqg.id as grade_id,
  qqg.attempt_id,
  qqg.question_id,
  qqg.points_awarded,
  qqg.graded_at,
  CASE 
    WHEN qa.id IS NULL THEN 'ORPHANED - No matching attempt'
    ELSE 'LINKED - Attempt exists'
  END as status
FROM public.quiz_question_grades qqg
LEFT JOIN public.quiz_attempts qa ON qqg.attempt_id = qa.id
ORDER BY qqg.graded_at DESC;

-- Step 4: Check for attempts that have manual grades but wrong status
SELECT 
  'ATTEMPTS WITH GRADES BUT WRONG STATUS' as section,
  qa.id as attempt_id,
  qa.status as current_status,
  qa.score as current_score,
  COUNT(qqg.id) as manual_grades_count,
  SUM(qqg.points_awarded) as total_manual_points,
  CASE 
    WHEN COUNT(qqg.id) > 0 AND qa.status != 'graded' THEN 'NEEDS FIX'
    ELSE 'OK'
  END as fix_needed
FROM public.quiz_attempts qa
LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id
GROUP BY qa.id, qa.status, qa.score
HAVING COUNT(qqg.id) > 0 AND qa.status != 'graded'
ORDER BY qa.completed_at DESC;

-- Step 5: Detailed view of a specific attempt (replace with actual attempt ID)
-- Find the most recent completed attempt for testing
WITH recent_attempt AS (
  SELECT qa.id as attempt_id
  FROM public.quiz_attempts qa
  WHERE qa.status = 'completed'
    AND qa.completed_at IS NOT NULL
  ORDER BY qa.completed_at DESC
  LIMIT 1
)
SELECT 
  'DETAILED ATTEMPT ANALYSIS' as section,
  'Attempt Details' as subsection,
  qa.id as attempt_id,
  qa.quiz_id,
  qa.student_id,
  qa.status,
  qa.score,
  qa.started_at,
  qa.completed_at,
  qa.answers::text as answers_json,
  q.title as quiz_title,
  p.full_name as student_name,
  p.email as student_email
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.profiles p ON qa.student_id = p.id
JOIN recent_attempt ra ON qa.id = ra.attempt_id;

-- Step 6: Show questions for the recent attempt
WITH recent_attempt AS (
  SELECT qa.id as attempt_id, qa.quiz_id, qa.answers
  FROM public.quiz_attempts qa
  WHERE qa.status = 'completed'
    AND qa.completed_at IS NOT NULL
  ORDER BY qa.completed_at DESC
  LIMIT 1
)
SELECT 
  'QUESTIONS FOR RECENT ATTEMPT' as section,
  ra.attempt_id,
  qq.id as question_id,
  qq.type as question_type,
  qq.question,
  qq.points as max_points,
  qq.correct_answer,
  ra.answers->qq.id::text as student_answer,
  qqg.points_awarded as manual_points,
  qqg.feedback as manual_feedback,
  qqg.graded_at,
  CASE 
    WHEN qq.type IN ('multiple_choice', 'true_false') THEN 
      CASE WHEN ra.answers->qq.id::text = qq.correct_answer::jsonb THEN 'CORRECT' ELSE 'INCORRECT' END
    WHEN qq.type IN ('short_answer', 'essay') THEN
      CASE WHEN qqg.id IS NOT NULL THEN 'MANUALLY_GRADED' ELSE 'NOT_GRADED' END
    ELSE 'UNKNOWN'
  END as grading_status
FROM recent_attempt ra
JOIN public.quiz_questions qq ON ra.quiz_id = qq.quiz_id
LEFT JOIN public.quiz_question_grades qqg ON ra.attempt_id = qqg.attempt_id AND qq.id = qqg.question_id
ORDER BY qq.order_index;

-- Step 7: Calculate what the correct score should be for the recent attempt
WITH recent_attempt AS (
  SELECT qa.id as attempt_id, qa.quiz_id, qa.answers, qa.score as current_score
  FROM public.quiz_attempts qa
  WHERE qa.status = 'completed'
    AND qa.completed_at IS NOT NULL
  ORDER BY qa.completed_at DESC
  LIMIT 1
),
score_calculation AS (
  SELECT 
    ra.attempt_id,
    ra.current_score,
    SUM(
      CASE 
        WHEN qq.type IN ('multiple_choice', 'true_false') AND ra.answers->qq.id::text = qq.correct_answer::jsonb 
        THEN qq.points 
        ELSE 0 
      END
    ) as auto_score,
    SUM(COALESCE(qqg.points_awarded, 0)) as manual_score,
    SUM(
      CASE 
        WHEN qq.type IN ('multiple_choice', 'true_false') AND ra.answers->qq.id::text = qq.correct_answer::jsonb 
        THEN qq.points 
        ELSE 0 
      END
    ) + SUM(COALESCE(qqg.points_awarded, 0)) as calculated_total
  FROM recent_attempt ra
  JOIN public.quiz_questions qq ON ra.quiz_id = qq.quiz_id
  LEFT JOIN public.quiz_question_grades qqg ON ra.attempt_id = qqg.attempt_id AND qq.id = qqg.question_id
  GROUP BY ra.attempt_id, ra.current_score
)
SELECT 
  'SCORE CALCULATION FOR RECENT ATTEMPT' as section,
  attempt_id,
  current_score,
  auto_score,
  manual_score,
  calculated_total,
  CASE 
    WHEN current_score != calculated_total THEN 'SCORE MISMATCH - NEEDS UPDATE'
    ELSE 'SCORE CORRECT'
  END as score_status,
  CASE 
    WHEN manual_score > 0 THEN 'STATUS SHOULD BE GRADED'
    ELSE 'STATUS CAN REMAIN COMPLETED'
  END as status_recommendation
FROM score_calculation;

-- Step 8: Check RLS policies that might be blocking updates
SELECT 
  'RLS POLICIES' as section,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('quiz_attempts', 'quiz_question_grades')
ORDER BY tablename, policyname;

-- Step 9: Test query to see if manual grades are actually being retrieved correctly
SELECT 
  'MANUAL GRADES TEST' as section,
  qqg.id,
  qqg.attempt_id,
  qqg.question_id,
  qqg.points_awarded,
  qqg.feedback,
  qqg.graded_by,
  qqg.graded_at,
  qa.status as attempt_status,
  qa.score as attempt_score
FROM public.quiz_question_grades qqg
JOIN public.quiz_attempts qa ON qqg.attempt_id = qa.id
ORDER BY qqg.graded_at DESC
LIMIT 10;

-- Step 10: Show the fix query that should be run
WITH attempts_to_fix AS (
  SELECT 
    qa.id as attempt_id,
    SUM(
      CASE 
        WHEN qq.type IN ('multiple_choice', 'true_false') AND qa.answers->qq.id::text = qq.correct_answer::jsonb 
        THEN qq.points 
        ELSE 0 
      END
    ) + SUM(COALESCE(qqg.points_awarded, 0)) as correct_score
  FROM public.quiz_attempts qa
  JOIN public.quiz_questions qq ON qa.quiz_id = qq.quiz_id
  LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id AND qq.id = qqg.question_id
  WHERE qa.status = 'completed'
    AND EXISTS (
      SELECT 1 FROM public.quiz_question_grades qqg2 
      WHERE qqg2.attempt_id = qa.id
    )
  GROUP BY qa.id
)
SELECT 
  'FIX STATEMENTS' as section,
  'UPDATE public.quiz_attempts SET status = ''graded'', score = ' || correct_score || ' WHERE id = ''' || attempt_id || ''';' as sql_statement
FROM attempts_to_fix;

-- Uncomment the following to actually execute the fix:
/*
WITH attempts_to_fix AS (
  SELECT 
    qa.id as attempt_id,
    SUM(
      CASE 
        WHEN qq.type IN ('multiple_choice', 'true_false') AND qa.answers->qq.id::text = qq.correct_answer::jsonb 
        THEN qq.points 
        ELSE 0 
      END
    ) + SUM(COALESCE(qqg.points_awarded, 0)) as correct_score
  FROM public.quiz_attempts qa
  JOIN public.quiz_questions qq ON qa.quiz_id = qq.quiz_id
  LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id AND qq.id = qqg.question_id
  WHERE qa.status = 'completed'
    AND EXISTS (
      SELECT 1 FROM public.quiz_question_grades qqg2 
      WHERE qqg2.attempt_id = qa.id
    )
  GROUP BY qa.id
)
UPDATE public.quiz_attempts 
SET status = 'graded', score = attempts_to_fix.correct_score
FROM attempts_to_fix
WHERE public.quiz_attempts.id = attempts_to_fix.attempt_id;
*/
