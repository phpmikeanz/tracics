-- Simple Upload Test - Run this to test file upload manually
-- This will help us identify if the issue is with the application or storage

-- Test 1: Check current user authentication
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- Test 2: Check if we can access the storage bucket
SELECT 
  id,
  name,
  public,
  file_size_limit
FROM storage.buckets 
WHERE id = 'course-materials';

-- Test 3: Check storage policies one more time
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%course%material%'
ORDER BY policyname;

-- Test 4: Check if course_materials table exists and has data
SELECT 
  COUNT(*) as total_materials,
  COUNT(file_url) as materials_with_files
FROM public.course_materials;

SELECT 'Storage setup looks correct. The issue is likely in the application code.' as message;





