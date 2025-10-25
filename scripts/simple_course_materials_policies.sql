-- Simple Course Materials Storage Policies
-- This script creates minimal but effective policies for course materials storage
-- Run this in your Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload course material files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view course material files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own course material files" ON storage.objects;

-- Ensure the bucket exists and is public
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

-- Policy 1: Allow authenticated users to upload to course-materials bucket
CREATE POLICY "Authenticated users can upload course materials" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'course-materials' AND
  auth.uid() IS NOT NULL
);

-- Policy 2: Allow authenticated users to view course-materials files
CREATE POLICY "Authenticated users can view course materials" ON storage.objects
FOR SELECT USING (
  bucket_id = 'course-materials' AND
  auth.uid() IS NOT NULL
);

-- Policy 3: Allow users to delete files they uploaded
CREATE POLICY "Users can delete their own course material files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'course-materials' AND
  auth.uid() IS NOT NULL
);

-- Policy 4: Allow users to update files they uploaded
CREATE POLICY "Users can update their own course material files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'course-materials' AND
  auth.uid() IS NOT NULL
);

SELECT 'Simple course materials storage policies created successfully!' as message;





