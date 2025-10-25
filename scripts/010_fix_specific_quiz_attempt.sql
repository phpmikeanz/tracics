-- Fix the specific quiz attempt that has manual grades but no score
-- Based on the query results showing attempt_id: 2c21b576-d60b-40f9-a04a-f614f8aac104

-- First, let's see the current state
SELECT 
  qa.id,
  qa.status,
  qa.score,
  qa.completed_at,
  q.title as quiz_title
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
WHERE qa.id = '2c21b576-d60b-40f9-a04a-f614f8aac104';

-- Check the manual grades for this attempt
SELECT 
  qqg.question_id,
  qqg.points_awarded,
  qqg.feedback,
  qqg.graded_at
FROM public.quiz_question_grades qqg
WHERE qqg.attempt_id = '2c21b576-d60b-40f9-a04a-f614f8aac104';

-- Calculate the total score (manual grades + auto-graded questions)
-- First, get all questions for this quiz
SELECT 
  qq.id as question_id,
  qq.type,
  qq.points,
  qq.correct_answer,
  qa.answers->qq.id as student_answer
FROM public.quiz_questions qq
JOIN public.quiz_attempts qa ON qq.quiz_id = qa.quiz_id
WHERE qa.id = '2c21b576-d60b-40f9-a04a-f614f8aac104'
ORDER BY qq.order_index;

-- Now update the attempt with the correct score and status
-- Based on the query results, we have 50 points from manual grades
-- We need to add any auto-graded points for multiple choice/true-false questions

UPDATE public.quiz_attempts 
SET 
  status = 'graded',
  score = (
    -- Calculate total score: manual grades + auto-graded questions
    COALESCE((
      SELECT SUM(qqg.points_awarded) 
      FROM public.quiz_question_grades qqg 
      WHERE qqg.attempt_id = '2c21b576-d60b-40f9-a04a-f614f8aac104'
    ), 0) +
    COALESCE((
      SELECT SUM(qq.points)
      FROM public.quiz_questions qq
      JOIN public.quiz_attempts qa ON qq.quiz_id = qa.quiz_id
      WHERE qa.id = '2c21b576-d60b-40f9-a04a-f614f8aac104'
      AND qq.type IN ('multiple_choice', 'true_false')
      AND qa.answers->qq.id = qq.correct_answer
    ), 0)
  )
WHERE id = '2c21b576-d60b-40f9-a04a-f614f8aac104';

-- Verify the update
SELECT 
  qa.id,
  qa.status,
  qa.score,
  qa.completed_at,
  q.title as quiz_title
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
WHERE qa.id = '2c21b576-d60b-40f9-a04a-f614f8aac104';
