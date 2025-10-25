-- Create course materials table
CREATE TABLE IF NOT EXISTS public.course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  file_type TEXT,
  material_type TEXT NOT NULL DEFAULT 'document' CHECK (material_type IN ('document', 'video', 'link', 'assignment', 'quiz')),
  is_required BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for course materials
CREATE POLICY "Instructors can manage their course materials" ON public.course_materials
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = course_materials.course_id 
    AND courses.instructor_id = auth.uid()
  )
);

CREATE POLICY "Students can view course materials for enrolled courses" ON public.course_materials
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.enrollments 
    WHERE enrollments.course_id = course_materials.course_id 
    AND enrollments.student_id = auth.uid()
    AND enrollments.status = 'approved'
  )
);

-- Create storage bucket for course materials
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

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_course_materials_course_id ON public.course_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_created_by ON public.course_materials(created_by);
CREATE INDEX IF NOT EXISTS idx_course_materials_order ON public.course_materials(course_id, order_index);






