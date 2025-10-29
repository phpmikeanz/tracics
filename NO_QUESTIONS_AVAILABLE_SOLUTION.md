# "No Questions Available" Issue - Complete Solution Guide

## Problem Analysis

The "No Questions Available" error occurs when students try to take a quiz, even though faculty have added questions. After investigation, I found the root cause:

**The database has NO QUIZZES, NO QUESTIONS, and NO ENROLLMENTS.**

## Root Cause

1. **Empty Database**: The database contains courses and faculty profiles, but no quizzes, questions, or student enrollments
2. **RLS Policies**: Row Level Security policies are preventing data creation without proper authentication
3. **Missing Sample Data**: The system needs initial data to function properly

## Current Database State

```
✅ Courses: 2 (MICHO, Programming ssss)
✅ Faculty: 1 (Juan Dela Cruz)
❌ Quizzes: 0
❌ Questions: 0
❌ Enrollments: 0
❌ Students: 1 (Micho A. Robledo) - but not enrolled
```

## Solutions

### Solution 1: Create Data Through the App (Recommended)

1. **Sign in as Faculty**:
   - Go to your app
   - Sign in with faculty credentials (Juan Dela Cruz)
   - Navigate to quiz management

2. **Create a Quiz**:
   - Create a new quiz for the MICHO course
   - Set status to "published"
   - Add questions (multiple choice, true/false, essay)

3. **Enroll Students**:
   - Go to course management
   - Enroll Micho A. Robledo in the MICHO course
   - Set enrollment status to "approved"

### Solution 2: Use Database Admin Tools

1. **Access Supabase Dashboard**:
   - Go to https://supabase.com/dashboard
   - Select your project
   - Go to SQL Editor

2. **Run This SQL**:
```sql
-- Create a quiz
INSERT INTO quizzes (title, description, course_id, status, time_limit, max_attempts, due_date)
SELECT 
  'Sample Quiz: ' || c.title,
  'A comprehensive quiz covering the fundamentals of ' || c.title,
  c.id,
  'published',
  30,
  3,
  NOW() + INTERVAL '7 days'
FROM courses c
WHERE c.title = 'MICHO'
LIMIT 1;

-- Create questions for the quiz
WITH quiz_data AS (
  SELECT id as quiz_id, title as quiz_title
  FROM quizzes 
  WHERE title LIKE 'Sample Quiz:%'
  ORDER BY created_at DESC 
  LIMIT 1
)
INSERT INTO quiz_questions (quiz_id, question, type, options, correct_answer, points, order_index)
SELECT 
  qd.quiz_id,
  'What is the main purpose of ' || qd.quiz_title || '?',
  'multiple_choice',
  '["To solve complex problems", "To create beautiful websites", "To manage databases", "To write documentation"]',
  'To solve complex problems',
  10,
  1
FROM quiz_data qd
UNION ALL
SELECT 
  qd.quiz_id,
  'Is ' || qd.quiz_title || ' an important subject?',
  'true_false',
  NULL,
  'true',
  5,
  2
FROM quiz_data qd
UNION ALL
SELECT 
  qd.quiz_id,
  'Explain why ' || qd.quiz_title || ' is important in modern education.',
  'essay',
  NULL,
  NULL,
  15,
  3
FROM quiz_data qd;

-- Create enrollment
WITH quiz_data AS (
  SELECT q.id as quiz_id, q.course_id
  FROM quizzes q
  WHERE q.title LIKE 'Sample Quiz:%'
  ORDER BY q.created_at DESC 
  LIMIT 1
),
student_data AS (
  SELECT p.id as student_id
  FROM profiles p
  WHERE p.role = 'student'
  LIMIT 1
)
INSERT INTO enrollments (student_id, course_id, status, progress)
SELECT 
  sd.student_id,
  qd.course_id,
  'approved',
  0
FROM quiz_data qd, student_data sd;
```

### Solution 3: Fix RLS Policies (Advanced)

If you need to create data programmatically, you'll need to fix the RLS policies:

1. **Temporarily Disable RLS**:
```sql
ALTER TABLE quizzes DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments DISABLE ROW LEVEL SECURITY;
```

2. **Create Your Data** (using any of the scripts provided)

3. **Re-enable RLS**:
```sql
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
```

4. **Apply Proper RLS Policies** (run the `fix_quiz_rls_policies.sql` script)

## Verification Steps

After implementing any solution, verify the fix:

1. **Check Database**:
```sql
SELECT COUNT(*) as quiz_count FROM quizzes;
SELECT COUNT(*) as question_count FROM quiz_questions;
SELECT COUNT(*) as enrollment_count FROM enrollments WHERE status = 'approved';
```

2. **Test Student Access**:
   - Sign in as a student (Micho A. Robledo)
   - Navigate to quizzes
   - Verify you can see the quiz
   - Start the quiz and verify questions appear

## Files Created for Debugging

- `check_quizzes.js` - Checks current database state
- `create_sample_data.js` - Attempts to create sample data
- `create_data_direct.js` - Direct data creation
- `create_data_no_rls.js` - Data creation with RLS workarounds
- `create_data_as_faculty.js` - Faculty-based data creation
- `create_sample_data_simple.sql` - SQL script for data creation

## Expected Result

After implementing any solution, students should be able to:
1. See quizzes in their dashboard
2. Start quizzes without "No Questions Available" error
3. Answer questions and submit quizzes
4. View their results

## Next Steps

1. Choose one of the solutions above
2. Implement it
3. Test with a student account
4. Verify the quiz system works end-to-end

The most straightforward approach is **Solution 1** - using the app's faculty interface to create quizzes and enroll students.


