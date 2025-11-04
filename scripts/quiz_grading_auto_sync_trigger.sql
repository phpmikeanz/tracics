-- PostgreSQL Trigger and Function for Automatic Quiz Grading Sync
-- This automatically updates quiz_attempts.score and status when quiz_question_grades changes

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION sync_quiz_attempt_score()
RETURNS TRIGGER AS $$
DECLARE
    attempt_id_to_update UUID;
    total_score NUMERIC := 0;
    auto_graded_score NUMERIC := 0;
    manual_graded_score NUMERIC := 0;
    quiz_attempt_record RECORD;
BEGIN
    -- Determine which attempt_id to update
    IF TG_OP = 'DELETE' THEN
        attempt_id_to_update := OLD.attempt_id;
    ELSE
        attempt_id_to_update := NEW.attempt_id;
    END IF;
    
    RAISE NOTICE 'Syncing score for attempt_id: %', attempt_id_to_update;
    
    -- Get the quiz attempt details
    SELECT * INTO quiz_attempt_record
    FROM quiz_attempts 
    WHERE id = attempt_id_to_update;
    
    IF NOT FOUND THEN
        RAISE WARNING 'Quiz attempt not found for id: %', attempt_id_to_update;
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Calculate auto-graded score (multiple choice and true/false questions)
    SELECT COALESCE(SUM(qq.points), 0) INTO auto_graded_score
    FROM quiz_questions qq
    WHERE qq.quiz_id = quiz_attempt_record.quiz_id
    AND qq.type IN ('multiple_choice', 'true_false')
    AND quiz_attempt_record.answers->>qq.id::text = qq.correct_answer;
    
    -- Calculate manual graded score (essay and short answer questions)
    SELECT COALESCE(SUM(points_awarded), 0) INTO manual_graded_score
    FROM quiz_question_grades
    WHERE attempt_id = attempt_id_to_update;
    
    -- Calculate total score
    total_score := auto_graded_score + manual_graded_score;
    
    RAISE NOTICE 'Score calculation - Auto: %, Manual: %, Total: %', 
        auto_graded_score, manual_graded_score, total_score;
    
    -- Update the quiz attempt with new score and status
    UPDATE quiz_attempts 
    SET 
        score = total_score,
        status = 'graded'
    WHERE id = attempt_id_to_update;
    
    RAISE NOTICE 'Updated quiz_attempts for id: % with score: % and status: graded', 
        attempt_id_to_update, total_score;
    
    -- Return the appropriate record
    RETURN COALESCE(NEW, OLD);
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in sync_quiz_attempt_score: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 2. Create triggers for INSERT, UPDATE, and DELETE operations
DROP TRIGGER IF EXISTS trigger_sync_quiz_score_insert ON quiz_question_grades;
DROP TRIGGER IF EXISTS trigger_sync_quiz_score_update ON quiz_question_grades;
DROP TRIGGER IF EXISTS trigger_sync_quiz_score_delete ON quiz_question_grades;

-- Trigger for INSERT operations
CREATE TRIGGER trigger_sync_quiz_score_insert
    AFTER INSERT ON quiz_question_grades
    FOR EACH ROW
    EXECUTE FUNCTION sync_quiz_attempt_score();

-- Trigger for UPDATE operations
CREATE TRIGGER trigger_sync_quiz_score_update
    AFTER UPDATE ON quiz_question_grades
    FOR EACH ROW
    EXECUTE FUNCTION sync_quiz_attempt_score();

-- Trigger for DELETE operations
CREATE TRIGGER trigger_sync_quiz_score_delete
    AFTER DELETE ON quiz_question_grades
    FOR EACH ROW
    EXECUTE FUNCTION sync_quiz_attempt_score();

-- 3. Create a function to manually sync all quiz attempts (useful for existing data)
CREATE OR REPLACE FUNCTION sync_all_quiz_attempts()
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
    total_score NUMERIC;
    auto_score NUMERIC;
    manual_score NUMERIC;
BEGIN
    -- Loop through all quiz attempts that have manual grades
    FOR attempt_record IN 
        SELECT DISTINCT qa.id, qa.quiz_id, qa.score as old_score, qa.status as old_status, qa.answers
        FROM quiz_attempts qa
        WHERE EXISTS (
            SELECT 1 FROM quiz_question_grades qqg 
            WHERE qqg.attempt_id = qa.id
        )
    LOOP
        -- Calculate auto-graded score
        SELECT COALESCE(SUM(qq.points), 0) INTO auto_score
        FROM quiz_questions qq
        WHERE qq.quiz_id = attempt_record.quiz_id
        AND qq.type IN ('multiple_choice', 'true_false')
        AND attempt_record.answers->>qq.id::text = qq.correct_answer;
        
        -- Calculate manual graded score
        SELECT COALESCE(SUM(points_awarded), 0) INTO manual_score
        FROM quiz_question_grades
        WHERE attempt_id = attempt_record.id;
        
        -- Calculate total score
        total_score := auto_score + manual_score;
        
        -- Update the quiz attempt
        UPDATE quiz_attempts 
        SET 
            score = total_score,
            status = 'graded'
        WHERE id = attempt_record.id;
        
        -- Return the result
        attempt_id := attempt_record.id;
        old_score := attempt_record.old_score;
        new_score := total_score;
        old_status := attempt_record.old_status;
        new_status := 'graded';
        auto_graded_points := auto_score;
        manual_graded_points := manual_score;
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Test the trigger with a sample operation
-- (This is commented out to avoid actually inserting test data)
/*
-- Test the trigger by inserting a manual grade
INSERT INTO quiz_question_grades (
    attempt_id,
    question_id,
    points_awarded,
    feedback,
    graded_by
) VALUES (
    'your-attempt-id-here',
    'your-question-id-here',
    5,
    'Test feedback',
    'your-user-id-here'
);
*/

-- 5. Verify the triggers were created
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'quiz_question_grades'
AND trigger_name LIKE '%sync_quiz_score%'
ORDER BY trigger_name;

-- 6. Run the sync function for existing data
SELECT * FROM sync_all_quiz_attempts();

-- 7. Verify the function works by checking updated records
SELECT 
    'Sync Verification' as check_type,
    COUNT(*) as total_attempts,
    COUNT(CASE WHEN status = 'graded' THEN 1 END) as graded_attempts,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_attempts,
    AVG(score) as average_score
FROM quiz_attempts qa
WHERE EXISTS (
    SELECT 1 FROM quiz_question_grades qqg 
    WHERE qqg.attempt_id = qa.id
);
















