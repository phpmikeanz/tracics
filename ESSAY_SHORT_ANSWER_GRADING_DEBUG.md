# Essay and Short Answer Grading Debug Guide

## Issue: Faculty Cannot Grade Essay and Short Answer Questions

If you're unable to grade essay and short answer questions, follow this comprehensive debugging guide.

### Step 1: Run Database Diagnostic Scripts

1. **Basic System Check:**
   ```sql
   -- Run: scripts/test_essay_short_answer_grading.sql
   ```

2. **Fix RLS Policies (if needed):**
   ```sql
   -- Run: scripts/fix_manual_grading_rls_policies.sql
   ```

### Step 2: Check Browser Console

1. Open Developer Tools (F12)
2. Go to Console tab
3. Try to grade an essay/short answer question
4. Look for these specific log messages:

#### Expected Log Messages:
- `"gradeQuestion called with:"` - Shows grade entry attempt
- `"Current user:"` - Shows your user ID
- `"User profile:"` - Shows your role (should be 'faculty')
- `"Inserting grade data:"` - Shows the data being inserted
- `"Grade inserted successfully:"` - Confirms successful insertion

#### Error Messages to Look For:
- `"Only faculty can grade questions"` - Role permission issue
- `"Error getting user:"` - Authentication issue
- `"Error grading question:"` - Database insertion issue
- RLS policy errors (usually 403 or permission denied)

### Step 3: Test Grade Insertion Manually

You can test grade insertion directly from the browser console:

1. Open Developer Tools (F12)
2. Go to Console tab
3. Run this test function:
   ```javascript
   // Import the test function (you may need to adjust the import path)
   import { testGradeInsertion } from './lib/quizzes'
   
   // Test with actual IDs from your system
   testGradeInsertion('YOUR_ATTEMPT_ID', 'YOUR_QUESTION_ID')
   ```

### Step 4: Common Issues and Solutions

#### Issue 1: RLS Policy Blocking Access
**Symptoms:** Console shows permission denied errors
**Solution:** Run the RLS policy fix script:
```sql
-- Run: scripts/fix_manual_grading_rls_policies.sql
```

#### Issue 2: User Role Not Faculty
**Symptoms:** Console shows "Only faculty can grade questions"
**Solution:** 
1. Check your user profile in the database:
   ```sql
   SELECT id, email, role FROM public.profiles WHERE id = 'YOUR_USER_ID';
   ```
2. Update your role if needed:
   ```sql
   UPDATE public.profiles SET role = 'faculty' WHERE id = 'YOUR_USER_ID';
   ```

#### Issue 3: Authentication Issues
**Symptoms:** Console shows "Error getting user" or user ID is null
**Solution:**
1. Log out and log back in
2. Check if you're properly authenticated
3. Verify your session is valid

#### Issue 4: Invalid Attempt or Question IDs
**Symptoms:** Console shows "not found" errors
**Solution:**
1. Verify the quiz attempt exists and is completed
2. Check that the question IDs are valid
3. Ensure the attempt has essay/short answer questions

#### Issue 5: Database Connection Issues
**Symptoms:** Console shows network errors or timeouts
**Solution:**
1. Check your internet connection
2. Verify Supabase project is active
3. Check Supabase project settings

### Step 5: Manual Database Verification

If the application isn't working, check the database directly:

1. **Check if you have faculty role:**
   ```sql
   SELECT id, email, role FROM public.profiles 
   WHERE email = 'your-email@example.com';
   ```

2. **Check if the quiz attempt exists:**
   ```sql
   SELECT qa.*, q.title, p.full_name as student_name
   FROM public.quiz_attempts qa
   JOIN public.quizzes q ON qa.quiz_id = q.id
   JOIN public.profiles p ON qa.student_id = p.id
   WHERE qa.id = 'YOUR_ATTEMPT_ID';
   ```

3. **Check if the question exists:**
   ```sql
   SELECT qq.*, q.title as quiz_title
   FROM public.quiz_questions qq
   JOIN public.quizzes q ON qq.quiz_id = q.id
   WHERE qq.id = 'YOUR_QUESTION_ID';
   ```

4. **Test manual grade insertion:**
   ```sql
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

### Step 6: Check Course and Quiz Permissions

Verify you have the right permissions:

1. **Check if you're the instructor of the course:**
   ```sql
   SELECT c.*, p.full_name as instructor_name
   FROM public.courses c
   JOIN public.profiles p ON c.instructor_id = p.id
   WHERE c.instructor_id = 'YOUR_USER_ID';
   ```

2. **Check if the quiz belongs to your course:**
   ```sql
   SELECT q.*, c.title as course_title, p.full_name as instructor_name
   FROM public.quizzes q
   JOIN public.courses c ON q.course_id = c.id
   JOIN public.profiles p ON c.instructor_id = p.id
   WHERE q.id = 'YOUR_QUIZ_ID';
   ```

### Step 7: Enhanced Debugging Features

The system now includes:

1. **Role Verification:** Checks if user has faculty role before allowing grading
2. **Detailed Error Logging:** Shows specific error details for database operations
3. **User Authentication Logging:** Shows current user information
4. **Test Function:** Allows manual testing of grade insertion
5. **Enhanced RLS Policies:** Separate policies for different operations

### Step 8: Quick Fixes to Try

1. **Refresh the page** and try again
2. **Log out and log back in** to refresh authentication
3. **Check your user role** in the database
4. **Run the RLS policy fix script**
5. **Try a different browser** to rule out browser-specific issues
6. **Check if the issue affects all quizzes** or just specific ones

### Step 9: Contact Support

If the issue persists, provide:

1. **Browser console logs** (copy all error messages)
2. **Database query results** (from the diagnostic scripts)
3. **Your user ID and role** (from the database)
4. **Quiz ID and Attempt ID** that's having issues
5. **Steps to reproduce** the issue

### Expected Behavior After Fix

- ✅ Faculty can enter grades for essay and short answer questions
- ✅ Grades are properly saved to the database
- ✅ Role verification prevents unauthorized access
- ✅ Clear error messages help identify issues
- ✅ RLS policies allow proper access control
- ✅ Test function helps debug insertion issues

### Database Schema Requirements

Make sure your database has:

1. **quiz_question_grades table** with proper structure
2. **RLS policies** that allow faculty to insert/update grades
3. **profiles table** with role field set to 'faculty'
4. **Proper foreign key relationships** between tables

### RLS Policy Requirements

The system needs these policies:
- Faculty can SELECT grades for their quizzes
- Faculty can INSERT grades for their quizzes  
- Faculty can UPDATE grades for their quizzes
- Students can SELECT their own grades


































