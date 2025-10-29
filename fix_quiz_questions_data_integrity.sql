-- Fix Quiz Questions Data Integrity Issues
-- This script ensures all quiz questions have valid data to prevent filtering

-- ===========================================
-- STEP 1: DIAGNOSTIC QUERIES
-- ===========================================

-- Check for questions with missing or invalid data
SELECT 
  'Questions with missing data' as issue_type,
  COUNT(*) as count
FROM public.quiz_questions
WHERE 
  question IS NULL OR question = '' OR
  type IS NULL OR type = '' OR
  points IS NULL OR points <= 0 OR
  order_index IS NULL;

-- Check for questions with NULL values
SELECT 
  'Questions with NULL values' as issue_type,
  COUNT(*) as count
FROM public.quiz_questions
WHERE 
  question IS NULL OR
  type IS NULL OR
  points IS NULL OR
  order_index IS NULL;

-- Check for questions with empty strings
SELECT 
  'Questions with empty strings' as issue_type,
  COUNT(*) as count
FROM public.quiz_questions
WHERE 
  question = '' OR
  type = '';

-- ===========================================
-- STEP 2: FIX DATA INTEGRITY ISSUES
-- ===========================================

-- Fix questions with NULL or empty question text
UPDATE public.quiz_questions 
SET question = 'Question text not available - please contact instructor'
WHERE question IS NULL OR question = '';

-- Fix questions with NULL or empty type
UPDATE public.quiz_questions 
SET type = 'multiple_choice'
WHERE type IS NULL OR type = '';

-- Fix questions with NULL or invalid points
UPDATE public.quiz_questions 
SET points = 1
WHERE points IS NULL OR points <= 0;

-- Fix questions with NULL order_index
UPDATE public.quiz_questions 
SET order_index = (
  SELECT COALESCE(MAX(order_index), 0) + 1 
  FROM public.quiz_questions q2 
  WHERE q2.quiz_id = quiz_questions.quiz_id
)
WHERE order_index IS NULL;

-- ===========================================
-- STEP 3: ENSURE PROPER ORDERING
-- ===========================================

-- Update order_index to be sequential within each quiz
WITH ordered_questions AS (
  SELECT 
    id,
    quiz_id,
    ROW_NUMBER() OVER (PARTITION BY quiz_id ORDER BY order_index ASC, created_at ASC) - 1 as new_order_index
  FROM public.quiz_questions
)
UPDATE public.quiz_questions 
SET order_index = ordered_questions.new_order_index
FROM ordered_questions
WHERE quiz_questions.id = ordered_questions.id;

-- ===========================================
-- STEP 4: VALIDATE FIXES
-- ===========================================

-- Check that all questions now have valid data
SELECT 
  'Questions with valid data after fix' as status,
  COUNT(*) as count
FROM public.quiz_questions
WHERE 
  question IS NOT NULL AND question != '' AND
  type IS NOT NULL AND type != '' AND
  points IS NOT NULL AND points > 0 AND
  order_index IS NOT NULL;

-- Check for any remaining issues
SELECT 
  'Remaining issues' as status,
  COUNT(*) as count
FROM public.quiz_questions
WHERE 
  question IS NULL OR question = '' OR
  type IS NULL OR type = '' OR
  points IS NULL OR points <= 0 OR
  order_index IS NULL;

-- Show sample of fixed questions
SELECT 
  id,
  quiz_id,
  LEFT(question, 50) as question_preview,
  type,
  points,
  order_index,
  created_at
FROM public.quiz_questions
ORDER BY quiz_id, order_index
LIMIT 10;

-- ===========================================
-- STEP 5: VERIFY QUIZ QUESTION COUNTS
-- ===========================================

-- Show quiz question counts
SELECT 
  q.id as quiz_id,
  q.title as quiz_title,
  q.status as quiz_status,
  COUNT(qq.id) as question_count,
  COUNT(CASE WHEN qq.question IS NULL OR qq.question = '' THEN 1 END) as missing_question_text,
  COUNT(CASE WHEN qq.type IS NULL OR qq.type = '' THEN 1 END) as missing_type,
  COUNT(CASE WHEN qq.points IS NULL OR qq.points <= 0 THEN 1 END) as missing_points,
  COUNT(CASE WHEN qq.order_index IS NULL THEN 1 END) as missing_order_index
FROM public.quizzes q
LEFT JOIN public.quiz_questions qq ON q.id = qq.quiz_id
GROUP BY q.id, q.title, q.status
ORDER BY q.created_at DESC;

-- ===========================================
-- COMPLETION MESSAGE
-- ===========================================

SELECT 'Quiz questions data integrity fix completed successfully!' as status;
