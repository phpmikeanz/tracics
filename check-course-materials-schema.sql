-- Check course_materials table schema and data
-- Run this in Supabase SQL Editor

-- 1. Check table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'course_materials' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if there are any course materials
SELECT COUNT(*) as total_materials FROM course_materials;

-- 3. Show sample course materials if any exist
SELECT 
  id, 
  title, 
  course_id,
  material_type,
  is_required,
  created_at
FROM course_materials 
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check courses and their enrollments
SELECT 
  c.id as course_id,
  c.title as course_title,
  COUNT(e.id) as total_enrollments,
  COUNT(CASE WHEN e.status = 'approved' THEN 1 END) as approved_enrollments
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id
GROUP BY c.id, c.title
ORDER BY c.created_at DESC
LIMIT 5;

-- 5. Check course material notifications
SELECT COUNT(*) as course_material_notifications 
FROM notifications 
WHERE type = 'course_material';

-- 6. Show recent course material notifications
SELECT 
  id,
  user_id,
  title,
  message,
  created_at
FROM notifications 
WHERE type = 'course_material'
ORDER BY created_at DESC
LIMIT 5;

-- 7. Check RLS policies for course_materials
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'course_materials';

-- 8. Test notification creation (replace with actual user_id)
-- Uncomment and modify this section to test notification creation
/*
INSERT INTO notifications (
  user_id,
  title,
  message,
  type,
  read
) VALUES (
  'your-user-id-here',
  'Test Course Material Notification',
  'This is a test notification for course materials.',
  'course_material',
  false
) RETURNING id;
*/

-- 9. Check if there are any issues with the table
SELECT 
  'course_materials' as table_name,
  COUNT(*) as row_count,
  COUNT(DISTINCT course_id) as unique_courses,
  COUNT(DISTINCT created_by) as unique_creators
FROM course_materials;

-- 10. Check for potential data issues
SELECT 
  'Materials without course_id' as issue,
  COUNT(*) as count
FROM course_materials 
WHERE course_id IS NULL

UNION ALL

SELECT 
  'Materials without title' as issue,
  COUNT(*) as count
FROM course_materials 
WHERE title IS NULL OR title = ''

UNION ALL

SELECT 
  'Materials without created_by' as issue,
  COUNT(*) as count
FROM course_materials 
WHERE created_by IS NULL;
