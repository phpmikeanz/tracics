# Quiz Question Grades Table Debug Guide

## Issue: Data Not Being Inserted into quiz_question_grades Table

If data is not being inserted into your `quiz_question_grades` table in Supabase, follow this step-by-step debugging guide.

### Step 1: Check Table Existence and Structure

Run these SQL scripts in your Supabase SQL editor:

1. **Check Table Names:**
   ```sql
   -- Run: scripts/check_table_names.sql
   ```
   This will check if the table exists and verify the correct name.

2. **Simple Table Check:**
   ```sql
   -- Run: scripts/simple_table_check.sql
   ```
   This will give you basic information about the table.

### Step 2: Comprehensive Table Analysis

Run the detailed analysis:
```sql
-- Run: scripts/check_quiz_question_grades_table.sql
```

This will check:
- Table structure
- Existing data
- RLS policies
- Constraints
- Permissions

### Step 3: Test Data Insertion

Run the insertion test:
```sql
-- Run: scripts/test_data_insertion.sql
```

This will:
- Find valid test data
- Test insertion capabilities
- Show results

### Step 4: Common Issues and Solutions

#### Issue 1: Table Doesn't Exist
**Symptoms:** Scripts show "relation does not exist" error
**Solution:** Create the table:
```sql
-- Run: scripts/006_add_manual_grading_system.sql
```

#### Issue 2: Wrong Table Name
**Symptoms:** You mentioned "quiz_questions_grades" but code uses "quiz_question_grades"
**Solution:** 
- Check which table actually exists
- Update the code if needed, or
- Rename the table to match the code

#### Issue 3: RLS (Row Level Security) Blocking Access
**Symptoms:** Table exists but no data can be inserted
**Solution:** Fix RLS policies:
```sql
-- Run: scripts/fix_manual_grading_rls_policies.sql
```

#### Issue 4: Missing Foreign Key References
**Symptoms:** Insertion fails with foreign key constraint errors
**Solution:** 
1. Check if related tables exist:
   ```sql
   SELECT COUNT(*) FROM public.quiz_attempts;
   SELECT COUNT(*) FROM public.quiz_questions;
   SELECT COUNT(*) FROM public.profiles;
   ```

2. Ensure you have valid IDs to reference

#### Issue 5: Permission Issues
**Symptoms:** Access denied errors
**Solution:**
1. Check your user role:
   ```sql
   SELECT id, email, role FROM public.profiles WHERE id = auth.uid();
   ```

2. Ensure you have faculty role:
   ```sql
   UPDATE public.profiles SET role = 'faculty' WHERE id = auth.uid();
   ```

### Step 5: Manual Table Creation (if needed)

If the table doesn't exist, create it:

```sql
-- Create the table
CREATE TABLE IF NOT EXISTS public.quiz_question_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  points_awarded INTEGER DEFAULT 0,
  feedback TEXT,
  graded_by UUID REFERENCES public.profiles(id),
  graded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_quiz_question_grades_attempt_id ON public.quiz_question_grades(attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_question_grades_question_id ON public.quiz_question_grades(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_question_grades_graded_by ON public.quiz_question_grades(graded_by);

-- Enable RLS
ALTER TABLE public.quiz_question_grades ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Faculty can view grades for their quizzes" ON public.quiz_question_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      JOIN public.quizzes q ON qa.quiz_id = q.id
      JOIN public.courses c ON q.course_id = c.id
      WHERE qa.id = quiz_question_grades.attempt_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Faculty can insert grades for their quizzes" ON public.quiz_question_grades
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      JOIN public.quizzes q ON qa.quiz_id = q.id
      JOIN public.courses c ON q.course_id = c.id
      WHERE qa.id = quiz_question_grades.attempt_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Faculty can update grades for their quizzes" ON public.quiz_question_grades
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      JOIN public.quizzes q ON qa.quiz_id = q.id
      JOIN public.courses c ON q.course_id = c.id
      WHERE qa.id = quiz_question_grades.attempt_id
      AND c.instructor_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      JOIN public.quizzes q ON qa.quiz_id = q.id
      JOIN public.courses c ON q.course_id = c.id
      WHERE qa.id = quiz_question_grades.attempt_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their own question grades" ON public.quiz_question_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      WHERE qa.id = quiz_question_grades.attempt_id
      AND qa.student_id = auth.uid()
    )
  );
```

### Step 6: Test the Application

After fixing the table issues:

1. **Open your application** and try to grade an essay/short answer question
2. **Check browser console** (F12) for error messages
3. **Run the diagnostic scripts** again to verify data is being inserted
4. **Check the table** directly in Supabase to see if records appear

### Step 7: Verify Data Insertion

Check if data is being inserted:

```sql
-- Check recent records
SELECT 
  id,
  attempt_id,
  question_id,
  points_awarded,
  feedback,
  graded_by,
  created_at
FROM public.quiz_question_grades
ORDER BY created_at DESC
LIMIT 10;

-- Check total count
SELECT COUNT(*) as total_records FROM public.quiz_question_grades;
```

### Step 8: Common Error Messages and Solutions

#### "relation 'quiz_question_grades' does not exist"
- **Solution:** Create the table using the script above

#### "permission denied for table quiz_question_grades"
- **Solution:** Fix RLS policies or check your user role

#### "insert or update on table 'quiz_question_grades' violates foreign key constraint"
- **Solution:** Ensure the attempt_id and question_id exist in their respective tables

#### "duplicate key value violates unique constraint"
- **Solution:** The grade already exists, use UPDATE instead of INSERT

### Step 9: Quick Fixes to Try

1. **Check table name** - Make sure it's `quiz_question_grades` (not `quiz_questions_grades`)
2. **Create the table** if it doesn't exist
3. **Fix RLS policies** if they're blocking access
4. **Check your user role** - Must be 'faculty'
5. **Verify foreign key references** exist
6. **Test with manual SQL insertion** first

### Step 10: Contact Support

If the issue persists, provide:

1. **Results from all diagnostic scripts**
2. **Exact error messages** from browser console
3. **Table structure** (from the diagnostic scripts)
4. **Your user role** and permissions
5. **Steps to reproduce** the issue

### Expected Results

After fixing the issues, you should see:
- ✅ Table exists with correct structure
- ✅ RLS policies allow faculty access
- ✅ Data can be inserted successfully
- ✅ Grades appear in the application
- ✅ Records are visible in Supabase dashboard



































