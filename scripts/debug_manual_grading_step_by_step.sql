-- Step-by-Step Manual Grading Debug Script
-- Run each section one by one to identify the issue

-- STEP 1: Check if quiz_question_grades table exists and is accessible
SELECT 
  'Step 1: Table Access Test' as step,
  COUNT(*) as total_grades,
  'Table exists and accessible' as status
FROM public.quiz_question_grades;

-- STEP 2: Check table structure
SELECT 
  'Step 2: Table Structure' as step,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'quiz_question_grades' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- STEP 3: Check RLS policies
SELECT 
  'Step 3: RLS Policies' as step,
  policyname,
  cmd,
  permissive,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has WHERE clause'
    ELSE 'No WHERE clause'
  END as has_qual
FROM pg_policies 
WHERE tablename = 'quiz_question_grades'
ORDER BY policyname;

-- STEP 4: Check for existing quiz attempts that need grading
SELECT 
  'Step 4: Quiz Attempts Needing Grading' as step,
  qa.id as attempt_id,
  qa.status,
  qa.score,
  q.title as quiz_title,
  p.full_name as student_name,
  COUNT(qq.id) as essay_short_answer_questions
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.profiles p ON qa.student_id = p.id
LEFT JOIN public.quiz_questions qq ON q.id = qq.quiz_id AND qq.type IN ('short_answer', 'essay')
WHERE qa.status = 'completed'
AND qa.completed_at IS NOT NULL
GROUP BY qa.id, qa.status, qa.score, q.title, p.full_name
HAVING COUNT(qq.id) > 0
ORDER BY qa.completed_at DESC
LIMIT 5;

-- STEP 5: Check if you can insert a test grade (this will show permission issues)
-- Replace the IDs with actual values from your system
/*
-- First, get some real IDs to test with
SELECT 
  'Step 5a: Get Test IDs' as step,
  qa.id as attempt_id,
  qq.id as question_id,
  qa.student_id,
  qq.type,
  qq.question
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
JOIN public.quiz_questions qq ON q.id = qq.quiz_id
WHERE qq.type IN ('short_answer', 'essay')
AND qa.status = 'completed'
LIMIT 1;
*/

-- STEP 6: Test manual grade insertion (uncomment and modify with real IDs)
/*
-- Replace with actual IDs from Step 5a
INSERT INTO public.quiz_question_grades (
  attempt_id,
  question_id,
  points_awarded,
  feedback,
  graded_by
) VALUES (
  'REPLACE_WITH_ACTUAL_ATTEMPT_ID',
  'REPLACE_WITH_ACTUAL_QUESTION_ID',
  5,
  'Test feedback for debugging',
  'REPLACE_WITH_YOUR_USER_ID'
);
*/

-- STEP 7: Check if the grade was inserted
SELECT 
  'Step 7: Check Inserted Grade' as step,
  COUNT(*) as grades_found
FROM public.quiz_question_grades
WHERE attempt_id = 'REPLACE_WITH_ACTUAL_ATTEMPT_ID';

-- STEP 8: Check if the quiz attempt was updated
SELECT 
  'Step 8: Check Quiz Attempt Update' as step,
  id,
  score,
  status,
  completed_at
FROM public.quiz_attempts
WHERE id = 'REPLACE_WITH_ACTUAL_ATTEMPT_ID';

-- STEP 9: Check your user role and permissions
SELECT 
  'Step 9: User Role Check' as step,
  id,
  email,
  role,
  full_name
FROM public.profiles
WHERE email = 'YOUR_EMAIL_HERE';

-- STEP 10: Check if you're the instructor of the course
SELECT 
  'Step 10: Course Instructor Check' as step,
  c.id as course_id,
  c.title as course_title,
  p.full_name as instructor_name,
  c.instructor_id
FROM public.courses c
JOIN public.profiles p ON c.instructor_id = p.id
WHERE c.instructor_id = 'YOUR_USER_ID_HERE';
















