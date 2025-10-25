# RLS (Row Level Security) Configuration Guide

## What is RLS?

Row Level Security (RLS) is a PostgreSQL feature that allows you to control which rows users can access in database tables. It's essential for multi-tenant applications like your LMS to ensure data privacy and security.

## Current RLS Issues in Your Quiz System

Based on the manual grading problem we just fixed, here are the main RLS configuration issues:

### 1. **Missing Faculty Update Permission for Quiz Attempts**
- ❌ Faculty can view quiz attempts but cannot update them
- ❌ This prevents manual grading from updating scores and status
- ✅ **Fix**: Add UPDATE policy for faculty on quiz_attempts table

### 2. **Quiz Questions Access Issues**
- ❌ Students might not be able to access quiz questions properly
- ❌ RLS policy doesn't check if quiz is published
- ✅ **Fix**: Update quiz_questions policy to only allow access to published quizzes

## How to Configure RLS

### Step 1: Enable RLS on Tables

First, ensure RLS is enabled on all your tables:

```sql
-- Enable RLS on all quiz-related tables
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_question_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
```

### Step 2: Create Proper RLS Policies

Here's the complete RLS policy configuration:

## Complete RLS Policy Configuration

### 1. **Quiz Attempts Policies**

```sql
-- Students can manage their own quiz attempts
CREATE POLICY "Students can manage own quiz attempts" ON public.quiz_attempts FOR ALL USING (
  student_id = auth.uid()
);

-- Faculty can view quiz attempts for their courses
CREATE POLICY "Faculty can view quiz attempts for their courses" ON public.quiz_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON q.course_id = c.id 
          WHERE q.id = quiz_id AND c.instructor_id = auth.uid())
);

-- Faculty can update quiz attempts for their courses (for grading)
CREATE POLICY "Faculty can update quiz attempts for their courses" ON public.quiz_attempts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON q.course_id = c.id 
          WHERE q.id = quiz_id AND c.instructor_id = auth.uid())
);
```

### 2. **Quiz Questions Policies**

```sql
-- Users can view quiz questions for published quizzes only
CREATE POLICY "Users can view quiz questions" ON public.quiz_questions FOR SELECT USING (
  -- Faculty can view questions for their own courses (any quiz status)
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE q.id = quiz_id 
    AND c.instructor_id = auth.uid()
  ) OR
  -- Students can view questions for published/closed quizzes in courses they're enrolled in
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    JOIN public.enrollments e ON q.course_id = e.course_id 
    WHERE q.id = quiz_id 
    AND e.student_id = auth.uid() 
    AND e.status = 'approved'
    AND q.status IN ('published', 'closed')
  )
);

-- Faculty can manage quiz questions for their courses
CREATE POLICY "Faculty can manage quiz questions" ON public.quiz_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON q.course_id = c.id 
          WHERE q.id = quiz_id AND c.instructor_id = auth.uid())
);
```

### 3. **Quiz Question Grades Policies**

```sql
-- Students can view their own question grades
CREATE POLICY "Students can view own question grades" ON public.quiz_question_grades FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quiz_attempts WHERE id = attempt_id AND student_id = auth.uid())
);

-- Faculty can manage question grades for their courses
CREATE POLICY "Faculty can manage question grades for their courses" ON public.quiz_question_grades FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa 
    JOIN public.quizzes q ON qa.quiz_id = q.id 
    JOIN public.courses c ON q.course_id = c.id 
    WHERE qa.id = attempt_id AND c.instructor_id = auth.uid()
  )
);
```

### 4. **Quizzes Policies**

```sql
-- Students can view published quizzes for enrolled courses
CREATE POLICY "Students can view published quizzes for enrolled courses" ON public.quizzes FOR SELECT USING (
  status IN ('published', 'closed') AND
  EXISTS (SELECT 1 FROM public.enrollments WHERE course_id = quizzes.course_id AND student_id = auth.uid() AND status = 'approved')
);

-- Faculty can view all quizzes for their courses
CREATE POLICY "Faculty can view quizzes for their courses" ON public.quizzes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = quizzes.course_id AND instructor_id = auth.uid())
);

-- Faculty can manage quizzes for their courses
CREATE POLICY "Faculty can manage quizzes for their courses" ON public.quizzes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid())
);
```

## How to Apply RLS Configuration

### Option 1: Use the Fix Scripts

I've created fix scripts for you:

1. **Fix Quiz Attempts RLS**:
   ```bash
   # Run this script to fix quiz_attempts policies
   scripts/fix_quiz_attempts_rls_policy.sql
   ```

2. **Fix Quiz Questions RLS**:
   ```bash
   # Run this script to fix quiz_questions policies
   scripts/update_quiz_questions_rls_policy.sql
   ```

### Option 2: Manual Configuration

If you prefer to configure manually:

1. **Connect to your database**:
   ```bash
   psql -h localhost -U postgres -d modern_lms
   ```

2. **Run the policy commands** from the configuration above

3. **Verify the policies**:
   ```sql
   SELECT tablename, policyname, cmd, qual 
   FROM pg_policies 
   WHERE tablename IN ('quiz_attempts', 'quiz_questions', 'quiz_question_grades', 'quizzes')
   ORDER BY tablename, policyname;
   ```

## Testing RLS Configuration

### Test Faculty Permissions

```sql
-- Test if faculty can update quiz attempts
UPDATE quiz_attempts 
SET score = 30, status = 'graded' 
WHERE id = 'your-attempt-id';

-- Test if faculty can view quiz questions
SELECT * FROM quiz_questions WHERE quiz_id = 'your-quiz-id';
```

### Test Student Permissions

```sql
-- Test if students can view published quiz questions
SELECT * FROM quiz_questions qq
JOIN quizzes q ON qq.quiz_id = q.id
WHERE q.status = 'published';

-- Test if students can view their own quiz attempts
SELECT * FROM quiz_attempts WHERE student_id = auth.uid();
```

## Common RLS Issues and Solutions

### Issue 1: "Permission Denied" Errors
**Solution**: Check if the user has the right role and permissions

### Issue 2: "Policy Violation" Errors
**Solution**: Verify the RLS policy conditions match your data relationships

### Issue 3: Students Can't See Quiz Questions
**Solution**: Ensure the quiz is published and student is enrolled and approved

### Issue 4: Faculty Can't Update Quiz Attempts
**Solution**: Add UPDATE policy for faculty on quiz_attempts table

## Verification Commands

```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'quiz%';

-- Check all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check user roles
SELECT id, email, role FROM profiles WHERE id = auth.uid();
```

## Summary

Proper RLS configuration ensures:
- ✅ Students can only access their own data and published content
- ✅ Faculty can manage content for their courses
- ✅ Manual grading works properly
- ✅ Data security and privacy are maintained
- ✅ System functions as expected for all user roles

The key fix for your manual grading issue is adding the UPDATE policy for faculty on the quiz_attempts table.
