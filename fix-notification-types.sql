-- Fix notification types to include course_material
-- Run this in Supabase SQL Editor

-- 1. First, check what the current constraint allows
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'notifications_type_check';

-- 2. Drop the existing constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 3. Create a new constraint that includes 'course_material'
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('assignment', 'grade', 'announcement', 'quiz', 'enrollment', 'course_material'));

-- 4. Test the fix by creating a test notification
DO $$
DECLARE
    test_user_id UUID;
    test_notification_id UUID;
BEGIN
    -- Get any user ID for testing
    SELECT id INTO test_user_id FROM profiles LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Try to create a test notification with course_material type
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            read
        ) VALUES (
            test_user_id,
            'Test Course Material Notification - ' || NOW()::text,
            'This is a test notification to verify course_material type works.',
            'course_material',
            false
        ) RETURNING id INTO test_notification_id;
        
        RAISE NOTICE '✅ Test course_material notification created successfully with ID: %', test_notification_id;
        
        -- Clean up the test notification
        DELETE FROM notifications WHERE id = test_notification_id;
        RAISE NOTICE '✅ Test notification cleaned up';
    ELSE
        RAISE NOTICE '❌ No users found in profiles table';
    END IF;
END $$;

-- 5. Verify the constraint is working
SELECT 
    'Constraint updated' as status,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'notifications_type_check';

-- 6. Test with all valid types
DO $$
DECLARE
    test_user_id UUID;
    valid_types TEXT[] := ARRAY['assignment', 'grade', 'announcement', 'quiz', 'enrollment', 'course_material'];
    type_name TEXT;
    test_id UUID;
BEGIN
    -- Get any user ID for testing
    SELECT id INTO test_user_id FROM profiles LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test each valid type
        FOREACH type_name IN ARRAY valid_types
        LOOP
            BEGIN
                INSERT INTO notifications (
                    user_id,
                    title,
                    message,
                    type,
                    read
                ) VALUES (
                    test_user_id,
                    'Test ' || type_name || ' notification',
                    'Testing ' || type_name || ' type',
                    type_name,
                    false
                ) RETURNING id INTO test_id;
                
                RAISE NOTICE '✅ % type works - ID: %', type_name, test_id;
                
                -- Clean up
                DELETE FROM notifications WHERE id = test_id;
                
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '❌ % type failed: %', type_name, SQLERRM;
            END;
        END LOOP;
    ELSE
        RAISE NOTICE '❌ No users found for testing';
    END IF;
END $$;
