-- Simple test to check notification creation
-- Run this in Supabase SQL Editor

-- 1. Check if we can access the notifications table
SELECT 'Table accessible' as test, COUNT(*) as count FROM notifications;

-- 2. Check if there are any users in profiles
SELECT 'Users available' as test, COUNT(*) as count FROM profiles;

-- 3. Check if there are any enrollments
SELECT 'Enrollments available' as test, COUNT(*) as count FROM enrollments;

-- 4. Try to create a simple notification (replace with actual user_id)
-- First, let's see what user IDs we have
SELECT id, full_name, role FROM profiles LIMIT 5;

-- 5. Test notification creation with a real user ID
-- Replace 'YOUR_USER_ID_HERE' with an actual user ID from step 4
/*
INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    read
) VALUES (
    'YOUR_USER_ID_HERE',  -- Replace with actual user ID
    'Manual Test Notification',
    'This notification was created manually to test permissions.',
    'course_material',
    false
) RETURNING id, user_id, title;
*/

-- 6. Check RLS policies
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'notifications';

-- 7. Check table permissions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'notifications' 
  AND table_schema = 'public';
