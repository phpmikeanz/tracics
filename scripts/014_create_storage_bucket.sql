-- Create storage bucket for course materials
-- Run this in Supabase SQL Editor if the bucket doesn't exist

-- Note: Storage buckets are typically created through the Supabase Dashboard
-- Go to Storage > Create Bucket and create a bucket named 'course-materials'

-- However, if you need to create it via SQL, you can try:
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

-- Set up RLS policies for course materials storage
CREATE POLICY "Users can upload course material files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'course-materials' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Users can view course material files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'course-materials' AND (
    auth.uid()::text = (storage.foldername(name))[2] OR
    EXISTS (
      SELECT 1 FROM public.course_materials cm
      JOIN public.courses c ON cm.course_id = c.id
      WHERE c.instructor_id = auth.uid()
      AND cm.id::text = (storage.foldername(name))[1]
    ) OR
    EXISTS (
      SELECT 1 FROM public.course_materials cm
      JOIN public.enrollments e ON cm.course_id = e.course_id
      WHERE e.student_id = auth.uid()
      AND e.status = 'approved'
      AND cm.id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Users can delete their own course material files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'course-materials' AND
  auth.uid()::text = (storage.foldername(name))[2]
);






