-- Test Direct Upload to Course Materials Bucket
-- This will help verify if the bucket is accessible for uploads

-- Check bucket configuration
SELECT 
  'Bucket exists' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'course-materials') 
    THEN 'YES' 
    ELSE 'NO' 
  END as result;

-- Check if bucket is public
SELECT 
  'Bucket is public' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'course-materials' AND public = true) 
    THEN 'YES' 
    ELSE 'NO' 
  END as result;

-- Check upload policies
SELECT 
  'Upload policies exist' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND cmd = 'INSERT' 
      AND policyname LIKE '%course%material%'
    ) 
    THEN 'YES' 
    ELSE 'NO' 
  END as result;

-- Check current user
SELECT 
  'User authenticated' as check_type,
  CASE 
    WHEN auth.uid() IS NOT NULL 
    THEN 'YES - User ID: ' || auth.uid()::text
    ELSE 'NO' 
  END as result;

SELECT 'All checks completed. If all show YES, upload should work.' as message;





