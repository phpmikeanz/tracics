-- Fix RLS policies for notifications table to allow quiz submission triggers
-- This fixes the "new row violates row-level security policy for table 'notifications'" error

-- 1. First, let's see what policies currently exist
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

-- 2. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow creating notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Faculty can view course notifications" ON public.notifications;
DROP POLICY IF EXISTS "Faculty can view course notifications" ON public.notifications;

-- 3. Create comprehensive RLS policies for notifications

-- Policy 1: Users can view their own notifications
CREATE POLICY "notifications_select_own" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: System can insert notifications (for triggers and automated processes)
-- This is the key policy that was missing - it allows database triggers to insert notifications
CREATE POLICY "notifications_insert_system" ON public.notifications
FOR INSERT WITH CHECK (true);

-- Policy 3: Users can update their own notifications (mark as read, etc.)
CREATE POLICY "notifications_update_own" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

-- Policy 4: Users can delete their own notifications
CREATE POLICY "notifications_delete_own" ON public.notifications
FOR DELETE USING (auth.uid() = user_id);

-- Policy 5: Faculty can view notifications for their courses
CREATE POLICY "notifications_select_faculty_courses" ON public.notifications
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM courses 
    WHERE courses.id = notifications.course_id 
    AND courses.instructor_id = auth.uid()
  )
);

-- 4. Ensure the notifications table has RLS enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO anon;

-- 6. Test the policies by checking if we can see them
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

-- 7. Test notification creation (this should work now)
-- This is a test to verify the policies work
DO $$
DECLARE
  test_user_id UUID;
  notification_id UUID;
BEGIN
  -- Get a test user ID
  SELECT id INTO test_user_id FROM profiles LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Try to insert a test notification
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      read,
      created_at
    ) VALUES (
      test_user_id,
      'Test Notification',
      'This is a test notification to verify RLS policies work',
      'test',
      false,
      NOW()
    ) RETURNING id INTO notification_id;
    
    RAISE NOTICE 'Test notification created successfully with ID: %', notification_id;
    
    -- Clean up the test notification
    DELETE FROM notifications WHERE id = notification_id;
    RAISE NOTICE 'Test notification cleaned up';
  ELSE
    RAISE NOTICE 'No users found in profiles table';
  END IF;
END $$;
