-- Fix Course Materials Storage Bucket Policies
-- Run this in your Supabase SQL Editor

-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload course material files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view course material files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own course material files" ON storage.objects;

-- Create the course-materials bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-materials',
  'course-materials',
  true,
  104857600, -- 100MB limit
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
) ON CONFLICT (id) DO NOTHING;

-- Policy 1: Allow instructors to upload files to their courses
CREATE POLICY "Instructors can upload course material files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'course-materials' AND
  EXISTS (
    SELECT 1 FROM public.course_materials cm
    JOIN public.courses c ON cm.course_id = c.id
    WHERE c.instructor_id = auth.uid()
    AND cm.id::text = (storage.foldername(name))[1]
  )
);

-- Policy 2: Allow users to upload files they own (for the user ID in path)
CREATE POLICY "Users can upload their own course material files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'course-materials' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Policy 3: Allow instructors to view all files in their courses
CREATE POLICY "Instructors can view course material files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'course-materials' AND
  EXISTS (
    SELECT 1 FROM public.course_materials cm
    JOIN public.courses c ON cm.course_id = c.id
    WHERE c.instructor_id = auth.uid()
    AND (
      cm.id::text = (storage.foldername(name))[1] OR
      cm.course_id::text = (storage.foldername(name))[1]
    )
  )
);

-- Policy 4: Allow enrolled students to view course material files
CREATE POLICY "Students can view course material files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'course-materials' AND
  EXISTS (
    SELECT 1 FROM public.course_materials cm
    JOIN public.enrollments e ON cm.course_id = e.course_id
    WHERE e.student_id = auth.uid()
    AND e.status = 'approved'
    AND (
      cm.id::text = (storage.foldername(name))[1] OR
      cm.course_id::text = (storage.foldername(name))[1]
    )
  )
);

-- Policy 5: Allow users to view files they uploaded
CREATE POLICY "Users can view their own course material files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'course-materials' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Policy 6: Allow instructors to delete files in their courses
CREATE POLICY "Instructors can delete course material files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'course-materials' AND
  EXISTS (
    SELECT 1 FROM public.course_materials cm
    JOIN public.courses c ON cm.course_id = c.id
    WHERE c.instructor_id = auth.uid()
    AND (
      cm.id::text = (storage.foldername(name))[1] OR
      cm.course_id::text = (storage.foldername(name))[1]
    )
  )
);

-- Policy 7: Allow users to delete files they uploaded
CREATE POLICY "Users can delete their own course material files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'course-materials' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Policy 8: Allow instructors to update files in their courses
CREATE POLICY "Instructors can update course material files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'course-materials' AND
  EXISTS (
    SELECT 1 FROM public.course_materials cm
    JOIN public.courses c ON cm.course_id = c.id
    WHERE c.instructor_id = auth.uid()
    AND (
      cm.id::text = (storage.foldername(name))[1] OR
      cm.course_id::text = (storage.foldername(name))[1]
    )
  )
);

-- Policy 9: Allow users to update files they uploaded
CREATE POLICY "Users can update their own course material files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'course-materials' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Verify the bucket exists and is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'course-materials';

-- Display success message
SELECT 'Course materials storage bucket policies created successfully!' as message;





