-- Check existing storage policies and create missing ones
-- Run this in your Supabase SQL Editor

-- First, let's check what storage policies currently exist
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
WHERE schemaname = 'storage' AND tablename = 'objects'
AND policyname LIKE '%course%material%';

-- Check if the course-materials bucket exists
SELECT * FROM storage.buckets WHERE id = 'course-materials';

-- If the bucket doesn't exist, create it
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-materials',
  'course-materials',
  true,
  104857600, -- 100MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed'
  ]
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600;

-- Drop any existing course materials storage policies
DROP POLICY IF EXISTS "Users can upload course material files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view course material files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own course material files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload course materials" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view course materials" ON storage.objects;

-- Create new storage policies for course materials

-- Policy 1: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload course materials" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'course-materials' AND
  auth.uid() IS NOT NULL
);

-- Policy 2: Allow authenticated users to view files
CREATE POLICY "Authenticated users can view course materials" ON storage.objects
FOR SELECT USING (
  bucket_id = 'course-materials' AND
  auth.uid() IS NOT NULL
);

-- Policy 3: Allow users to delete files
CREATE POLICY "Users can delete course material files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'course-materials' AND
  auth.uid() IS NOT NULL
);

-- Policy 4: Allow users to update files
CREATE POLICY "Users can update course material files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'course-materials' AND
  auth.uid() IS NOT NULL
);

-- Verify the policies were created
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%course%material%';

SELECT 'Storage policies for course materials created successfully!' as message;





