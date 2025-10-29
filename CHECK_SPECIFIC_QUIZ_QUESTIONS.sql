-- QUICK CHECK FOR SPECIFIC QUIZ QUESTIONS
-- Replace 'QUIZ_ID_HERE' with the actual quiz ID from your console logs

-- ===========================================
-- STEP 1: FIND QUIZ IDS
-- ===========================================

SELECT 
  'AVAILABLE QUIZZES' as section,
  q.id as quiz_id,
  q.title as quiz_title,
  q.status as quiz_status,
  c.title as course_title,
  c.course_code,
  COUNT(qq.id) as question_count
FROM public.quizzes q
LEFT JOIN public.quiz_questions qq ON q.id = qq.quiz_id
JOIN public.courses c ON q.course_id = c.id
GROUP BY q.id, q.title, q.status, c.title, c.course_code
ORDER BY q.created_at DESC;

-- ===========================================
-- STEP 2: CHECK QUESTIONS FOR A SPECIFIC QUIZ
-- Replace 'ac5764eb-0887-4a61-bbed-dab69a5186a4' with your quiz ID
-- ===========================================

SELECT 
  'QUESTIONS FOR QUIZ: ac5764eb-0887-4a61-bbed-dab69a5186a4' as section,
  qq.id as question_id,
  qq.question,
  qq.type,
  qq.options,
  qq.points,
  qq.order_index,
  qq.created_at,
  -- Data validation
  CASE 
    WHEN qq.question IS NULL OR qq.question = '' THEN '❌ NO QUESTION TEXT'
    WHEN qq.type IS NULL OR qq.type = '' THEN '❌ NO TYPE'
    WHEN qq.points IS NULL OR qq.points <= 0 THEN '❌ NO POINTS'
    WHEN qq.order_index IS NULL THEN '❌ NO ORDER'
    ELSE '✅ OK'
  END as status
FROM public.quiz_questions qq
WHERE qq.quiz_id = 'ac5764eb-0887-4a61-bbed-dab69a5186a4'
ORDER BY qq.order_index, qq.created_at;

-- ===========================================
-- STEP 3: CHECK ALL QUIZ QUESTIONS (NO FILTER)
-- ===========================================

SELECT 
  'ALL QUIZ QUESTIONS (RAW)' as section,
  qq.id as question_id,
  qq.quiz_id,
  qq.question,
  qq.type,
  qq.points,
  qq.order_index,
  q.title as quiz_title,
  q.status as quiz_status
FROM public.quiz_questions qq
JOIN public.quizzes q ON qq.quiz_id = q.id
ORDER BY qq.quiz_id, qq.order_index
LIMIT 20;

-- ===========================================
-- STEP 4: CHECK FOR NULL OR EMPTY VALUES
-- ===========================================

SELECT 
  'PROBLEMATIC QUESTIONS' as section,
  qq.id as question_id,
  qq.quiz_id,
  qq.question,
  qq.type,
  qq.points,
  qq.order_index,
  q.title as quiz_title,
  -- Specific issues
  CASE WHEN qq.question IS NULL THEN 'NULL question' END as issue_1,
  CASE WHEN qq.question = '' THEN 'EMPTY question' END as issue_2,
  CASE WHEN qq.type IS NULL THEN 'NULL type' END as issue_3,
  CASE WHEN qq.type = '' THEN 'EMPTY type' END as issue_4,
  CASE WHEN qq.points IS NULL THEN 'NULL points' END as issue_5,
  CASE WHEN qq.points <= 0 THEN 'INVALID points' END as issue_6,
  CASE WHEN qq.order_index IS NULL THEN 'NULL order_index' END as issue_7
FROM public.quiz_questions qq
JOIN public.quizzes q ON qq.quiz_id = q.id
WHERE 
  qq.question IS NULL OR qq.question = '' OR
  qq.type IS NULL OR qq.type = '' OR
  qq.points IS NULL OR qq.points <= 0 OR
  qq.order_index IS NULL
ORDER BY qq.quiz_id, qq.order_index;
