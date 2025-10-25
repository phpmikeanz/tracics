# Quiz Questions Setup Guide

## Problem Diagnosis
Your quiz questions are not showing for students because the database is missing the necessary data or the student is not properly enrolled. Here's how to fix it:

## Step 1: Check Your Data

### 1.1 Verify Student Enrollment
Make sure the student is enrolled and approved for the course:

```sql
-- Check enrollments
SELECT 
  e.id,
  e.student_id,
  e.course_id,
  e.status,
  c.title as course_title,
  p.full_name as student_name
FROM enrollments e
JOIN courses c ON e.course_id = c.id
JOIN profiles p ON e.student_id = p.id
WHERE e.status = 'approved';
```

### 1.2 Verify Quiz Status
Make sure quizzes are published:

```sql
-- Check quiz status
SELECT 
  q.id,
  q.title,
  q.status,
  q.course_id,
  c.title as course_title
FROM quizzes q
JOIN courses c ON q.course_id = c.id
WHERE q.status IN ('published', 'closed');
```

### 1.3 Verify Quiz Questions
Make sure questions exist for the quiz:

```sql
-- Check quiz questions
SELECT 
  qq.id,
  qq.quiz_id,
  qq.question,
  qq.type,
  qq.points,
  q.title as quiz_title,
  q.status as quiz_status
FROM quiz_questions qq
JOIN quizzes q ON qq.quiz_id = q.id
WHERE q.status IN ('published', 'closed');
```

## Step 2: Fix Missing Data

### 2.1 Create Test Data (if needed)

If you don't have any data, create some test data:

```sql
-- 1. Create a test course (if you don't have one)
INSERT INTO courses (id, title, course_code, instructor_id, description)
VALUES (
  gen_random_uuid(),
  'Test Course',
  'TEST101',
  'your-instructor-id-here',
  'A test course for quiz functionality'
);

-- 2. Create a test quiz
INSERT INTO quizzes (id, title, description, course_id, time_limit, max_attempts, due_date, status)
VALUES (
  gen_random_uuid(),
  'Test Quiz',
  'A test quiz to verify functionality',
  'your-course-id-here',
  30,
  3,
  NOW() + INTERVAL '7 days',
  'published'
);

-- 3. Create test questions
INSERT INTO quiz_questions (id, quiz_id, question, type, options, correct_answer, points, order_index)
VALUES 
  (gen_random_uuid(), 'your-quiz-id-here', 'What is 2 + 2?', 'multiple_choice', '["3", "4", "5", "6"]', '4', 10, 1),
  (gen_random_uuid(), 'your-quiz-id-here', 'Is the sky blue?', 'true_false', NULL, 'true', 5, 2),
  (gen_random_uuid(), 'your-quiz-id-here', 'Explain photosynthesis.', 'essay', NULL, NULL, 15, 3);

-- 4. Enroll a student (replace with actual student ID)
INSERT INTO enrollments (id, student_id, course_id, status)
VALUES (
  gen_random_uuid(),
  'your-student-id-here',
  'your-course-id-here',
  'approved'
);
```

### 2.2 Update Existing Data

If you have data but it's not working:

```sql
-- Make sure quiz is published
UPDATE quizzes 
SET status = 'published' 
WHERE id = 'your-quiz-id-here';

-- Make sure enrollment is approved
UPDATE enrollments 
SET status = 'approved' 
WHERE student_id = 'your-student-id-here' 
AND course_id = 'your-course-id-here';
```

## Step 3: Verify RLS Policies

### 3.1 Check Current RLS Policies

```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'quiz_questions';

-- Check existing policies
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'quiz_questions';
```

### 3.2 Apply RLS Policy (if missing)

```sql
-- Enable RLS
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

-- Create policy for quiz questions access
CREATE POLICY "Users can view quiz questions" ON quiz_questions FOR SELECT USING (
  -- Faculty can view questions for their own courses (any quiz status)
  EXISTS (
    SELECT 1 FROM quizzes q 
    JOIN courses c ON q.course_id = c.id 
    WHERE q.id = quiz_id 
    AND c.instructor_id = auth.uid()
  ) OR
  -- Students can view questions for published/closed quizzes in courses they're enrolled in and approved for
  EXISTS (
    SELECT 1 FROM quizzes q 
    JOIN enrollments e ON q.course_id = e.course_id 
    WHERE q.id = quiz_id 
    AND e.student_id = auth.uid() 
    AND e.status = 'approved'
    AND q.status IN ('published', 'closed')
  )
);
```

## Step 4: Test Student Access

### 4.1 Test as Student User

1. Log in as a student
2. Navigate to the quiz
3. Check browser console for any errors
4. Verify the student is enrolled and approved for the course

### 4.2 Debug Steps

If questions still don't show:

1. **Check browser console** for RLS policy errors
2. **Verify student enrollment** status is 'approved'
3. **Verify quiz status** is 'published' or 'closed'
4. **Check quiz has questions** in the database
5. **Test RLS policy** by running the test queries above

## Step 5: Common Issues and Solutions

### Issue 1: "No Questions Available" Message
**Cause**: Student not enrolled or quiz not published
**Solution**: 
- Enroll student in course with 'approved' status
- Publish the quiz (status = 'published')

### Issue 2: RLS Policy Errors
**Cause**: Missing or incorrect RLS policy
**Solution**: Apply the RLS policy from Step 3.2

### Issue 3: Empty Database
**Cause**: No test data exists
**Solution**: Create test data using Step 2.1

### Issue 4: Student Can't See Quiz
**Cause**: Quiz not published or student not enrolled
**Solution**: 
- Check quiz status is 'published'
- Check student enrollment is 'approved'

## Step 6: Verification Checklist

- [ ] Student is enrolled in course
- [ ] Enrollment status is 'approved'
- [ ] Quiz exists and has questions
- [ ] Quiz status is 'published' or 'closed'
- [ ] RLS policy is applied to quiz_questions table
- [ ] Student is logged in with correct user ID
- [ ] No console errors in browser

## Step 7: Quick Test Script

Run this script to verify everything is working:

```sql
-- Complete verification query
SELECT 
  'Student Access Test' as test_name,
  COUNT(DISTINCT qq.id) as accessible_questions,
  COUNT(DISTINCT q.id) as accessible_quizzes,
  COUNT(DISTINCT e.id) as approved_enrollments
FROM quiz_questions qq
JOIN quizzes q ON qq.quiz_id = q.id
JOIN courses c ON q.course_id = c.id
JOIN enrollments e ON c.id = e.course_id
WHERE e.student_id = auth.uid() 
AND e.status = 'approved'
AND q.status IN ('published', 'closed');
```

If this returns 0 for all counts, then either:
1. No data exists (create test data)
2. Student is not enrolled (enroll student)
3. Quiz is not published (publish quiz)
4. RLS policy is blocking access (apply RLS policy)

## Next Steps

1. **Check your Supabase Dashboard** for the data mentioned above
2. **Create test data** if none exists
3. **Apply RLS policies** if missing
4. **Test with a student account** to verify access
5. **Check browser console** for any error messages

The most common issue is that students need to be properly enrolled and approved for courses, and quizzes need to be published for students to access them.
