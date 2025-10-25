-- Verify course_materials table structure and test data
-- Run this in Supabase SQL Editor to check the table structure

-- Check if the table exists and show its structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'course_materials' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any existing materials
SELECT COUNT(*) as total_materials FROM course_materials;

-- Show sample data if any exists
SELECT 
  id, 
  title, 
  file_url, 
  file_name, 
  file_size, 
  file_type,
  material_type,
  is_required,
  created_at
FROM course_materials 
LIMIT 5;

-- Test insert with sample data (replace with actual course_id and user_id)
-- INSERT INTO course_materials (
--   course_id, 
--   title, 
--   description, 
--   material_type, 
--   is_required, 
--   created_by,
--   file_url,
--   file_name,
--   file_size,
--   file_type
-- ) VALUES (
--   'your-course-id-here',
--   'Test Material',
--   'Test Description',
--   'document',
--   false,
--   'your-user-id-here',
--   'https://example.com/test.pdf',
--   'test.pdf',
--   1024,
--   'application/pdf'
-- );

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'course_materials';






