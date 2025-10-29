-- Fix Quiz Notification System - Corrected Version
-- This script fixes the faculty notification system for quiz completions
-- Run this in your Supabase SQL Editor

-- 1. First, check current trigger status
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%quiz%' 
   OR trigger_name LIKE '%notify%'
ORDER BY trigger_name;

-- 2. Drop all existing quiz notification triggers to avoid conflicts
DROP TRIGGER IF EXISTS trigger_notify_faculty_quiz_completion ON quiz_attempts;
DROP TRIGGER IF EXISTS trigger_notify_quiz_attempt ON quiz_attempts;
DROP TRIGGER IF EXISTS trigger_notify_student_quiz_graded ON quiz_attempts;
DROP TRIGGER IF EXISTS trigger_notify_quiz_completion ON quiz_attempts;
DROP TRIGGER IF EXISTS trigger_notify_quiz_graded ON quiz_attempts;
DROP TRIGGER IF EXISTS trigger_notify_quiz_completion_insert ON quiz_attempts;
DROP TRIGGER IF EXISTS trigger_notify_quiz_completion_update ON quiz_attempts;

-- 3. Drop existing functions to recreate them properly
DROP FUNCTION IF EXISTS notify_faculty_quiz_completion();
DROP FUNCTION IF EXISTS notify_quiz_attempt();
DROP FUNCTION IF EXISTS notify_student_quiz_graded();
DROP FUNCTION IF EXISTS notify_quiz_completion();
DROP FUNCTION IF EXISTS notify_quiz_graded();

-- 4. Create a comprehensive quiz notification function
CREATE OR REPLACE FUNCTION notify_quiz_completion()
RETURNS TRIGGER AS $$
DECLARE
    course_instructor_id UUID;
    student_name TEXT;
    quiz_title TEXT;
    course_title TEXT;
    course_id UUID;
    score_text TEXT;
    notification_id UUID;
BEGIN
    -- Get course instructor and details
    SELECT c.instructor_id, c.title, q.title, p.full_name, q.course_id
    INTO course_instructor_id, course_title, quiz_title, student_name, course_id
    FROM courses c
    JOIN quizzes q ON q.id = NEW.quiz_id
    JOIN profiles p ON p.id = NEW.student_id
    WHERE c.id = q.course_id;
    
    -- Only process if we found the instructor
    IF course_instructor_id IS NULL THEN
        RAISE NOTICE 'No instructor found for quiz %', NEW.quiz_id;
        RETURN NEW;
    END IF;
    
    -- Format score text
    score_text := CASE 
        WHEN NEW.score IS NOT NULL THEN ' (Score: ' || NEW.score || ')'
        ELSE ' (Score: Pending)'
    END;
    
    -- Notify faculty of quiz completion
    INSERT INTO notifications (
        user_id, title, message, type, course_id, quiz_id, attempt_id, read, created_at
    ) VALUES (
        course_instructor_id,
        '📊 Quiz Completed',
        student_name || ' completed "' || quiz_title || '" in ' || course_title || score_text,
        'quiz',
        course_id,
        NEW.quiz_id,
        NEW.id,
        false,
        NOW()
    ) RETURNING id INTO notification_id;
    
    RAISE NOTICE 'Faculty notification created with ID: %', notification_id;
    
    -- Notify student of completion
    INSERT INTO notifications (
        user_id, title, message, type, course_id, quiz_id, attempt_id, read, created_at
    ) VALUES (
        NEW.student_id,
        '🎯 Quiz Completed!',
        'You completed "' || quiz_title || '" in ' || course_title || score_text,
        'quiz',
        course_id,
        NEW.quiz_id,
        NEW.id,
        false,
        NOW()
    );
    
    RAISE NOTICE 'Student notification created for quiz completion: %', quiz_title;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function for quiz grading notifications
CREATE OR REPLACE FUNCTION notify_quiz_graded()
RETURNS TRIGGER AS $$
DECLARE
    quiz_title TEXT;
    course_title TEXT;
    course_id UUID;
    percentage TEXT;
    notification_id UUID;
