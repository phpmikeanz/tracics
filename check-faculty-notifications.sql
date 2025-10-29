-- Check Faculty Notifications
-- This script checks if faculty are receiving notifications when students complete quizzes
-- Run this in your Supabase SQL Editor

-- 1. Check if triggers are active
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name LIKE '%quiz%'
ORDER BY trigger_name;

-- 2. Check recent quiz notifications for faculty
SELECT 
    n.id,
    n.title,
    n.message,
    n.type,
    n.read,
    n.created_at,
    p.full_name as user_name,
    p.role,
    q.title as quiz_title,
    c.title as course_title
FROM notifications n
JOIN profiles p ON p.id = n.user_id
LEFT JOIN quizzes q ON q.id = n.quiz_id
LEFT JOIN courses c ON c.id = n.course_id
WHERE n.type = 'quiz'
ORDER BY n.created_at DESC
LIMIT 10;

-- 3. Check faculty notification counts by type
SELECT 
    p.full_name as faculty_name,
    n.type,
    COUNT(*) as notification_count,
    COUNT(CASE WHEN n.read = false THEN 1 END) as unread_count
FROM notifications n
JOIN profiles p ON p.id = n.user_id
WHERE p.role = 'faculty'
GROUP BY p.id, p.full_name, n.type
ORDER BY p.full_name, n.type;

-- 4. Check if there are any quiz attempts that should have triggered notifications
SELECT 
    qa.id as attempt_id,
    qa.status,
    qa.completed_at,
    q.title as quiz_title,
    c.title as course_title,
    p.full_name as student_name,
    c.instructor_id,
    pi.full_name as instructor_name
FROM quiz_attempts qa
JOIN quizzes q ON q.id = qa.quiz_id
JOIN courses c ON c.id = q.course_id
JOIN profiles p ON p.id = qa.student_id
JOIN profiles pi ON pi.id = c.instructor_id
WHERE qa.status IN ('completed', 'graded')
ORDER BY qa.completed_at DESC
LIMIT 10;

-- 5. Check if notifications exist for recent quiz attempts
SELECT 
    qa.id as attempt_id,
    qa.status,
    qa.completed_at,
    q.title as quiz_title,
    c.title as course_title,
    p.full_name as student_name,
    pi.full_name as instructor_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM notifications n 
            WHERE n.attempt_id = qa.id 
            AND n.user_id = c.instructor_id
            AND n.type = 'quiz'
        ) THEN '✅ Has Notification'
        ELSE '❌ Missing Notification'
    END as notification_status
FROM quiz_attempts qa
JOIN quizzes q ON q.id = qa.quiz_id
JOIN courses c ON c.id = q.course_id
JOIN profiles p ON p.id = qa.student_id
JOIN profiles pi ON pi.id = c.instructor_id
WHERE qa.status IN ('completed', 'graded')
ORDER BY qa.completed_at DESC
LIMIT 10;

-- 6. Test creating a notification manually
DO $$
DECLARE
    test_faculty_id UUID;
    test_course_id UUID;
    test_quiz_id UUID;
    test_notification_id UUID;
BEGIN
    -- Get any faculty member
    SELECT id INTO test_faculty_id FROM profiles WHERE role = 'faculty' LIMIT 1;
    
    IF test_faculty_id IS NULL THEN
        RAISE NOTICE '❌ No faculty found';
        RETURN;
    END IF;
    
    -- Get any course and quiz
    SELECT c.id, q.id INTO test_course_id, test_quiz_id
    FROM courses c
    JOIN quizzes q ON q.course_id = c.id
    WHERE c.instructor_id = test_faculty_id
    LIMIT 1;
    
    IF test_course_id IS NULL OR test_quiz_id IS NULL THEN
        RAISE NOTICE '❌ No course or quiz found for faculty';
        RETURN;
    END IF;
    
    -- Create a test notification
    INSERT INTO notifications (
        user_id, title, message, type, course_id, quiz_id, read, created_at
    ) VALUES (
        test_faculty_id,
        '🧪 Test Quiz Notification',
        'This is a test notification to verify the system is working',
        'quiz',
        test_course_id,
        test_quiz_id,
        false,
        NOW()
    ) RETURNING id INTO test_notification_id;
    
    RAISE NOTICE '✅ Test notification created with ID: %', test_notification_id;
    
    -- Clean up test notification
    DELETE FROM notifications WHERE id = test_notification_id;
    RAISE NOTICE '✅ Test notification cleaned up';
    
END $$;

-- 7. Check notification table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. Check for any errors in the notification functions
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name LIKE '%notify%'
AND routine_schema = 'public';

-- 9. Final status message
DO $$
BEGIN
    RAISE NOTICE '🔍 Faculty notification check complete!';
    RAISE NOTICE '📊 Check the results above to see if faculty are receiving quiz notifications.';
END $$;
