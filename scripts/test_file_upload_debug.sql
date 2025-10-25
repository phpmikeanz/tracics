-- Test File Upload Debug Script
-- This will help identify the exact issue with file uploads

-- 1. Check the exact storage policies and their conditions
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%course%material%'
ORDER BY policyname;

-- 2. Check if the bucket exists and its configuration
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'course-materials';

-- 3. Test if we can list files in the bucket (this will help identify permission issues)
SELECT * FROM storage.objects 
WHERE bucket_id = 'course-materials' 
LIMIT 5;

-- 4. Check if there are any existing files
SELECT 
  name,
  bucket_id,
  created_at,
  updated_at
FROM storage.objects 
WHERE bucket_id = 'course-materials'
ORDER BY created_at DESC 
LIMIT 10;





