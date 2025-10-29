-- Verify Course Materials Notifications
-- Run this in Supabase SQL Editor to check if notifications are working

-- 1. Check if there are any course materials
SELECT 
  'Course Materials' as table_name,
  COUNT(*) as total_count,
  COUNT(DISTINCT course_id) as unique_courses
FROM course_materials;

-- 2. Check courses with enrolled students
SELECT 
  c.id as course_id,
  c.title as course_title,
  COUNT(e.id) as total_enrollments,
  COUNT(CASE WHEN e.status = 'approved' THEN 1 END) as approved_enrollments
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id
GROUP BY c.id, c.title
HAVING COUNT(CASE WHEN e.status = 'approved' THEN 1 END) > 0
ORDER BY approved_enrollments DESC
LIMIT 5;

-- 3. Check course material notifications
SELECT 
  'Course Material Notifications' as notification_type,
  COUNT(*) as total_count,
  COUNT(DISTINCT user_id) as unique_users
FROM notifications 
WHERE type = 'course_material';

-- 4. Show recent course material notifications
SELECT 
  n.id,
  n.user_id,
  n.title,
  n.message,
  n.created_at,
  p.full_name as user_name
FROM notifications n
LEFT JOIN profiles p ON n.user_id = p.id
WHERE n.type = 'course_material'
ORDER BY n.created_at DESC
LIMIT 10;

-- 5. Check if notifications exist for courses with materials
SELECT 
  cm.course_id,
  c.title as course_title,
  COUNT(cm.id) as material_count,
  COUNT(n.id) as notification_count,
  COUNT(DISTINCT e.student_id) as enrolled_students
FROM course_materials cm
LEFT JOIN courses c ON cm.course_id = c.id
LEFT JOIN enrollments e ON cm.course_id = e.course_id AND e.status = 'approved'
LEFT JOIN notifications n ON n.type = 'course_material' AND n.user_id = e.student_id
GROUP BY cm.course_id, c.title
ORDER BY material_count DESC;

-- 6. Test notification creation (replace with actual values)
-- Uncomment and modify this to test notification creation
/*
-- First, get a course with enrolled students
WITH course_with_students AS (
  SELECT 
    c.id as course_id,
    c.title as course_title,
    e.student_id
  FROM courses c
  JOIN enrollments e ON c.id = e.course_id
  WHERE e.status = 'approved'
  LIMIT 1
)
-- Create a test notification
INSERT INTO notifications (user_id, title, message, type, read)
SELECT 
  student_id,
  'Test Course Material Notification',
  'A new document "Test Material" has been uploaded to your course.',
  'course_material',
  false
FROM course_with_students
RETURNING id, user_id, title;
*/

-- 7. Check for any issues
SELECT 
  'Materials without notifications' as issue,
  COUNT(*) as count
FROM course_materials cm
WHERE NOT EXISTS (
  SELECT 1 FROM notifications n
  WHERE n.type = 'course_material'
  AND n.created_at >= cm.created_at
);

-- 8. Show the most recent course material and check if notifications were created
SELECT 
  cm.id as material_id,
  cm.title as material_title,
  cm.course_id,
  c.title as course_title,
  cm.created_at as material_created,
  COUNT(n.id) as notifications_created
FROM course_materials cm
LEFT JOIN courses c ON cm.course_id = c.id
LEFT JOIN notifications n ON n.type = 'course_material' 
  AND n.created_at >= cm.created_at
  AND n.created_at <= cm.created_at + INTERVAL '1 minute'
GROUP BY cm.id, cm.title, cm.course_id, c.title, cm.created_at
ORDER BY cm.created_at DESC
LIMIT 5;