BEGIN
    -- Only notify when status changes to 'graded'
    IF NEW.status = 'graded' AND (OLD.status IS NULL OR OLD.status != 'graded') THEN
        -- Get quiz and course details
        SELECT q.title, c.title, q.course_id
        INTO quiz_title, course_title, course_id
        FROM quizzes q
        JOIN courses c ON c.id = q.course_id
        WHERE q.id = NEW.quiz_id;
        
        -- Calculate percentage if score exists
        IF NEW.score IS NOT NULL THEN
            percentage := ' (' || ROUND((NEW.score::DECIMAL / 100) * 100, 1) || '%)';
        ELSE
            percentage := '';
        END IF;
        
        -- Notify student of grade
        INSERT INTO notifications (
            user_id, title, message, type, course_id, quiz_id, attempt_id, read, created_at
        ) VALUES (
            NEW.student_id,
            '🎉 Quiz Graded!',
            'Your quiz "' || quiz_title || '" in ' || course_title || ' has been graded: ' || 
            COALESCE(NEW.score::text, 'N/A') || '/100' || percentage,
            'grade',
            course_id,
            NEW.quiz_id,
            NEW.id,
            false,
            NOW()
        ) RETURNING id INTO notification_id;
        
        RAISE NOTICE 'Student grade notification created with ID: %', notification_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create the triggers with proper conditions
-- Quiz completion trigger for INSERT - fires when new attempt is created with 'completed' status
CREATE TRIGGER trigger_notify_quiz_completion_insert
    AFTER INSERT ON quiz_attempts
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION notify_quiz_completion();

-- Quiz completion trigger for UPDATE - fires when status changes to 'completed'
CREATE TRIGGER trigger_notify_quiz_completion_update
    AFTER UPDATE ON quiz_attempts
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION notify_quiz_completion();

-- Quiz graded trigger - fires when status changes to 'graded'
CREATE TRIGGER trigger_notify_quiz_graded
    AFTER UPDATE ON quiz_attempts
    FOR EACH ROW
    WHEN (NEW.status = 'graded' AND OLD.status != 'graded')
    EXECUTE FUNCTION notify_quiz_graded();

-- 7. Grant necessary permissions
GRANT EXECUTE ON FUNCTION notify_quiz_completion() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_quiz_graded() TO authenticated;

-- 8. Test the notification system
DO $$
DECLARE
    test_student_id UUID;
    test_faculty_id UUID;
    test_course_id UUID;
    test_quiz_id UUID;
    test_attempt_id UUID;
    notification_count INTEGER;
