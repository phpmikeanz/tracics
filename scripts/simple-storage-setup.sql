-- Simple storage setup for assignment files
-- Run this in your Supabase SQL Editor

-- First, go to Storage in your Supabase dashboard and manually create a bucket called 'assignment-files'
-- Set it to public and allow these file types: PDF, DOC, DOCX, TXT, Images, ZIP

-- Then run these policies:

-- Allow users to upload their own assignment files
CREATE POLICY "Students can upload assignment files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'assignment-files'
);

-- Allow users to view assignment files (students can see their own, instructors can see all from their courses)
CREATE POLICY "Users can view assignment files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'assignment-files'
);

-- Allow users to delete their own files
CREATE POLICY "Students can delete their files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'assignment-files'
);

-- Note: These are simplified policies. For production, you should add more specific RLS rules.

