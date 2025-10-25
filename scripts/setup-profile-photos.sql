-- Setup Profile Photos Storage and Policies
-- This script sets up Supabase Storage for profile photos

-- 1. Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create storage policies for avatars bucket

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

-- 3. Create function to generate avatar URL
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

-- 4. Create function to clean up old avatars
CREATE OR REPLACE FUNCTION cleanup_old_avatars()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    avatar_record RECORD;
BEGIN
    -- Find avatars that are no longer referenced in profiles
    FOR avatar_record IN 
        SELECT name
        FROM storage.objects
        WHERE bucket_id = 'avatars'
        AND name NOT IN (
            SELECT 
                CASE 
                    WHEN avatar_url IS NOT NULL THEN 
                        'avatars/' || split_part(avatar_url, '/', -1)
                    ELSE NULL
                END
            FROM profiles
            WHERE avatar_url IS NOT NULL
        )
    LOOP
        -- Delete the orphaned file
        DELETE FROM storage.objects
        WHERE bucket_id = 'avatars' 
        AND name = avatar_record.name;
        
        deleted_count := deleted_count + 1;
    END LOOP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to get user profile with avatar
CREATE OR REPLACE FUNCTION get_user_profile_with_avatar(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.full_name,
        p.role,
        COALESCE(p.avatar_url, get_avatar_url(user_uuid)) as avatar_url,
        p.created_at
    FROM profiles p
    WHERE p.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to update avatar URL
CREATE OR REPLACE FUNCTION update_user_avatar(
    user_uuid UUID,
    new_avatar_url TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE profiles
    SET avatar_url = new_avatar_url,
        updated_at = NOW()
    WHERE id = user_uuid;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to delete user avatar
CREATE OR REPLACE FUNCTION delete_user_avatar(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_avatar_url TEXT;
    file_path TEXT;
BEGIN
    -- Get current avatar URL
    SELECT avatar_url INTO current_avatar_url
    FROM profiles
    WHERE id = user_uuid;
    
    -- If avatar exists, delete from storage
    IF current_avatar_url IS NOT NULL THEN
        -- Extract file path from URL
        file_path := 'avatars/' || split_part(current_avatar_url, '/', -1);
        
        -- Delete from storage
        DELETE FROM storage.objects
        WHERE bucket_id = 'avatars' 
        AND name = file_path;
    END IF;
    
    -- Update profile to remove avatar URL
    UPDATE profiles
    SET avatar_url = NULL,
        updated_at = NOW()
    WHERE id = user_uuid;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION get_avatar_url(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile_with_avatar(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_avatar(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_avatar(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_avatars() TO authenticated;

-- 9. Create view for user profiles with avatars
CREATE OR REPLACE VIEW user_profiles_with_avatars AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    COALESCE(p.avatar_url, get_avatar_url(p.id)) as avatar_url,
    p.created_at,
    p.updated_at
FROM profiles p;

-- Grant access to the view
GRANT SELECT ON user_profiles_with_avatars TO authenticated;

-- 10. Create trigger to update updated_at when avatar changes
CREATE OR REPLACE FUNCTION update_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_profile_updated_at ON profiles;
CREATE TRIGGER trigger_update_profile_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_updated_at();

-- 11. Create function to get avatar statistics
CREATE OR REPLACE FUNCTION get_avatar_stats()
RETURNS TABLE (
    total_users INTEGER,
    users_with_avatars INTEGER,
    users_without_avatars INTEGER,
    total_storage_size BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_users,
        COUNT(*) FILTER (WHERE avatar_url IS NOT NULL)::INTEGER as users_with_avatars,
        COUNT(*) FILTER (WHERE avatar_url IS NULL)::INTEGER as users_without_avatars,
        COALESCE(SUM(metadata->>'size')::BIGINT, 0) as total_storage_size
    FROM profiles
    LEFT JOIN storage.objects ON storage.objects.bucket_id = 'avatars' 
        AND storage.objects.name LIKE 'avatars/' || split_part(profiles.avatar_url, '/', -1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to avatar stats
GRANT EXECUTE ON FUNCTION get_avatar_stats() TO authenticated;

-- Success message
SELECT 'Profile photos setup completed successfully!' as status;
