-- Fix notification type constraint to allow all necessary types
-- This fixes the "violates check constraint notifications_type_check" error

-- 1. Check current constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'notifications_type_check';

-- 2. Drop the existing constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 3. Create a new constraint with all necessary notification types
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
    'assignment', 
    'grade', 
    'announcement', 
    'quiz', 
    'enrollment', 
    'course_material',
    'activity',
    'due_date',
    'late',
    'test'  -- Add test type for testing purposes
));

-- 4. Verify the constraint is updated
SELECT 
    'Constraint updated' as status,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'notifications_type_check';

-- 5. Test the fix with all valid types
DO $$
DECLARE
    test_user_id UUID;
    valid_types TEXT[] := ARRAY[
        'assignment', 
        'grade', 
        'announcement', 
        'quiz', 
        'enrollment', 
        'course_material',
        'activity',
        'due_date',
        'late',
        'test'
    ];
    type_name TEXT;
    test_id UUID;
    success_count INTEGER := 0;
BEGIN
    -- Get any user ID for testing
    SELECT id INTO test_user_id FROM profiles LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing notification types with user ID: %', test_user_id;
        
        -- Test each valid type
        FOREACH type_name IN ARRAY valid_types
        LOOP
            BEGIN
                INSERT INTO notifications (
                    user_id,
                    title,
                    message,
                    type,
                    read,
                    created_at
                ) VALUES (
                    test_user_id,
                    'Test ' || type_name || ' notification',
                    'Testing ' || type_name || ' type - ' || NOW()::text,
                    type_name,
                    false,
                    NOW()
                ) RETURNING id INTO test_id;
                
                RAISE NOTICE '✅ % type works - ID: %', type_name, test_id;
                success_count := success_count + 1;
                
                -- Clean up
                DELETE FROM notifications WHERE id = test_id;
                
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '❌ % type failed: %', type_name, SQLERRM;
            END;
        END LOOP;
        
        RAISE NOTICE 'Test completed: % out of % types worked', success_count, array_length(valid_types, 1);
    ELSE
        RAISE NOTICE '❌ No users found for testing';
    END IF;
END $$;

-- 6. Show current notification types in the database
SELECT 
    'Current notification types in database:' as info,
    type, 
    COUNT(*) as count
FROM notifications 
GROUP BY type
ORDER BY count DESC;
