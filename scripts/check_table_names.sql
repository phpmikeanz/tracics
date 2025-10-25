-- Check for both possible table names
-- You mentioned "quiz_questions_grades" but the code uses "quiz_question_grades"

-- 1. Check for quiz_question_grades (singular)
SELECT 
  'quiz_question_grades' as table_name,
  COUNT(*) as record_count
FROM information_schema.tables 
WHERE table_name = 'quiz_question_grades' 
AND table_schema = 'public';

-- 2. Check for quiz_questions_grades (plural)
SELECT 
  'quiz_questions_grades' as table_name,
  COUNT(*) as record_count
FROM information_schema.tables 
WHERE table_name = 'quiz_questions_grades' 
AND table_schema = 'public';

-- 3. List all tables that contain "quiz" and "grade"
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name LIKE '%quiz%' 
AND table_name LIKE '%grade%'
AND table_schema = 'public';

-- 4. If quiz_question_grades exists, check its structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'quiz_question_grades' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. If quiz_questions_grades exists, check its structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'quiz_questions_grades' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Check record counts for both tables (if they exist)
SELECT 
  'quiz_question_grades' as table_name,
  COUNT(*) as record_count
FROM public.quiz_question_grades
UNION ALL
SELECT 
  'quiz_questions_grades' as table_name,
  COUNT(*) as record_count
FROM public.quiz_questions_grades;
























