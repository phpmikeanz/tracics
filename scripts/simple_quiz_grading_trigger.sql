-- Simple Quiz Grading Auto-Sync Trigger
-- Automatically updates quiz_attempts.score and status when quiz_question_grades changes

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION update_quiz_attempt_score()
RETURNS TRIGGER AS $$
DECLARE
    target_attempt_id UUID;
    total_manual_score NUMERIC := 0;
    total_auto_score NUMERIC := 0;
    final_score NUMERIC := 0;
    quiz_id_val UUID;
    answers_json JSONB;
BEGIN
    -- Get the attempt_id to update
    IF TG_OP = 'DELETE' THEN
        target_attempt_id := OLD.attempt_id;
    ELSE
        target_attempt_id := NEW.attempt_id;
    END IF;
    
    -- Get quiz_id and answers for this attempt
    SELECT quiz_id, answers INTO quiz_id_val, answers_json
    FROM quiz_attempts 
    WHERE id = target_attempt_id;
    
    -- Calculate auto-graded score (MC and TF questions)
    SELECT COALESCE(SUM(qq.points), 0) INTO total_auto_score
    FROM quiz_questions qq
    WHERE qq.quiz_id = quiz_id_val
    AND qq.type IN ('multiple_choice', 'true_false')
    AND answers_json->>qq.id::text = qq.correct_answer;
    
    -- Calculate manual graded score (Essay and Short Answer)
    SELECT COALESCE(SUM(points_awarded), 0) INTO total_manual_score
    FROM quiz_question_grades
    WHERE attempt_id = target_attempt_id;
    
    -- Calculate final score
    final_score := total_auto_score + total_manual_score;
    
    -- Update quiz_attempts with new score and status
    UPDATE quiz_attempts 
    SET 
        score = final_score,
        status = 'graded'
    WHERE id = target_attempt_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 2. Drop existing triggers if they exist
DROP TRIGGER IF EXISTS quiz_grading_sync_insert ON quiz_question_grades;
DROP TRIGGER IF EXISTS quiz_grading_sync_update ON quiz_question_grades;
DROP TRIGGER IF EXISTS quiz_grading_sync_delete ON quiz_question_grades;

-- 3. Create triggers for all operations
CREATE TRIGGER quiz_grading_sync_insert
    AFTER INSERT ON quiz_question_grades
    FOR EACH ROW
    EXECUTE FUNCTION update_quiz_attempt_score();

CREATE TRIGGER quiz_grading_sync_update
    AFTER UPDATE ON quiz_question_grades
    FOR EACH ROW
    EXECUTE FUNCTION update_quiz_attempt_score();

CREATE TRIGGER quiz_grading_sync_delete
    AFTER DELETE ON quiz_question_grades
    FOR EACH ROW
    EXECUTE FUNCTION update_quiz_attempt_score();

-- 4. Test the trigger (uncomment and modify with real IDs to test)
/*
-- Example test:
INSERT INTO quiz_question_grades (
    attempt_id,
    question_id,
    points_awarded,
    feedback,
    graded_by
) VALUES (
    'your-attempt-id',
    'your-question-id',
    5,
    'Test feedback',
    'your-user-id'
);
*/

-- 5. Verify triggers were created
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'quiz_question_grades'
ORDER BY trigger_name;















