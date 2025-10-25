-- Check Profile Photos Setup
-- Run this to verify if the profile photo system is properly configured

-- 1. Check if profiles table has avatar_url column
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'avatar_url'
ORDER BY ordinal_position;

-- 2. Check if avatars bucket exists
SELECT 
    id,
    name,
    public,
    created_at
FROM storage.buckets 
WHERE id = 'avatars';

-- 3. Check storage policies for avatars bucket
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'objects'
AND policyname LIKE '%avatar%'
ORDER BY policyname;

-- 4. Check if profile photo functions exist
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name IN (
    'get_avatar_url',
    'get_user_profile_with_avatar',
    'update_user_avatar',
    'delete_user_avatar',
    'cleanup_old_avatars'
)
ORDER BY routine_name;

-- 5. Check current user's profile
SELECT 
    id,
    email,
    full_name,
    role,
    avatar_url,
    created_at
FROM profiles 
WHERE id = auth.uid();

-- 6. Check if user has any uploaded files
SELECT 
    name,
    size,
    created_at
FROM storage.objects 
WHERE bucket_id = 'avatars'
AND name LIKE '%' || auth.uid()::text || '%'
ORDER BY created_at DESC;

-- 7. Test avatar URL generation
SELECT get_avatar_url(auth.uid()) as generated_avatar_url;

-- 8. Check if user profile with avatar function works
SELECT * FROM get_user_profile_with_avatar(auth.uid());

-- 9. Check avatar statistics
SELECT * FROM get_avatar_stats();

-- 10. Check if RLS is enabled on profiles table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- Success message
SELECT 'Profile photos setup check completed!' as status;
