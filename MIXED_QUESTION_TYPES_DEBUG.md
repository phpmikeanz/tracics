# Mixed Question Types Debug Guide

## Issue: "No Questions Available" with Mixed Question Types

When creating quizzes with multiple question types (multiple choice, true/false, essay, short answer), students see "No Questions Available" instead of the questions.

### What I Fixed

1. **Fixed `correct_answer` handling**: For essay and short answer questions, `correct_answer` should be `null` instead of empty string
2. **Added debugging logs**: Enhanced logging in question creation and loading functions
3. **Improved error handling**: Better error messages for question creation failures

### Step 1: Check Current Quiz Questions

Run this SQL query to see the current state of your quiz questions:

```sql
-- Run: scripts/check_mixed_question_types.sql
```

This will show:
- Quiz question counts by type
- Questions with NULL or invalid correct_answer
- RLS policy status
- Current quiz attempts

### Step 2: Test Question Creation

1. **Open your application** and go to quiz management
2. **Create a new quiz** with mixed question types:
   - 1 Multiple Choice question
   - 1 True/False question  
   - 1 Essay question
   - 1 Short Answer question
3. **Check browser console** (F12) for logging messages
4. **Look for these success messages:**
   - `"Adding question:"` (shows the question data being sent)
   - `"Successfully added quiz questions:"` (confirms database insertion)

### Step 3: Verify Question Data

After creating questions, run this query to verify they were created correctly:

```sql
-- Check specific quiz questions (replace with your quiz ID)
SELECT 
  qq.id as question_id,
  qq.quiz_id,
  qq.question,
  qq.type,
  qq.points,
  qq.correct_answer,
  qq.options,
  qq.order_index,
  qq.created_at
FROM public.quiz_questions qq
WHERE qq.quiz_id = 'YOUR_QUIZ_ID'
ORDER BY qq.order_index;
```

**Expected Results:**
- Multiple Choice: `correct_answer` should have the selected option
- True/False: `correct_answer` should be "true" or "false"
- Essay: `correct_answer` should be `null`
- Short Answer: `correct_answer` should be `null`

### Step 4: Test Student Access

1. **Have a student take the quiz**
2. **Check browser console** for these messages:
   - `"Fetching questions for quiz:"`
   - `"Quiz questions fetched successfully:"`
   - `"Number of questions found:"`

### Step 5: Common Issues and Solutions

#### Issue 1: Questions Not Created
**Symptoms:** Console shows "Error adding quiz questions"
**Solution:**
- Check RLS policies on quiz_questions table
- Verify user has faculty role
- Check database connection

#### Issue 2: Questions Created But Not Loading
**Symptoms:** Questions exist in database but student sees "No Questions Available"
**Solution:**
- Check enrollment status
- Verify RLS policies allow student access
- Check quiz status (should be 'published')

#### Issue 3: Mixed Question Types Not Working
**Symptoms:** Single question types work, but mixed types don't
**Solution:**
- The fix I implemented should resolve this
- Ensure `correct_answer` is `null` for essay/short answer
- Check that all questions have valid `order_index`

#### Issue 4: RLS Policy Issues
**Symptoms:** "Cannot access quiz" or "Quiz not found" errors
**Solution:**
- Check RLS policies on quiz_questions table
- Verify student enrollment in course
- Check quiz status and permissions

### Step 6: Debug Commands

If you need to debug further, use these commands in the browser console:

```javascript
// Check quiz questions for a specific quiz
import { getQuizQuestions } from './lib/quizzes'
getQuizQuestions('YOUR_QUIZ_ID').then(console.log)

// Test question creation
import { addQuizQuestions } from './lib/quizzes'
const testQuestion = {
  quiz_id: 'YOUR_QUIZ_ID',
  question: 'Test question?',
  type: 'multiple_choice',
  options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
  correct_answer: 'Option 1',
  points: 5,
  order_index: 0
}
addQuizQuestions([testQuestion]).then(console.log)
```

### Step 7: Verify the Fix

After applying the fix, you should see:

1. **In Question Creation:**
   - Console shows "Adding question:" with correct data
   - Success message: "Successfully added quiz questions:"
   - Questions appear in the quiz management interface

2. **In Student Interface:**
   - Questions load correctly for mixed question types
   - All question types display properly
   - No "No Questions Available" error

3. **In Database:**
   - Questions created with correct `correct_answer` values
   - Essay/short answer questions have `correct_answer: null`
   - Multiple choice/true-false have proper `correct_answer` values

### Key Changes Made

1. **Fixed `handleAddQuestion`**: Now sets `correct_answer` to `null` for essay/short answer questions
2. **Enhanced Logging**: Added detailed logging to track question creation and loading
3. **Improved Error Handling**: Better error messages for debugging

### Expected Behavior After Fix

- ✅ Mixed question types can be created successfully
- ✅ All question types display correctly in student interface
- ✅ No "No Questions Available" error for mixed quizzes
- ✅ Proper `correct_answer` handling for each question type
- ✅ Questions load and display correctly for students

The main issue was that essay and short answer questions were being created with empty string `correct_answer` instead of `null`, which could cause issues with the question loading logic. The fix ensures proper handling of the `correct_answer` field for each question type.


































