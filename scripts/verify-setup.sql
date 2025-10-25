-- Verify Notification System Setup
-- Run this to check if the notification system is properly set up

-- 1. Check if notifications table has all required columns
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- 2. Check if all indexes are created
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename = 'notifications'
ORDER BY indexname;

-- 3. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'notifications';

-- 4. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname;

-- 5. Check if functions exist
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
    'cleanup_old_notifications',
    'send_course_announcement',
    'send_assignment_reminders'
)
ORDER BY routine_name;

-- 6. Check if triggers exist
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%notify%'
ORDER BY trigger_name;

-- 7. Check notification stats view
SELECT * FROM notification_stats LIMIT 1;

-- 8. Test basic notification creation (without user_id to avoid errors)
-- This will show the structure without actually inserting
SELECT 
    'Test notification structure' as test,
    gen_random_uuid() as id,
    'Test User' as user_id,
    'Test Title' as title,
    'Test Message' as message,
    'test' as type,
    false as read,
    now() as created_at;

-- 9. Check if we can query notifications (should work even if empty)
SELECT COUNT(*) as notification_count FROM notifications;

-- 10. Check foreign key constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'notifications'
ORDER BY tc.constraint_name;

-- Success message
SELECT 'Notification system setup verification completed!' as status;
