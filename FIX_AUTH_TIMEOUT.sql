-- Fix authentication timeout issues
-- This script optimizes RLS policies to prevent timeouts during profile fetching

-- 1. Check current RLS policies for profiles table
SELECT 
  'Current RLS policies for profiles' as info,
  policyname,
  cmd,
  permissive,
  qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 2. Drop existing complex policies that might cause timeouts
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Faculty can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Students can view all profiles" ON public.profiles;

-- 3. Create simple, fast RLS policies for profiles
-- Allow everyone to view profiles (no complex joins)
CREATE POLICY "Anyone can view profiles" ON public.profiles
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Add performance indexes for profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 5. Check if RLS is enabled on profiles
SELECT 
  'RLS status for profiles' as info,
  relname as table_name,
  relrowsecurity as rls_enabled
FROM pg_class 
WHERE relname = 'profiles';

-- 6. Test profile access
SELECT 
  'Testing profile access' as test_type,
  COUNT(*) as total_profiles
FROM public.profiles;

-- 7. Show final policies
SELECT 
  'Final RLS policies for profiles' as info,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

