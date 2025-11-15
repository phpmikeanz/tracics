-- Test script to verify quiz question creation and retrieval
-- This script tests the fixes for the quiz questions issue

-- 1. Check if there are any existing quiz questions with the problematic quiz ID
SELECT 
  qq.id as question_id,
  qq.quiz_id,
  qq.question,
  qq.type,
  qq.correct_answer,
  qq.points,
  qq.order_index,
  qq.created_at
FROM public.quiz_questions qq
WHERE qq.quiz_id = '6442d0ef-2a3e-4f95-9014-faafdff408d3'
ORDER BY qq.order_index;

-- 2. Check if the quiz exists and is accessible
SELECT 
  q.id as quiz_id,
  q.title as quiz_title,
  q.status as quiz_status,
  q.course_id,
  c.title as course_title
FROM public.quizzes q
LEFT JOIN public.courses c ON q.course_id = c.id
WHERE q.id = '6442d0ef-2a3e-4f95-9014-faafdff408d3';

-- 3. Test creating a sample question of each type
-- Note: This is just for testing - you would normally use the application interface

-- Sample multiple choice question
INSERT INTO public.quiz_questions (
  quiz_id,
  question,
  type,
  options,
  correct_answer,
  points,
  order_index
) VALUES (
  '6442d0ef-2a3e-4f95-9014-faafdff408d3',
  'What is the capital of France?',
  'multiple_choice',
  '["Paris", "London", "Berlin", "Madrid"]'::jsonb,
  'Paris',
  5,
  0
) ON CONFLICT DO NOTHING;

-- Sample true/false question
INSERT INTO public.quiz_questions (
  quiz_id,
  question,
  type,
  correct_answer,
  points,
  order_index
) VALUES (
  '6442d0ef-2a3e-4f95-9014-faafdff408d3',
  'The sun rises in the east.',
  'true_false',
  'true',
  3,
  1
) ON CONFLICT DO NOTHING;

-- Sample short answer question
INSERT INTO public.quiz_questions (
  quiz_id,
  question,
  type,
  correct_answer,
  points,
  order_index
) VALUES (
  '6442d0ef-2a3e-4f95-9014-faafdff408d3',
  'What is 2 + 2?',
  'short_answer',
  '4',
  2,
  2
) ON CONFLICT DO NOTHING;

-- Sample essay question
INSERT INTO public.quiz_questions (
  quiz_id,
  question,
  type,
  correct_answer,
  points,
  order_index
) VALUES (
  '6442d0ef-2a3e-4f95-9014-faafdff408d3',
  'Explain the concept of photosynthesis.',
  'essay',
  'Photosynthesis is the process by which plants convert light energy into chemical energy...',
  10,
  3
) ON CONFLICT DO NOTHING;

-- 4. Verify all questions were created
SELECT 
  qq.id as question_id,
  qq.quiz_id,
  qq.question,
  qq.type,
  qq.correct_answer,
  qq.points,
  qq.order_index,
  qq.created_at
FROM public.quiz_questions qq
WHERE qq.quiz_id = '6442d0ef-2a3e-4f95-9014-faafdff408d3'
ORDER BY qq.order_index;

-- 5. Test the RLS policy by checking if questions are accessible
-- This should return the same results as above if RLS is working correctly
SELECT 
  qq.id,
  qq.quiz_id,
  qq.question,
  qq.type,
  qq.points
FROM public.quiz_questions qq
WHERE qq.quiz_id = '6442d0ef-2a3e-4f95-9014-faafdff408d3'
ORDER BY qq.order_index;


































