-- Safe Setup Profile Photos Storage and Policies
-- This script safely sets up Supabase Storage for profile photos
-- It handles cases where policies already exist

-- 1. Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

-- 3. Create storage policies for avatars bucket

-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view all avatars (public bucket)
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Allow users to update their own avatars
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Create function to generate avatar URL (replace if exists)
CREATE OR REPLACE FUNCTION get_avatar_url(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    avatar_url TEXT;
BEGIN
    SELECT profiles.avatar_url INTO avatar_url
    FROM profiles
    WHERE profiles.id = user_uuid;
    
    RETURN COALESCE(avatar_url, 'https://ui-avatars.com/api/?name=User&background=random&color=fff&size=128');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to clean up old avatars (replace if exists)
CREATE OR REPLACE FUNCTION cleanup_old_avatars()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    avatar_record RECORD;
BEGIN
    -- Find avatars that are no longer referenced in profiles
    FOR avatar_record IN
        SELECT name, bucket_id
        FROM storage.objects
        WHERE bucket_id = 'avatars'
        AND name NOT IN (
            SELECT DISTINCT 
                CASE 
                    WHEN avatar_url IS NOT NULL 
                    THEN 'avatars/' || split_part(avatar_url, '/', -1)
                    ELSE NULL
                END
            FROM profiles 
            WHERE avatar_url IS NOT NULL
        )
    LOOP
        -- Delete the orphaned avatar
        PERFORM storage.objects_delete(avatar_record.bucket_id, avatar_record.name);
        deleted_count := deleted_count + 1;
    END LOOP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Verify setup
DO $$
BEGIN
    -- Check if bucket exists
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
        RAISE EXCEPTION 'Avatars bucket was not created successfully';
    END IF;
    
    -- Check if policies exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Users can upload their own avatars'
    ) THEN
        RAISE EXCEPTION 'Storage policies were not created successfully';
    END IF;
    
    RAISE NOTICE 'Profile photos setup completed successfully!';
END $$;
