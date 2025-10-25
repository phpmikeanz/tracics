-- Test Notifications Script
-- Run this AFTER setting up the notification system and when you have real user IDs

-- 1. Test creating a notification for a real user
-- Replace 'your-user-id-here' with an actual user ID from your profiles table
/*
INSERT INTO notifications (
    user_id, 
    title, 
    message, 
    type, 
    read,
    course_id
) VALUES (
    'your-user-id-here'::UUID,
    'Welcome to the LMS!',
    'You have successfully logged in to the Learning Management System.',
    'announcement',
    FALSE,
    NULL
);
*/

-- 2. Test the notification functions
-- Replace 'your-user-id-here' with an actual user ID
/*
SELECT get_notification_count('your-user-id-here'::UUID);
*/

-- 3. Test creating a notification with all fields
-- Replace the UUIDs with real IDs from your database
/*
SELECT create_notification(
    'your-user-id-here'::UUID,
    'Test Notification',
    'This is a test notification to verify the system works',
    'assignment',
    'your-course-id-here'::UUID,
    'your-assignment-id-here'::UUID,
    NULL,
    NULL,
    NULL,
    NULL
);
*/

-- 4. Test marking notification as read
-- Replace with real notification ID
/*
SELECT mark_notification_read('your-notification-id-here'::UUID, 'your-user-id-here'::UUID);
*/

-- 5. Test sending course announcement
-- Replace with real course ID and faculty ID
/*
SELECT send_course_announcement(
    'your-course-id-here'::UUID,
    'Important Update',
    'Please review the updated syllabus for next week.',
    'your-faculty-id-here'::UUID
);
*/

-- 6. Test assignment reminders
/*
SELECT send_assignment_reminders();
*/

-- 7. Check notification statistics
SELECT * FROM notification_stats LIMIT 5;

-- 8. View recent notifications
SELECT 
    n.id,
    n.title,
    n.message,
    n.type,
    n.read,
    n.created_at,
    c.title as course_title,
    a.title as assignment_title,
    q.title as quiz_title
FROM notifications n
LEFT JOIN courses c ON n.course_id = c.id
LEFT JOIN assignments a ON n.assignment_id = a.id
LEFT JOIN quizzes q ON n.quiz_id = q.id
ORDER BY n.created_at DESC
LIMIT 10;

-- 9. Test RLS policies
-- This should only show notifications for the authenticated user
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5;

-- 10. Check if triggers are working
-- Test by updating an assignment submission status
-- (This will only work if you have real assignment submissions)
/*
UPDATE assignment_submissions 
SET status = 'submitted' 
WHERE id = 'your-submission-id-here';
*/

-- 11. Check if enrollment triggers are working
-- Test by creating an enrollment request
-- (This will only work if you have real students and courses)
/*
INSERT INTO enrollments (student_id, course_id, status) 
VALUES ('your-student-id-here'::UUID, 'your-course-id-here'::UUID, 'pending');
*/

-- 12. Clean up test data (optional)
-- Uncomment to remove test notifications
/*
DELETE FROM notifications WHERE title LIKE '%Test%' OR title LIKE '%Welcome%';
*/

-- Success message
SELECT 'Notification system test completed! Check the results above.' as status;
