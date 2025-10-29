# Automatic Finalization Troubleshooting Guide

## Issue: Quiz Still Shows "Pending" Even After Manual Grading

If you've manually graded essay and short answer questions but the quiz is still showing as "Pending Grading" instead of "Graded", follow this guide.

### Step 1: Check Current Status

Run this SQL query to see the current state of your quiz attempts:

```sql
-- Run: scripts/debug_auto_finalization.sql
```

This will show:
- Quiz attempt status and scores
- Manual grades count and total points
- Which attempts should be graded but aren't
- Recent manual grades

### Step 2: Identify the Problem

Look for these patterns in the results:

1. **Attempts with manual grades but status = 'completed'**
   - These should be automatically finalized
   - If they exist, the automatic finalization failed

2. **Manual grades exist but attempt score = 0**
   - The score calculation might be failing
   - Check if grades are properly linked to questions

3. **No manual grades found**
   - The grading process might not be working
   - Check if grades are being inserted correctly

### Step 3: Manual Fix for Existing Attempts

If you have attempts that should be graded but aren't, run this function from the browser console:

```javascript
// Fix pending attempts that have manual grades
import { fixPendingAttempts } from './lib/quizzes'
fixPendingAttempts().then(result => {
  console.log(`Updated ${result.updated} attempts`)
  console.log('Errors:', result.errors)
})
```

### Step 4: Test Automatic Finalization

1. **Open your application** and go to manual grading
2. **Grade a question** and check browser console (F12)
3. **Look for these messages:**
   - `"Grade inserted successfully:"`
   - `"Automatically calculating total score for attempt:"`
   - `"Calculated total score:"`
   - `"Quiz attempt score updated successfully:"`

### Step 5: Common Issues and Solutions

#### Issue 1: Automatic Finalization Not Triggered
**Symptoms:** Grades are saved but quiz status doesn't change
**Solution:**
- Check browser console for errors
- Verify the `gradeQuestion` function is being called
- Check if `calculateTotalScoreFromDB` is working

#### Issue 2: Score Calculation Fails
**Symptoms:** Console shows "Error calculating total score"
**Solution:**
- Check if manual grades exist in database
- Verify question types are correct
- Check if attempt has answers

#### Issue 3: Database Update Fails
**Symptoms:** Console shows "Error updating quiz attempt score"
**Solution:**
- Check RLS policies on quiz_attempts table
- Verify you have permission to update attempts
- Check if attempt ID is valid

#### Issue 4: Grades Not Being Inserted
**Symptoms:** No grades found in database
**Solution:**
- Check RLS policies on quiz_question_grades table
- Verify you have faculty role
- Check if question ID is valid

### Step 6: Debug Commands

Use these commands in the browser console to debug:

```javascript
// Check specific attempt details
import { calculateTotalScoreFromDB } from './lib/quizzes'
calculateTotalScoreFromDB('YOUR_ATTEMPT_ID').then(console.log)

// Check manual grades for an attempt
import { getQuestionGrades } from './lib/quizzes'
getQuestionGrades('YOUR_ATTEMPT_ID').then(console.log)

// Test grade insertion
import { testGradeInsertion } from './lib/quizzes'
testGradeInsertion('YOUR_ATTEMPT_ID', 'YOUR_QUESTION_ID').then(console.log)

// Fix pending attempts
import { fixPendingAttempts } from './lib/quizzes'
fixPendingAttempts().then(console.log)
```

### Step 7: Manual Database Fix

If the automatic functions don't work, you can manually fix the database:

```sql
-- 1. Find attempts that need fixing
SELECT 
  qa.id as attempt_id,
  qa.status,
  qa.score,
  COUNT(qqg.id) as manual_grades_count,
  SUM(qqg.points_awarded) as total_manual_points
FROM public.quiz_attempts qa
LEFT JOIN public.quiz_question_grades qqg ON qa.id = qqg.attempt_id
WHERE qa.status = 'completed'
GROUP BY qa.id, qa.status, qa.score
HAVING COUNT(qqg.id) > 0;

-- 2. Calculate and update scores manually
-- Replace 'YOUR_ATTEMPT_ID' with actual attempt ID
UPDATE public.quiz_attempts 
SET 
  score = (
    -- Auto-graded points
    (SELECT COALESCE(SUM(qq.points), 0)
     FROM public.quiz_questions qq
     JOIN public.quiz_attempts qa ON qq.quiz_id = qa.quiz_id
     WHERE qa.id = 'YOUR_ATTEMPT_ID'
       AND qq.type IN ('multiple_choice', 'true_false')
       AND qa.answers->>qq.id::text = qq.correct_answer
    ) +
    -- Manual graded points
    (SELECT COALESCE(SUM(qqg.points_awarded), 0)
     FROM public.quiz_question_grades qqg
     WHERE qqg.attempt_id = 'YOUR_ATTEMPT_ID'
    )
  ),
  status = 'graded'
WHERE id = 'YOUR_ATTEMPT_ID';
```

### Step 8: Verify the Fix

After applying any fix, run this to verify:

```sql
-- Check the updated attempt
SELECT 
  qa.id as attempt_id,
  qa.status,
  qa.score,
  q.title as quiz_title
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
WHERE qa.id = 'YOUR_ATTEMPT_ID';
```

### Step 9: Test the Complete Flow

1. **Create a new quiz** with mixed question types
2. **Have a student take the quiz**
3. **As faculty, grade the questions**
4. **Verify automatic finalization works**
5. **Check that student can see results immediately**

### Expected Behavior After Fix

- ✅ Manual grades are inserted successfully
- ✅ Total score is calculated automatically
- ✅ Quiz status changes to "graded" immediately
- ✅ Student can see results without manual finalization
- ✅ No more "Pending Grading" status

### Key Points

1. **Automatic finalization happens when grading individual questions**
2. **The system calculates total score (auto-graded + manual grades)**
3. **Quiz status updates from "completed" to "graded"**
4. **Students can see results immediately**

If you're still having issues, run the debug script and share the results so I can help identify the specific problem!




























