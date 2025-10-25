-- Verify Profile Photos Setup
-- This script checks if the profile photos system is properly configured

-- 1. Check if avatars bucket exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') 
        THEN '✅ Avatars bucket exists'
        ELSE '❌ Avatars bucket missing'
    END as bucket_status;

-- 2. Check bucket configuration
SELECT 
    id,
    name,
    public,
    created_at
FROM storage.buckets 
WHERE id = 'avatars';

-- 3. Check storage policies
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%avatar%'
ORDER BY policyname;

-- 4. Check if functions exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_avatar_url') 
        THEN '✅ get_avatar_url function exists'
        ELSE '❌ get_avatar_url function missing'
    END as function_status;

-- 5. Test the get_avatar_url function (if user is authenticated)
-- This will only work if you're logged in
SELECT 
    CASE 
        WHEN auth.uid() IS NOT NULL 
        THEN get_avatar_url(auth.uid())
        ELSE 'No authenticated user'
    END as test_avatar_url;

-- 6. Check current user authentication
SELECT 
    CASE 
        WHEN auth.uid() IS NOT NULL 
        THEN '✅ User is authenticated: ' || auth.uid()::text
        ELSE '❌ No authenticated user'
    END as auth_status;

-- 7. Check if profiles table has avatar_url column
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            AND column_name = 'avatar_url'
        ) 
        THEN '✅ avatar_url column exists in profiles table'
        ELSE '❌ avatar_url column missing from profiles table'
    END as column_status;
