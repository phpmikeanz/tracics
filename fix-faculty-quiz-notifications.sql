-- Fix Faculty Quiz Notifications
-- This script ensures faculty receive notifications when students complete quizzes
-- Run this in your Supabase SQL Editor

-- 1. First, let's check the current state
SELECT 'Current trigger status:' as status;
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name LIKE '%quiz%'
ORDER BY trigger_name;

-- 2. Check recent notifications
SELECT 'Recent quiz notifications:' as status;
SELECT 
    n.title,
    n.message,
    n.type,
    n.read,
    n.created_at,
    p.full_name as user_name,
    p.role
FROM notifications n
JOIN profiles p ON p.id = n.user_id
WHERE n.type = 'quiz'
ORDER BY n.created_at DESC
LIMIT 5;

-- 3. Drop and recreate the notification functions to ensure they work
DROP FUNCTION IF EXISTS notify_quiz_completion();
DROP FUNCTION IF EXISTS notify_quiz_graded();

-- 4. Create improved quiz completion notification function
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
    
    RAISE NOTICE 'Faculty notification created with ID: % for quiz: %', notification_id, quiz_title;
    
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
    
    RAISE NOTICE 'Student notification created for quiz: %', quiz_title;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in notify_quiz_completion: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create improved quiz grading notification function
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
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in notify_quiz_graded: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Drop existing triggers
DROP TRIGGER IF EXISTS trigger_notify_quiz_completion_insert ON quiz_attempts;
DROP TRIGGER IF EXISTS trigger_notify_quiz_completion_update ON quiz_attempts;
DROP TRIGGER IF EXISTS trigger_notify_quiz_graded ON quiz_attempts;

-- 7. Create new triggers
CREATE TRIGGER trigger_notify_quiz_completion_insert
    AFTER INSERT ON quiz_attempts
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION notify_quiz_completion();

CREATE TRIGGER trigger_notify_quiz_completion_update
    AFTER UPDATE ON quiz_attempts
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION notify_quiz_completion();

CREATE TRIGGER trigger_notify_quiz_graded
    AFTER UPDATE ON quiz_attempts
    FOR EACH ROW
    WHEN (NEW.status = 'graded' AND OLD.status != 'graded')
    EXECUTE FUNCTION notify_quiz_graded();

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION notify_quiz_completion() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_quiz_graded() TO authenticated;

-- 9. Test the system
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
    
    RAISE NOTICE '🧪 Testing faculty quiz notifications...';
    RAISE NOTICE 'Student: %', test_student_id;
    RAISE NOTICE 'Faculty: %', test_faculty_id;
    RAISE NOTICE 'Course: %', test_course_id;
    RAISE NOTICE 'Quiz: %', test_quiz_id;
    
    -- Count notifications before test
    SELECT COUNT(*) INTO notification_count FROM notifications WHERE user_id = test_faculty_id;
    RAISE NOTICE 'Faculty notifications before: %', notification_count;
    
    -- Create a test quiz attempt
    INSERT INTO quiz_attempts (
        quiz_id, student_id, answers, score, status, completed_at
    ) VALUES (
        test_quiz_id,
        test_student_id,
        '{"test": "answer"}',
        85,
        'completed',
        NOW()
    ) RETURNING id INTO test_attempt_id;
    
    RAISE NOTICE 'Test quiz attempt created: %', test_attempt_id;
    
    -- Wait for triggers to fire
    PERFORM pg_sleep(2);
    
    -- Count notifications after test
    SELECT COUNT(*) INTO notification_count FROM notifications WHERE user_id = test_faculty_id;
    RAISE NOTICE 'Faculty notifications after: %', notification_count;
    
    -- Check if faculty received notification
    IF EXISTS (
        SELECT 1 FROM notifications 
        WHERE user_id = test_faculty_id 
        AND type = 'quiz' 
        AND title = '📊 Quiz Completed'
        AND attempt_id = test_attempt_id
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
        AND attempt_id = test_attempt_id
    ) THEN
        RAISE NOTICE '✅ Student notification created successfully!';
    ELSE
        RAISE NOTICE '❌ Student notification NOT created!';
    END IF;
    
    -- Clean up test data
    DELETE FROM notifications WHERE attempt_id = test_attempt_id;
    DELETE FROM quiz_attempts WHERE id = test_attempt_id;
    
    RAISE NOTICE '🧹 Test data cleaned up';
    
END $$;

-- 10. Show final status
SELECT 'Final trigger status:' as status;
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name LIKE '%quiz%'
ORDER BY trigger_name;

-- 11. Show recent notifications
SELECT 'Recent notifications:' as status;
SELECT 
    n.title,
    n.message,
    n.type,
    n.read,
    n.created_at,
    p.full_name as user_name,
    p.role
FROM notifications n
JOIN profiles p ON p.id = n.user_id
WHERE n.type = 'quiz'
ORDER BY n.created_at DESC
LIMIT 5;

RAISE NOTICE '🎉 Faculty quiz notification fix complete!';
RAISE NOTICE '📊 Faculty should now receive notifications when students complete quizzes';
RAISE NOTICE '🔔 Check the notification bell to see the notifications';
