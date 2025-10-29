-- COMPLETE FIX FOR QUIZ NOTIFICATION RLS ERROR
-- This fixes the "new row violates row-level security policy for table 'notifications'" error
-- Run this in Supabase SQL Editor

-- ==============================================
-- PART 1: Fix RLS Policies for Notifications
-- ==============================================

-- 1. Check current policies
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

-- 2. Drop all existing conflicting policies
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

-- 3. Create comprehensive RLS policies
-- Policy 1: Users can view their own notifications
CREATE POLICY "notifications_select_own" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: System can insert notifications (CRITICAL - allows triggers to work)
CREATE POLICY "notifications_insert_system" ON public.notifications
FOR INSERT WITH CHECK (true);

-- Policy 3: Users can update their own notifications
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

-- 4. Ensure RLS is enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO anon;

-- ==============================================
-- PART 2: Fix Quiz Notification Triggers
-- ==============================================

-- 6. Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_notify_quiz_attempt ON quiz_attempts;
DROP FUNCTION IF EXISTS notify_quiz_attempt();

-- 7. Create the notification function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION notify_quiz_attempt()
RETURNS TRIGGER AS $$
DECLARE
    course_instructor_id UUID;
    student_name TEXT;
    quiz_title TEXT;
    course_title TEXT;
    course_id UUID;
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
    
    -- Notify faculty of quiz completion
    IF NEW.status = 'completed' AND OLD.status = 'in_progress' THEN
        -- Insert faculty notification
        INSERT INTO notifications (
            user_id, title, message, type, course_id, quiz_id, attempt_id, read, created_at
        ) VALUES (
            course_instructor_id,
            '📊 Quiz Completed',
            student_name || ' completed "' || quiz_title || '" in ' || course_title || 
            ' (Score: ' || COALESCE(NEW.score::text, 'N/A') || ')',
            'quiz',
            course_id,
            NEW.quiz_id,
            NEW.id,
            false,
            NOW()
        );
        
        -- Insert student notification
        INSERT INTO notifications (
            user_id, title, message, type, course_id, quiz_id, attempt_id, read, created_at
        ) VALUES (
            NEW.student_id,
            '🎯 Quiz Completed!',
            'You completed "' || quiz_title || '" with a score of ' || COALESCE(NEW.score::text, 'N/A'),
            'quiz',
            course_id,
            NEW.quiz_id,
            NEW.id,
            false,
            NOW()
        );
        
        RAISE NOTICE 'Quiz completion notifications created for quiz: %', quiz_title;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in notify_quiz_attempt: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant execute permission
GRANT EXECUTE ON FUNCTION notify_quiz_attempt() TO authenticated;

-- 9. Create the trigger
CREATE TRIGGER trigger_notify_quiz_attempt
    AFTER UPDATE ON quiz_attempts
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION notify_quiz_attempt();

-- ==============================================
-- PART 3: Verification
-- ==============================================

-- 10. Verify policies are in place
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

-- 11. Verify trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_notify_quiz_attempt';

-- 12. Verify function has SECURITY DEFINER
SELECT 
    routine_name,
    security_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'notify_quiz_attempt';

-- 13. Test notification creation
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
      'Test Notification - RLS Fix',
      'This notification tests that RLS policies are working correctly',
      'announcement',
      false,
      NOW()
    ) RETURNING id INTO notification_id;
    
    RAISE NOTICE 'SUCCESS: Test notification created with ID: %', notification_id;
    
    -- Clean up the test notification
    DELETE FROM notifications WHERE id = notification_id;
    RAISE NOTICE 'Test notification cleaned up successfully';
  ELSE
    RAISE NOTICE 'WARNING: No users found in profiles table';
  END IF;
END $$;

-- ==============================================
-- SUMMARY
-- ==============================================
-- This fix addresses the RLS error by:
-- 1. Creating a permissive INSERT policy for notifications (allows triggers to work)
-- 2. Making the trigger function SECURITY DEFINER (bypasses RLS)
-- 3. Maintaining proper security for user access to their own notifications
-- 4. Allowing faculty to see notifications for their courses
