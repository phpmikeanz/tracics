-- Fix Quiz Attempts That Have Manual Grades But Are Still Showing "Pending Grading"
-- This script identifies quiz attempts that have manual grades in quiz_question_grades 
-- but are still marked as "completed" instead of "graded"

-- Step 1: Identify the problem attempts
SELECT 
  'QUIZ ATTEMPTS WITH MANUAL GRADES BUT WRONG STATUS' as section,
  qa.id as attempt_id,
  qa.status as current_status,
  qa.score as current_score,
  q.title as quiz_title,
  p.full_name as student_name,
  p.email as student_email,
  COUNT(qqg.id) as manual_grades_count,
  SUM(qqg.points_awarded) as total_manual_points,
  qa.completed_at
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.profiles p ON qa.student_id = p.id
JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id
WHERE qa.status = 'completed'  -- These should be 'graded' if they have manual grades
GROUP BY qa.id, qa.status, qa.score, q.title, p.full_name, p.email, qa.completed_at
ORDER BY qa.completed_at DESC;

-- Step 2: Calculate correct scores for these attempts
WITH attempt_scores AS (
  SELECT 
    qa.id as attempt_id,
    qa.score as current_score,
    qa.quiz_id,
    qa.answers,
    -- Calculate auto-graded score (multiple choice and true/false)
    COALESCE(SUM(
      CASE 
        WHEN qq.type IN ('multiple_choice', 'true_false') 
             AND qa.answers->qq.id::text = qq.correct_answer::jsonb
        THEN qq.points 
        ELSE 0 
      END
    ), 0) as auto_score,
    -- Get manual graded score
    COALESCE(SUM(qqg.points_awarded), 0) as manual_score
  FROM public.quiz_attempts qa
  JOIN public.quiz_questions qq ON qa.quiz_id = qq.quiz_id
  LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id AND qq.id = qqg.question_id
  WHERE qa.status = 'completed'
    AND EXISTS (
      SELECT 1 FROM public.quiz_question_grades qqg2 
      WHERE qqg2.attempt_id = qa.id
    )
  GROUP BY qa.id, qa.score, qa.quiz_id, qa.answers
)
SELECT 
  'SCORE CALCULATIONS FOR PROBLEM ATTEMPTS' as section,
  attempt_id,
  current_score,
  auto_score,
  manual_score,
  (auto_score + manual_score) as calculated_total,
  CASE 
    WHEN current_score != (auto_score + manual_score) THEN 'SCORE NEEDS UPDATE'
    ELSE 'SCORE CORRECT'
  END as score_status,
  'STATUS NEEDS UPDATE TO GRADED' as status_needed
FROM attempt_scores
ORDER BY attempt_id;

-- Step 3: Show the exact UPDATE statements needed
WITH attempt_scores AS (
  SELECT 
    qa.id as attempt_id,
    -- Calculate correct total score
    COALESCE(SUM(
      CASE 
        WHEN qq.type IN ('multiple_choice', 'true_false') 
             AND qa.answers->qq.id::text = qq.correct_answer::jsonb
        THEN qq.points 
        ELSE 0 
      END
    ), 0) + COALESCE(SUM(qqg.points_awarded), 0) as correct_total_score
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
  'UPDATE STATEMENTS TO FIX THE PROBLEM' as section,
  attempt_id,
  correct_total_score,
  'UPDATE public.quiz_attempts SET status = ''graded'', score = ' || correct_total_score || ' WHERE id = ''' || attempt_id || ''';' as sql_fix_statement
FROM attempt_scores
ORDER BY attempt_id;

-- Step 4: EXECUTE THE FIX (uncomment to run)
-- WARNING: This will update quiz attempts. Review the above statements first!

/*
-- Update all quiz attempts that have manual grades to 'graded' status with correct scores
WITH attempt_scores AS (
  SELECT 
    qa.id as attempt_id,
    -- Calculate correct total score (auto-graded + manual grades)
    COALESCE(SUM(
      CASE 
        WHEN qq.type IN ('multiple_choice', 'true_false') 
             AND qa.answers->qq.id::text = qq.correct_answer::jsonb
        THEN qq.points 
        ELSE 0 
      END
    ), 0) + COALESCE(SUM(qqg.points_awarded), 0) as correct_total_score
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
SET 
  status = 'graded',
  score = attempt_scores.correct_total_score
FROM attempt_scores
WHERE public.quiz_attempts.id = attempt_scores.attempt_id
  AND public.quiz_attempts.status = 'completed';
*/

-- Step 5: Verify the fix worked
SELECT 
  'VERIFICATION AFTER FIX' as section,
  qa.id as attempt_id,
  qa.status as updated_status,
  qa.score as updated_score,
  q.title as quiz_title,
  p.full_name as student_name,
  COUNT(qqg.id) as manual_grades_count
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.profiles p ON qa.student_id = p.id
LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id
WHERE EXISTS (
  SELECT 1 FROM public.quiz_question_grades qqg2 
  WHERE qqg2.attempt_id = qa.id
)
GROUP BY qa.id, qa.status, qa.score, q.title, p.full_name
ORDER BY qa.completed_at DESC;

-- Step 6: Show what students should now see
SELECT 
  'WHAT STUDENTS SHOULD NOW SEE' as section,
  qa.id as attempt_id,
  qa.status as status,
  qa.score as final_score,
  q.title as quiz_title,
  p.full_name as student_name,
  CASE 
    WHEN qa.status = 'graded' THEN 'STUDENT CAN SEE RESULTS'
    WHEN qa.status = 'completed' THEN 'STILL SHOWS PENDING GRADING'
    ELSE 'OTHER STATUS'
  END as student_view
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.profiles p ON qa.student_id = p.id
WHERE EXISTS (
  SELECT 1 FROM public.quiz_question_grades qqg2 
  WHERE qqg2.attempt_id = qa.id
)
ORDER BY qa.completed_at DESC;
