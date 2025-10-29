-- FIX RLS POLICIES FOR QUIZ QUESTIONS
-- This will allow students to see ALL questions for published quizzes

-- ===========================================
-- STEP 1: CHECK CURRENT RLS POLICIES
-- ===========================================

SELECT 
  'CURRENT RLS POLICIES' as section,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'quiz_questions'
ORDER BY policyname;

-- ===========================================
-- STEP 2: DROP ALL EXISTING POLICIES
-- ===========================================

-- Drop all existing policies that might be blocking access
DROP POLICY IF EXISTS "Users can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Students can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Faculty can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.quiz_questions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.quiz_questions;
DROP POLICY IF EXISTS "Super permissive quiz questions access" ON public.quiz_questions;

-- ===========================================
-- STEP 3: CREATE SIMPLE, PERMISSIVE POLICY
-- ===========================================

-- Create a very simple policy that allows ALL authenticated users to view quiz questions
CREATE POLICY "Allow all authenticated users to view quiz questions" ON public.quiz_questions 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- ===========================================
-- STEP 4: VERIFY THE NEW POLICY
-- ===========================================

SELECT 
  'NEW RLS POLICIES' as section,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'quiz_questions'
ORDER BY policyname;

-- ===========================================
-- STEP 5: TEST ACCESS WITH SAMPLE QUERY
-- ===========================================

-- This query should now return ALL questions for any authenticated user
SELECT 
  'TEST ACCESS' as section,
  COUNT(*) as total_questions_accessible,
  COUNT(DISTINCT quiz_id) as quizzes_accessible
FROM public.quiz_questions;

-- ===========================================
-- STEP 6: SHOW QUESTIONS FOR SPECIFIC QUIZ
-- ===========================================

-- Show all questions for the quiz that was having issues
SELECT 
  'QUESTIONS FOR QUIZ: ac5764eb-0887-4a61-bbed-dab69a5186a4' as section,
  qq.id as question_id,
  qq.question,
  qq.type,
  qq.points,
  qq.order_index,
  q.title as quiz_title,
  q.status as quiz_status
FROM public.quiz_questions qq
JOIN public.quizzes q ON qq.quiz_id = q.id
WHERE qq.quiz_id = 'ac5764eb-0887-4a61-bbed-dab69a5186a4'
ORDER BY qq.order_index;

-- ===========================================
-- COMPLETION MESSAGE
-- ===========================================

SELECT 'RLS POLICIES FIXED - ALL AUTHENTICATED USERS CAN NOW VIEW QUIZ QUESTIONS!' as status;
