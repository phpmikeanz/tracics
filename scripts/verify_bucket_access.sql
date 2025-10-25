-- Verify Course Materials Bucket Access
-- Run this to confirm the bucket exists and is accessible

-- 1. Check if bucket exists
SELECT 
  id,
  name,
  public,
  file_size_limit,
  created_at
FROM storage.buckets 
WHERE id = 'course-materials';

-- 2. Check storage policies for course-materials
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%course%material%'
ORDER BY policyname;

-- 3. Test if we can list objects (this tests permissions)
SELECT COUNT(*) as object_count
FROM storage.objects 
WHERE bucket_id = 'course-materials';

-- 4. Check current user authentication
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role;

SELECT 'Bucket verification complete. If bucket exists and policies are set, upload should work.' as message;





