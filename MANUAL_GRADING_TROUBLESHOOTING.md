# Manual Grading Troubleshooting Guide

## Issue: Grades Not Persisting in Manual Grading System

If you've entered grades but they're not showing up in the manual grading system, follow these troubleshooting steps:

### Step 1: Check Browser Console
1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Try to enter a grade again
4. Look for any error messages in the console
5. The enhanced logging will show:
   - Grade entry attempts
   - Database insertion results
   - Grade retrieval attempts
   - Any error details

### Step 2: Run Database Diagnostic Scripts
Run these SQL scripts to check the database:

1. **Basic System Check:**
   ```sql
   -- Run: scripts/test_manual_grading_simple.sql
   ```

2. **Detailed Diagnosis:**
   ```sql
   -- Run: scripts/diagnose_grade_persistence.sql
   ```

### Step 3: Common Issues and Solutions

#### Issue 1: RLS (Row Level Security) Policy Blocking Access
**Symptoms:** Grades appear to save but don't show up when retrieved
**Solution:** Check if the current user has proper permissions
```sql
-- Check RLS policies
SELECT policyname, cmd, qual FROM pg_policies 
WHERE tablename = 'quiz_question_grades';
```

#### Issue 2: Database Connection Issues
**Symptoms:** Console shows network errors or timeout messages
**Solution:** 
- Check your internet connection
- Verify Supabase project is active
- Check if you're logged in properly

#### Issue 3: Invalid Attempt ID or Question ID
**Symptoms:** Console shows "not found" errors
**Solution:**
- Verify the quiz attempt exists and is completed
- Check that the question IDs are valid
- Ensure the attempt has essay/short answer questions

#### Issue 4: User Authentication Issues
**Symptoms:** Console shows authentication errors
**Solution:**
- Log out and log back in
- Check if your user account has faculty permissions
- Verify you're enrolled in the course as an instructor

### Step 4: Manual Database Check
If the application isn't working, you can manually check the database:

1. **Check if grades exist:**
   ```sql
   SELECT * FROM public.quiz_question_grades 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

2. **Check specific attempt:**
   ```sql
   SELECT * FROM public.quiz_question_grades 
   WHERE attempt_id = 'YOUR_ATTEMPT_ID';
   ```

3. **Check quiz attempts:**
   ```sql
   SELECT qa.*, q.title 
   FROM public.quiz_attempts qa
   JOIN public.quizzes q ON qa.quiz_id = q.id
   WHERE qa.status = 'completed'
   ORDER BY qa.completed_at DESC;
   ```

### Step 5: Test Grade Insertion Manually
If the application isn't working, test the database directly:

```sql
-- Replace with actual IDs from your system
INSERT INTO public.quiz_question_grades (
  attempt_id,
  question_id,
  points_awarded,
  feedback,
  graded_by
) VALUES (
  'YOUR_ATTEMPT_ID',
  'YOUR_QUESTION_ID',
  5,
  'Test feedback',
  'YOUR_USER_ID'
);
```

### Step 6: Check Application Logs
Look for these specific log messages in the browser console:

- `"gradeQuestion called with:"` - Shows grade entry attempt
- `"Grade inserted successfully:"` - Confirms database insertion
- `"getQuestionGrades called for attempt:"` - Shows grade retrieval attempt
- `"Retrieved grades for attempt:"` - Shows retrieved grades

### Step 7: Reset and Retry
If nothing else works:

1. **Clear browser cache and cookies**
2. **Log out and log back in**
3. **Try a different browser**
4. **Check if the issue is specific to one quiz or affects all quizzes**

### Step 8: Contact Support
If the issue persists, provide:

1. **Browser console logs** (copy all error messages)
2. **Database query results** (from the diagnostic scripts)
3. **Steps to reproduce** the issue
4. **Quiz ID and Attempt ID** that's having issues

### Enhanced Debugging Features Added

The system now includes comprehensive logging:

- **Grade Entry Logging:** Shows all grade entry attempts with details
- **Database Operation Logging:** Shows database insert/select operations
- **Error Detail Logging:** Shows detailed error information
- **User Authentication Logging:** Shows current user information
- **Grade Retrieval Logging:** Shows grade retrieval attempts and results

### Quick Fixes to Try

1. **Refresh the page** after entering grades
2. **Check if you're logged in** as the correct user
3. **Verify the quiz attempt is completed** (not in progress)
4. **Ensure you have faculty permissions** for the course
5. **Try entering grades one at a time** instead of all at once

### Expected Behavior

After entering a grade, you should see:
1. Success toast message
2. Question status changes to "Graded"
3. Grade appears in the progress summary
4. Grade persists when you refresh the page
5. Grade is included in final score calculation


































