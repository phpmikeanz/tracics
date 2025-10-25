# Manual Grading "Update Database" Button Fix

## Problem Identified

The "Update Database" button in the manual grading interface wasn't working because **faculty don't have permission to update the `quiz_attempts` table** due to Row Level Security (RLS) policy restrictions.

### Root Cause
- ✅ Manual grades are being saved correctly to `quiz_question_grades` table
- ✅ Score calculation is working properly (auto-graded + manual grades)
- ❌ **Faculty cannot update `quiz_attempts` table** due to missing RLS policy
- ❌ Students continue to see "Pending Grading" instead of their actual scores

## Current RLS Policy Issue

The existing RLS policies for `quiz_attempts` only allow:
1. **Students** to manage their own quiz attempts
2. **Faculty** to **view** quiz attempts for their courses

But **faculty cannot update** quiz attempts, which is needed for manual grading.

## Fix Applied

### 1. Updated RLS Policy (`scripts/fix_quiz_attempts_rls_policy.sql`)

**Added new policy** to allow faculty to update quiz attempts:
```sql
CREATE POLICY "Faculty can update quiz attempts for their courses" ON public.quiz_attempts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON q.course_id = c.id 
          WHERE q.id = quiz_id AND c.instructor_id = auth.uid())
);
```

### 2. Enhanced Error Handling (`components/quizzes/manual-grading.tsx`)

Added better error detection and user-friendly messages for RLS policy errors:
- ✅ Detects RLS policy permission errors
- ✅ Shows clear error messages to faculty
- ✅ Provides guidance on how to fix the issue

### 3. Test Scripts Created

- `scripts/test_quiz_attempts_update.sql` - Verify RLS policies work correctly
- `scripts/fix_quiz_attempts_rls_policy.sql` - Apply the RLS policy fix

## How to Apply the Fix

### Step 1: Run the RLS Policy Fix
Execute the SQL script to update the database policies:
```sql
-- Run: scripts/fix_quiz_attempts_rls_policy.sql
```

### Step 2: Verify the Fix
Run the test script to ensure policies are working:
```sql
-- Run: scripts/test_quiz_attempts_update.sql
```

### Step 3: Test Manual Grading
1. Go to Quiz Management (faculty interface)
2. Open a quiz that has manual grades
3. Click "Manual Grading" for a student attempt
4. Give grades to essay/short answer questions
5. Click "Update Database" button
6. Verify the score and status are updated

## Expected Behavior After Fix

### Before Fix:
- ❌ "Update Database" button does nothing
- ❌ Students see "Pending Grading" 
- ❌ `quiz_attempts.score` remains 0
- ❌ `quiz_attempts.status` remains "completed"

### After Fix:
- ✅ "Update Database" button updates the database
- ✅ Students see their actual scores
- ✅ `quiz_attempts.score` shows total (auto + manual)
- ✅ `quiz_attempts.status` changes to "graded"

## Error Messages

### If RLS Policy Fix Not Applied:
```
🚨 RLS Policy Error: Faculty cannot update quiz attempts due to database policy restrictions. Please run the RLS policy fix script.
```

### If Fix Applied Successfully:
```
🎉 Success! Quiz attempt updated successfully! Score: 30 points, Status: Graded
```

## Verification Steps

1. **Check RLS Policies**:
   ```sql
   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'quiz_attempts';
   ```

2. **Test Faculty Update Permission**:
   ```sql
   -- This should work after the fix
   UPDATE quiz_attempts SET score = 30, status = 'graded' WHERE id = 'attempt-id';
   ```

3. **Check Student View**:
   - Student should see updated score instead of "Pending Grading"

## Troubleshooting

### If Update Database Still Doesn't Work:

1. **Check Browser Console**:
   - Look for RLS policy errors (code 42501)
   - Check for permission denied messages

2. **Verify RLS Policies**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'quiz_attempts';
   ```

3. **Check Faculty Role**:
   ```sql
   SELECT role FROM profiles WHERE id = 'faculty-user-id';
   ```

4. **Manual Database Update**:
   ```sql
   -- Update manually if needed
   UPDATE quiz_attempts 
   SET score = calculated_total, status = 'graded' 
   WHERE id = 'attempt-id';
   ```

## Related Files Modified

1. `scripts/fix_quiz_attempts_rls_policy.sql` - New RLS policy fix
2. `components/quizzes/manual-grading.tsx` - Enhanced error handling
3. `scripts/test_quiz_attempts_update.sql` - Test script
4. `MANUAL_GRADING_UPDATE_DATABASE_FIX.md` - This documentation

## Summary

The "Update Database" button wasn't working because faculty lacked permission to update the `quiz_attempts` table. This fix adds the necessary RLS policy to allow faculty to update quiz attempts for their own courses, enabling the manual grading system to work properly.
