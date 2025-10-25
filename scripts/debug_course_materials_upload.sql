-- Debug Course Materials File Upload Issues
-- Run this in your Supabase SQL Editor to check everything is set up correctly

-- 1. Check if the storage bucket exists and is configured correctly
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'course-materials';

-- 2. Check existing storage policies
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%course%material%';

-- 3. Check if course_materials table exists and has correct structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'course_materials' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check RLS is enabled on course_materials table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'course_materials' 
AND schemaname = 'public';

-- 5. Check existing course materials (if any)
SELECT 
  id,
  title,
  file_name,
  file_url,
  file_size,
  created_at
FROM public.course_materials 
ORDER BY created_at DESC 
LIMIT 5;

-- 6. Test if we can insert a test record (this will help identify the issue)
-- Note: This might fail if you're not authenticated as an instructor
-- But the error message will tell us what's wrong
SELECT 'All checks completed. If file uploads still fail, check browser console for detailed error messages.' as message;





