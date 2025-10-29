-- COMPREHENSIVE QUIZ QUESTIONS DATABASE QUERY
-- This will show you all quiz questions in your database with full details

-- ===========================================
-- STEP 1: SHOW ALL QUIZ QUESTIONS WITH DETAILS
-- ===========================================

SELECT 
  'ALL QUIZ QUESTIONS' as section,
  qq.id as question_id,
  qq.quiz_id,
  q.title as quiz_title,
  q.status as quiz_status,
  c.title as course_title,
  c.course_code,
  qq.question,
  qq.type,
  qq.options,
  qq.correct_answer,
  qq.points,
  qq.order_index,
  qq.created_at,
  -- Check for data issues
  CASE 
    WHEN qq.question IS NULL OR qq.question = '' THEN '❌ MISSING QUESTION TEXT'
    WHEN qq.type IS NULL OR qq.type = '' THEN '❌ MISSING TYPE'
    WHEN qq.points IS NULL OR qq.points <= 0 THEN '❌ MISSING/INVALID POINTS'
    WHEN qq.order_index IS NULL THEN '❌ MISSING ORDER INDEX'
    ELSE '✅ VALID'
  END as data_status
FROM public.quiz_questions qq
JOIN public.quizzes q ON qq.quiz_id = q.id
JOIN public.courses c ON q.course_id = c.id
ORDER BY c.title, q.title, qq.order_index;

-- ===========================================
-- STEP 2: QUESTION COUNT BY QUIZ
-- ===========================================

SELECT 
  'QUESTION COUNTS BY QUIZ' as section,
  q.id as quiz_id,
  q.title as quiz_title,
  q.status as quiz_status,
  c.title as course_title,
  c.course_code,
  COUNT(qq.id) as total_questions,
  COUNT(CASE WHEN qq.question IS NULL OR qq.question = '' THEN 1 END) as missing_question_text,
  COUNT(CASE WHEN qq.type IS NULL OR qq.type = '' THEN 1 END) as missing_type,
  COUNT(CASE WHEN qq.points IS NULL OR qq.points <= 0 THEN 1 END) as missing_points,
  COUNT(CASE WHEN qq.order_index IS NULL THEN 1 END) as missing_order_index
FROM public.quizzes q
LEFT JOIN public.quiz_questions qq ON q.id = qq.quiz_id
JOIN public.courses c ON q.course_id = c.id
GROUP BY q.id, q.title, q.status, c.title, c.course_code
ORDER BY c.title, q.title;

-- ===========================================
-- STEP 3: CHECK FOR DUPLICATE QUESTIONS
-- ===========================================

SELECT 
  'DUPLICATE QUESTIONS CHECK' as section,
  quiz_id,
  question,
  COUNT(*) as duplicate_count
FROM public.quiz_questions
WHERE question IS NOT NULL AND question != ''
GROUP BY quiz_id, question
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- ===========================================
-- STEP 4: CHECK ORDER INDEX ISSUES
-- ===========================================

SELECT 
  'ORDER INDEX ISSUES' as section,
  quiz_id,
  COUNT(*) as total_questions,
  COUNT(DISTINCT order_index) as unique_order_indices,
  MIN(order_index) as min_order,
  MAX(order_index) as max_order,
  COUNT(CASE WHEN order_index IS NULL THEN 1 END) as null_order_count,
  COUNT(CASE WHEN order_index < 0 THEN 1 END) as negative_order_count
FROM public.quiz_questions
GROUP BY quiz_id
HAVING COUNT(*) > 0
ORDER BY total_questions DESC;

-- ===========================================
-- STEP 5: SAMPLE QUESTIONS FOR EACH QUIZ
-- ===========================================

SELECT 
  'SAMPLE QUESTIONS' as section,
  q.title as quiz_title,
  c.title as course_title,
  qq.question,
  qq.type,
  qq.points,
  qq.order_index
FROM public.quiz_questions qq
JOIN public.quizzes q ON qq.quiz_id = q.id
JOIN public.courses c ON q.course_id = c.id
WHERE qq.id IN (
  SELECT DISTINCT ON (quiz_id) id 
  FROM public.quiz_questions 
  ORDER BY quiz_id, order_index
)
ORDER BY c.title, q.title;

-- ===========================================
-- STEP 6: CHECK RLS POLICIES
-- ===========================================

SELECT 
  'RLS POLICIES' as section,
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
-- STEP 7: SUMMARY STATISTICS
-- ===========================================

SELECT 
  'SUMMARY STATISTICS' as section,
  COUNT(*) as total_questions,
  COUNT(DISTINCT quiz_id) as quizzes_with_questions,
  COUNT(DISTINCT q.course_id) as courses_with_quizzes,
  COUNT(CASE WHEN question IS NULL OR question = '' THEN 1 END) as questions_missing_text,
  COUNT(CASE WHEN type IS NULL OR type = '' THEN 1 END) as questions_missing_type,
  COUNT(CASE WHEN points IS NULL OR points <= 0 THEN 1 END) as questions_missing_points,
  COUNT(CASE WHEN order_index IS NULL THEN 1 END) as questions_missing_order_index
FROM public.quiz_questions qq
JOIN public.quizzes q ON qq.quiz_id = q.id;
