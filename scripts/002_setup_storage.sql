-- Setup storage for assignment files
-- This should be run in your Supabase SQL editor

-- Create storage bucket for assignment files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignment-files',
  'assignment-files',
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png', 'image/gif', 'application/zip', 'application/x-zip-compressed']
);

-- Set up RLS policies for assignment files
CREATE POLICY "Users can upload assignment files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'assignment-files' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Users can view assignment files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'assignment-files' AND (
    auth.uid()::text = (storage.foldername(name))[2] OR
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE c.instructor_id = auth.uid()
      AND a.id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Users can delete their own assignment files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'assignment-files' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Note: After running this SQL, you may need to go to Storage settings in Supabase
-- and manually create the bucket if the INSERT statement doesn't work due to permissions.

