-- Test script to verify notification system setup with course_materials
-- Run this after setup-notification-system.sql to verify everything works

-- Test 1: Check if notifications table exists and has correct structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- Test 2: Check if course_materials table exists
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'course_materials' 
ORDER BY ordinal_position;

-- Test 3: Check if assignments table has course_material_id
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'assignments' 
ORDER BY ordinal_position;

-- Test 4: Check if quizzes table has course_material_id
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'quizzes' 
ORDER BY ordinal_position;

-- Test 5: Check if enrollments table has course_material_id
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'enrollments' 
ORDER BY ordinal_position;

-- Test 6: Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('notifications', 'enrollments')
ORDER BY tablename, policyname;

-- Test 7: Check indexes
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('notifications', 'assignments', 'quizzes', 'enrollments')
ORDER BY tablename, indexname;

-- Test 8: Check functions
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name IN (
    'get_notification_count',
    'mark_notification_read',
    'mark_all_notifications_read',
    'create_notification',
    'cleanup_old_notifications'
)
ORDER BY routine_name;

-- Test 9: Check if we can create a test notification (replace with actual user ID)
-- This will only work if you have a valid user ID
/*
SELECT create_notification(
    'your-user-id-here'::UUID,
    'Test Notification',
    'This is a test notification to verify the system works',
    'test',
    NULL,
    NULL,
    NULL
);
*/

-- Test 10: Check notification stats view
SELECT * FROM notification_stats LIMIT 5;

-- If all tests pass, your notification system is properly set up!
SELECT 'Notification system setup verification complete!' as status;
