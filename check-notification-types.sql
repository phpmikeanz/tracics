-- Check valid notification types
-- Run this in Supabase SQL Editor

-- 1. Check the check constraint for notifications type
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'notifications_type_check';

-- 2. Check existing notification types in the database
SELECT DISTINCT type, COUNT(*) as count
FROM notifications 
GROUP BY type
ORDER BY count DESC;

-- 3. Check the table structure for notifications
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