BEGIN
    -- Get test data
    SELECT id INTO test_student_id FROM profiles WHERE role = 'student' LIMIT 1;
    SELECT id INTO test_faculty_id FROM profiles WHERE role = 'faculty' LIMIT 1;
    SELECT id INTO test_course_id FROM courses WHERE instructor_id = test_faculty_id LIMIT 1;
    SELECT id INTO test_quiz_id FROM quizzes WHERE course_id = test_course_id LIMIT 1;
    
    IF test_student_id IS NULL OR test_faculty_id IS NULL OR test_course_id IS NULL OR test_quiz_id IS NULL THEN
        RAISE NOTICE '❌ Missing test data. Please ensure you have students, faculty, courses, and quizzes.';
        RETURN;
    END IF;
    
    RAISE NOTICE '🧪 Testing quiz notification system...';
    RAISE NOTICE 'Student ID: %', test_student_id;
    RAISE NOTICE 'Faculty ID: %', test_faculty_id;
    RAISE NOTICE 'Course ID: %', test_course_id;
    RAISE NOTICE 'Quiz ID: %', test_quiz_id;
    
    -- Count notifications before test
    SELECT COUNT(*) INTO notification_count FROM notifications WHERE user_id = test_faculty_id;
    RAISE NOTICE 'Faculty notifications before test: %', notification_count;
    
    -- Create a test quiz attempt
    INSERT INTO quiz_attempts (
        quiz_id, student_id, answers, score, status, completed_at
    ) VALUES (
        test_quiz_id,
        test_student_id,
        '{}',
        85,
        'completed',
        NOW()
    ) RETURNING id INTO test_attempt_id;
    
    RAISE NOTICE 'Test quiz attempt created with ID: %', test_attempt_id;
    
    -- Wait a moment for triggers to fire
    PERFORM pg_sleep(1);
    
    -- Count notifications after test
    SELECT COUNT(*) INTO notification_count FROM notifications WHERE user_id = test_faculty_id;
    RAISE NOTICE 'Faculty notifications after test: %', notification_count;
    
    -- Check if faculty received notification
    IF EXISTS (
        SELECT 1 FROM notifications 
        WHERE user_id = test_faculty_id 
        AND type = 'quiz' 
        AND title = '📊 Quiz Completed'
    ) THEN
        RAISE NOTICE '✅ Faculty notification created successfully!';
    ELSE
        RAISE NOTICE '❌ Faculty notification NOT created!';
    END IF;
    
    -- Check if student received notification
    IF EXISTS (
        SELECT 1 FROM notifications 
        WHERE user_id = test_student_id 
        AND type = 'quiz' 
        AND title = '🎯 Quiz Completed!'
    ) THEN
        RAISE NOTICE '✅ Student notification created successfully!';
    ELSE
        RAISE NOTICE '❌ Student notification NOT created!';
    END IF;
    
    -- Clean up test data
    DELETE FROM quiz_attempts WHERE id = test_attempt_id;
    DELETE FROM notifications WHERE attempt_id = test_attempt_id;
    
    RAISE NOTICE '🧹 Test data cleaned up';
    
END $$;

-- 9. Create a function to check quiz notification status
CREATE OR REPLACE FUNCTION check_quiz_notification_status()
RETURNS TABLE (
    trigger_name TEXT,
    table_name TEXT,
    status TEXT,
    function_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.trigger_name::TEXT,
        t.event_object_table::TEXT,
        '✅ Active'::TEXT as status,
        t.action_statement::TEXT as function_name
    FROM information_schema.triggers t
    WHERE t.trigger_name IN (
        'trigger_notify_quiz_completion_insert',
        'trigger_notify_quiz_completion_update',
        'trigger_notify_quiz_graded'
    )
    UNION ALL
    SELECT 
        'trigger_notify_quiz_completion_insert'::TEXT,
        'quiz_attempts'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.triggers t2
                WHERE t2.trigger_name = 'trigger_notify_quiz_completion_insert'
            ) THEN '✅ Active'
            ELSE '❌ Missing'
        END,
        'notify_quiz_completion()'::TEXT
    UNION ALL
    SELECT 
        'trigger_notify_quiz_completion_update'::TEXT,
        'quiz_attempts'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.triggers t3
                WHERE t3.trigger_name = 'trigger_notify_quiz_completion_update'
            ) THEN '✅ Active'
            ELSE '❌ Missing'
        END,
        'notify_quiz_completion()'::TEXT
    UNION ALL
    SELECT 
        'trigger_notify_quiz_graded'::TEXT,
        'quiz_attempts'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.triggers t4
                WHERE t4.trigger_name = 'trigger_notify_quiz_graded'
            ) THEN '✅ Active'
            ELSE '❌ Missing'
        END,
        'notify_quiz_graded()'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 10. Check the status
SELECT * FROM check_quiz_notification_status();

-- 11. Show recent quiz notifications
SELECT 
    n.title,
    n.message,
    n.type,
    n.created_at,
    p.full_name as user_name,
    p.role
FROM notifications n
JOIN profiles p ON p.id = n.user_id
WHERE n.type = 'quiz'
ORDER BY n.created_at DESC
LIMIT 10;

-- 12. Final status message
DO $$
BEGIN
    RAISE NOTICE '🎉 Quiz notification system fix complete!';
    RAISE NOTICE '📊 Faculty will now receive notifications when students complete quizzes';
    RAISE NOTICE '🎯 Students will receive notifications when their quizzes are graded';
    RAISE NOTICE '🔔 All notifications will appear in the notification bell';
END $$;
