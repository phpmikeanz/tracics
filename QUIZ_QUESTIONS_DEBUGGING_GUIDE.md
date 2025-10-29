# Quiz Questions Debugging Guide

## The Problem
Quiz questions are being shuffled but not all questions are showing to students.

## Step-by-Step Debugging Process

### Step 1: Run the Aggressive Database Fix
Execute `AGGRESSIVE_QUIZ_QUESTIONS_FIX.sql` in Supabase SQL Editor. This will:
- Temporarily disable RLS to test if that's the issue
- Fix all data integrity problems
- Create super permissive RLS policies
- Provide comprehensive diagnostics

### Step 2: Check Browser Console
1. Open browser developer tools (F12)
2. Go to Console tab
3. Navigate to a quiz
4. Look for these specific log messages:

**Expected logs:**
```
Questions loaded: X questions for quiz: [quiz-id]
Raw questions from database: [array of questions]
Questions length: X
✅ Question validated: {id: ..., type: ..., question: ..., points: ..., order_index: ..., hasOptions: ...}
Quiz ready: X questions loaded and shuffled
```

**Problem indicators:**
- `❌ Error fetching quiz questions:` - Database/RLS issue
- `❌ RLS policy blocking access` - Permission issue
- `Questions length: 0` - No questions found
- `Filtered out invalid questions: X` - Questions being filtered out

### Step 3: Use the Debug Script
1. Copy the contents of `debug_quiz_questions_shuffle.js`
2. Paste in browser console while on a quiz page
3. Run the script
4. Check the detailed output

### Step 4: Check Database State
Run these queries in Supabase SQL Editor:

```sql
-- Check total questions
SELECT COUNT(*) as total_questions FROM public.quiz_questions;

-- Check questions for a specific quiz (replace QUIZ_ID)
SELECT 
  id, question, type, points, order_index, quiz_id
FROM public.quiz_questions 
WHERE quiz_id = 'QUIZ_ID'
ORDER BY order_index;

-- Check RLS policies
SELECT policyname, qual FROM pg_policies WHERE tablename = 'quiz_questions';
```

### Step 5: Test with Different Users
1. Test with a faculty account
2. Test with a student account
3. Compare the results

## Common Issues and Solutions

### Issue 1: RLS Policy Blocking Access
**Symptoms:** Console shows "RLS policy blocking access"
**Solution:** Run the aggressive fix SQL script

### Issue 2: Questions Being Filtered Out
**Symptoms:** Console shows "Filtered out invalid questions"
**Solution:** The ultra-lenient validation should fix this, but check console for specific reasons

### Issue 3: Database Connection Issues
**Symptoms:** Console shows "Error fetching quiz questions"
**Solution:** Check Supabase connection and permissions

### Issue 4: Questions Not in Database
**Symptoms:** "Questions length: 0"
**Solution:** Check if questions exist in database for the quiz

## Expected Behavior After Fix

1. **Console logs should show:**
   - All questions loaded from database
   - Questions validated (not filtered out)
   - Questions shuffled properly
   - All questions displayed

2. **Quiz should show:**
   - All questions in the quiz
   - Questions shuffled randomly
   - Navigation working properly
   - Question counter showing correct total

## If Issues Persist

1. **Check the specific error messages** in console
2. **Run the debug script** to get detailed analysis
3. **Verify database state** with the SQL queries
4. **Test with different user accounts**
5. **Check if the issue is specific to certain quizzes**

## Files Modified

- `components/quizzes/quiz-taking.tsx` - Ultra-lenient validation
- `lib/quizzes.ts` - Better error handling
- `AGGRESSIVE_QUIZ_QUESTIONS_FIX.sql` - Database fix
- `debug_quiz_questions_shuffle.js` - Debug script

## Next Steps

1. Run the aggressive database fix
2. Test the quiz functionality
3. Check console logs for any remaining issues
4. Use the debug script if problems persist
