-- Manual Quiz Score Update Script
-- Use this to manually update quiz scores when the UI button doesn't work

-- 1. Find quiz attempts that need score updates
SELECT 
  'Quiz Attempts Needing Updates' as check_type,
  qa.id as attempt_id,
  qa.status,
  qa.score as current_score,
  q.title as quiz_title,
  p.full_name as student_name,
  COUNT(qqg.id) as manual_grades_count,
  SUM(qqg.points_awarded) as total_manual_points
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.profiles p ON qa.student_id = p.id
LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id
WHERE qa.status = 'completed'
AND qqg.id IS NOT NULL
GROUP BY qa.id, qa.status, qa.score, q.title, p.full_name
ORDER BY qa.completed_at DESC;

-- 2. Create a function to manually update a specific quiz attempt
CREATE OR REPLACE FUNCTION update_quiz_attempt_manually(attempt_id_param UUID)
RETURNS TABLE(
  attempt_id UUID,
  old_score NUMERIC,
  new_score NUMERIC,
  old_status TEXT,
  new_status TEXT,
  auto_graded_points NUMERIC,
  manual_graded_points NUMERIC
) AS $$
DECLARE
  total_auto_score NUMERIC := 0;
  total_manual_score NUMERIC := 0;
  final_score NUMERIC := 0;
  quiz_id_val UUID;
  answers_json JSONB;
  old_score_val NUMERIC;
  old_status_val TEXT;
BEGIN
  -- Get quiz attempt details
  SELECT quiz_id, answers, score, status 
  INTO quiz_id_val, answers_json, old_score_val, old_status_val
  FROM quiz_attempts 
  WHERE id = attempt_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz attempt not found: %', attempt_id_param;
  END IF;
  
  -- Calculate auto-graded score (MC and TF questions)
  SELECT COALESCE(SUM(qq.points), 0) INTO total_auto_score
  FROM quiz_questions qq
  WHERE qq.quiz_id = quiz_id_val
  AND qq.type IN ('multiple_choice', 'true_false')
  AND answers_json->>qq.id::text = qq.correct_answer;
  
  -- Calculate manual graded score (Essay and Short Answer)
  SELECT COALESCE(SUM(points_awarded), 0) INTO total_manual_score
  FROM quiz_question_grades
  WHERE attempt_id = attempt_id_param;
  
  -- Calculate final score
  final_score := total_auto_score + total_manual_score;
  
  -- Update quiz attempt
  UPDATE quiz_attempts 
  SET 
    score = final_score,
    status = 'graded'
  WHERE id = attempt_id_param;
  
  -- Return results
  attempt_id := attempt_id_param;
  old_score := old_score_val;
  new_score := final_score;
  old_status := old_status_val;
  new_status := 'graded';
  auto_graded_points := total_auto_score;
  manual_graded_points := total_manual_score;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 3. Test the function with a specific attempt ID
-- Replace 'YOUR_ATTEMPT_ID' with the actual attempt ID from step 1
/*
SELECT * FROM update_quiz_attempt_manually('YOUR_ATTEMPT_ID');
*/

-- 4. Update all quiz attempts with manual grades at once
CREATE OR REPLACE FUNCTION update_all_quiz_attempts_with_manual_grades()
RETURNS TABLE(
  attempt_id UUID,
  old_score NUMERIC,
  new_score NUMERIC,
  old_status TEXT,
  new_status TEXT,
  auto_graded_points NUMERIC,
  manual_graded_points NUMERIC
) AS $$
DECLARE
  attempt_record RECORD;
BEGIN
  -- Loop through all quiz attempts that have manual grades
  FOR attempt_record IN 
    SELECT DISTINCT qa.id, qa.quiz_id, qa.score, qa.status, qa.answers
    FROM quiz_attempts qa
    WHERE EXISTS (
      SELECT 1 FROM quiz_question_grades qqg 
      WHERE qqg.attempt_id = qa.id
    )
    AND qa.status = 'completed'
  LOOP
    -- Call the update function for each attempt
    RETURN QUERY
    SELECT * FROM update_quiz_attempt_manually(attempt_record.id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Run the bulk update (uncomment to execute)
/*
SELECT * FROM update_all_quiz_attempts_with_manual_grades();
*/

-- 6. Verify the updates worked
SELECT 
  'Verification' as check_type,
  COUNT(*) as total_attempts,
  COUNT(CASE WHEN status = 'graded' THEN 1 END) as graded_attempts,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_attempts,
  AVG(score) as average_score
FROM quiz_attempts qa
WHERE EXISTS (
  SELECT 1 FROM quiz_question_grades qqg 
  WHERE qqg.attempt_id = qa.id
);

-- 7. Clean up functions (optional)
/*
DROP FUNCTION IF EXISTS update_quiz_attempt_manually(UUID);
DROP FUNCTION IF EXISTS update_all_quiz_attempts_with_manual_grades();
*/


















