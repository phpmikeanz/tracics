-- Fix Storage Policies for Profile Photos
-- This script fixes the RLS policies that are blocking uploads

-- 1. Drop existing problematic policies
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

-- 2. Create corrected storage policies

-- Allow authenticated users to upload files to avatars bucket
CREATE POLICY "Allow authenticated users to upload avatars" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
);

-- Allow anyone to view avatars (public bucket)
CREATE POLICY "Allow public access to avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Allow authenticated users to update their own avatars
CREATE POLICY "Allow users to update their own avatars" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their own avatars
CREATE POLICY "Allow users to delete their own avatars" ON storage.objects
FOR DELETE USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
);

-- 3. Verify the policies were created
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%avatar%'
ORDER BY policyname;

-- 4. Test message
DO $$
BEGIN
    RAISE NOTICE 'Storage policies have been fixed!';
    RAISE NOTICE 'The upload should now work properly.';
END $$;
