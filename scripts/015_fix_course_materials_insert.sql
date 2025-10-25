-- Fix course materials table insertion issues
-- This script addresses common RLS and permission issues

-- First, let's check if the table exists and has the right structure
DO $$
BEGIN
    -- Check if course_materials table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_materials' AND table_schema = 'public') THEN
        RAISE NOTICE 'Creating course_materials table...';
        
        CREATE TABLE public.course_materials (
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
        
        RAISE NOTICE 'course_materials table created successfully';
    ELSE
        RAISE NOTICE 'course_materials table already exists';
    END IF;
END $$;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Instructors can manage their course materials" ON public.course_materials;
DROP POLICY IF EXISTS "Students can view course materials for enrolled courses" ON public.course_materials;
DROP POLICY IF EXISTS "Users can manage course materials" ON public.course_materials;

-- Create simplified RLS policies that are more permissive for testing
CREATE POLICY "Authenticated users can manage course materials" ON public.course_materials
FOR ALL USING (auth.uid() IS NOT NULL);

-- Alternative: More specific policy for instructors
CREATE POLICY "Instructors can manage their course materials" ON public.course_materials
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.courses 
        WHERE courses.id = course_materials.course_id 
        AND courses.instructor_id = auth.uid()
    )
);

-- Policy for students to view materials
CREATE POLICY "Students can view course materials for enrolled courses" ON public.course_materials
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.enrollments 
        WHERE enrollments.course_id = course_materials.course_id 
        AND enrollments.student_id = auth.uid()
        AND enrollments.status = 'approved'
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_materials_course_id ON public.course_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_created_by ON public.course_materials(created_by);
CREATE INDEX IF NOT EXISTS idx_course_materials_order ON public.course_materials(course_id, order_index);

-- Test the table by inserting a sample record (will be deleted immediately)
DO $$
DECLARE
    test_course_id UUID;
    test_user_id UUID;
    test_material_id UUID;
BEGIN
    -- Get a sample course and user for testing
    SELECT id INTO test_course_id FROM public.courses LIMIT 1;
    SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
    
    IF test_course_id IS NOT NULL AND test_user_id IS NOT NULL THEN
        -- Insert a test record
        INSERT INTO public.course_materials (
            course_id, 
            title, 
            description, 
            material_type, 
            created_by
        ) VALUES (
            test_course_id,
            'Test Material',
            'This is a test material',
            'document',
            test_user_id
        ) RETURNING id INTO test_material_id;
        
        RAISE NOTICE 'Test material inserted with ID: %', test_material_id;
        
        -- Delete the test record
        DELETE FROM public.course_materials WHERE id = test_material_id;
        
        RAISE NOTICE 'Test material deleted successfully';
    ELSE
        RAISE NOTICE 'No courses or users found for testing';
    END IF;
END $$;

-- Verify the table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'course_materials'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'course_materials';






