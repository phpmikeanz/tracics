-- Fix notification permissions and RLS policies
-- Run this in Supabase SQL Editor

-- 1. Check current RLS policies for notifications table
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname;

-- 2. Check if notifications table exists and has the right structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can manage notifications" ON public.notifications;

-- 4. Create simplified RLS policies for notifications
-- Policy for viewing notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

-- Policy for inserting notifications (more permissive for system use)
CREATE POLICY "System can insert notifications" ON public.notifications
FOR INSERT WITH CHECK (true);

-- Alternative: More specific policy for authenticated users
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policy for updating notifications
CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

-- Policy for deleting notifications
CREATE POLICY "Users can delete their own notifications" ON public.notifications
FOR DELETE USING (auth.uid() = user_id);

-- 5. Test notification creation
-- First, get a user ID to test with
DO $$
DECLARE
    test_user_id UUID;
    test_notification_id UUID;
BEGIN
    -- Get any user ID for testing
    SELECT id INTO test_user_id FROM profiles LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Try to create a test notification
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            read
        ) VALUES (
            test_user_id,
            'Test Notification - ' || NOW()::text,
            'This is a test notification to verify permissions work.',
            'course_material',
            false
        ) RETURNING id INTO test_notification_id;
        
        RAISE NOTICE 'Test notification created successfully with ID: %', test_notification_id;
        
        -- Clean up the test notification
        DELETE FROM notifications WHERE id = test_notification_id;
        RAISE NOTICE 'Test notification cleaned up';
    ELSE
        RAISE NOTICE 'No users found in profiles table';
    END IF;
END $$;

-- 6. Check if the test worked
SELECT 
    'Notifications table accessible' as test_name,
    COUNT(*) as notification_count
FROM notifications;

-- 7. Show recent notifications if any exist
SELECT 
    id,
    user_id,
    title,
    type,
    created_at
FROM notifications 
ORDER BY created_at DESC 
LIMIT 5;
