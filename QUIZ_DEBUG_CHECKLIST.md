# Quiz Auto-Submission Debugging Checklist

## Issue: Answers showing as "Not answered" and 0 score during auto-submission

### Step 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Take a quiz and let timer expire
4. Look for these log messages:
   - `🎯 handleAnswerChange called:` - Should show when you click radio buttons
   - `✅ Ref updated immediately with:` - Should show answers being saved
   - `💾 Answers from database:` - Should show answers read from DB
   - `📤 FINAL SUBMISSION - Submitting quiz with answers:` - Should show answer count > 0

### Step 2: Check Database Directly
Run this SQL query in your Supabase SQL Editor:

```sql
-- Check the latest quiz attempt
SELECT 
  id,
  quiz_id,
  student_id,
  answers,
  jsonb_object_keys(answers) as answer_keys,
  score,
  status,
  started_at,
  completed_at
FROM quiz_attempts
ORDER BY created_at DESC
LIMIT 5;
```

**What to look for:**
- `answers` should be a JSON object like `{"question-id-1": "answer1", "question-id-2": "answer2"}`
- If `answers` is `{}` or `null`, answers aren't being saved
- Check if `completed_at` is set (means submission happened)

### Step 3: Check if Answers are Being Saved When Clicked
1. Click a radio button
2. Check console for: `✅ Answer auto-saved for question:`
3. Wait 2 seconds
4. Run this SQL to verify:

```sql
-- Check if answer was saved (replace ATTEMPT_ID with actual ID)
SELECT answers
FROM quiz_attempts
WHERE id = 'ATTEMPT_ID';
```

### Step 4: Check Answer Format
Answers should be stored as:
```json
{
  "question-uuid-1": "option-value",
  "question-uuid-2": "true",
  "question-uuid-3": "student text answer"
}
```

### Step 5: Common Issues to Check

#### Issue A: Answers not saving when clicked
**Symptoms:** Console shows `❌ Failed to auto-save answer`
**Check:**
- RLS policies on `quiz_attempts` table
- Network tab for 403/401 errors
- Supabase logs for errors

#### Issue B: Answers saved but empty on submission
**Symptoms:** Database has answers, but submission shows empty
**Check:**
- Are question IDs matching? (UUID format)
- Are answers being overwritten by empty object?

#### Issue C: Score calculation failing
**Symptoms:** Answers exist but score is 0
**Check:**
- Are `correct_answer` values matching student answers?
- Check for case sensitivity issues
- Check for whitespace issues

### Step 6: Test Function
Add this to browser console while on quiz page:

```javascript
// Test function to check current state
async function debugQuizAnswers() {
  const attemptId = window.currentQuizId || prompt('Enter attempt ID:');
  if (!attemptId) return;
  
  const response = await fetch(`/api/debug-quiz?attemptId=${attemptId}`);
  const data = await response.json();
  console.log('Quiz Debug Info:', data);
}
```

### Step 7: Manual Verification
1. Start a quiz
2. Answer ONE question
3. Wait 5 seconds
4. Check database - answer should be there
5. Let timer expire
6. Check database again - answer should still be there
7. Check score - should be calculated

## Quick Fixes to Try

1. **Clear browser cache and reload**
2. **Check Supabase RLS policies** - Make sure students can UPDATE quiz_attempts
3. **Check network connection** - Auto-save might be failing silently
4. **Check browser console for errors** - Look for red error messages

## What to Report

If issue persists, provide:
1. Browser console logs (copy all logs from quiz start to submission)
2. Database query results (the SELECT query above)
3. Screenshot of the quiz review page showing "Not answered"
4. Browser and version
5. Any error messages from Supabase dashboard

