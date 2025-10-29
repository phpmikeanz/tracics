# Manual Grading Troubleshooting Guide

## 🚨 "Nothing Happens" - Step-by-Step Debugging

If manual grading isn't working, follow this systematic approach to identify and fix the issue.

## 🔍 Step 1: Check Browser Console

1. **Open Developer Tools** (F12)
2. **Go to Console tab**
3. **Try to grade a question**
4. **Look for these specific messages:**

### ✅ Expected Messages:
```
🎯 GRADING QUESTION: {questionId, points, feedback}
📋 Attempt ID: [attempt-id]
💾 Saving grade: {gradeData}
✅ Grade saved successfully: [result]
📊 Calculated total score: [score]
✅ Quiz attempt updated: [result]
```

### ❌ Error Messages to Look For:
- `"Authentication required to grade questions"`
- `"Only faculty can grade questions"`
- `"Failed to save grade: [error details]"`
- `"Failed to update quiz score: [error details]"`
- RLS policy errors (403, permission denied)

## 🔍 Step 2: Run Database Diagnostic

Execute this script in your Supabase SQL editor:

```sql
-- Run: scripts/debug_manual_grading_step_by_step.sql
```

This will check:
- ✅ Table accessibility
- ✅ RLS policies
- ✅ User permissions
- ✅ Quiz attempts needing grading

## 🔍 Step 3: Common Issues and Solutions

### **Issue 1: "Authentication required to grade questions"**

**Symptoms:** Console shows authentication error
**Solution:**
1. Log out and log back in
2. Check if you're properly authenticated
3. Verify your session is valid

### **Issue 2: "Only faculty can grade questions"**

**Symptoms:** Console shows role permission error
**Solution:**
```sql
-- Check your user role
SELECT id, email, role FROM public.profiles 
WHERE email = 'your-email@example.com';

-- Update your role if needed
UPDATE public.profiles 
SET role = 'faculty' 
WHERE email = 'your-email@example.com';
```

### **Issue 3: "Failed to save grade" (RLS Policy Error)**

**Symptoms:** Console shows permission denied (403 error)
**Solution:**
```sql
-- Run the RLS policy fix
-- scripts/fix_manual_grading_comprehensive.sql
```

### **Issue 4: No Quiz Attempts to Grade**

**Symptoms:** Manual grading dialog shows "No Questions to Grade"
**Solution:**
1. Ensure you have quiz attempts with essay/short answer questions
2. Check if the quiz attempt status is "completed"
3. Verify the questions are of type "essay" or "short_answer"

### **Issue 5: Grades Save But Score Doesn't Update**

**Symptoms:** Grade appears in database but quiz score doesn't change
**Solution:**
1. Check if the trigger is working
2. Use the "Fix Manual Grades" button in Quiz Management
3. Run the comprehensive fix script

## 🔧 Quick Fixes to Try

### **Fix 1: Refresh and Retry**
1. **Refresh the page** (Ctrl+F5)
2. **Log out and log back in**
3. **Try grading again**

### **Fix 2: Check User Role**
```sql
-- Verify you have faculty role
SELECT role FROM public.profiles 
WHERE email = 'your-email@example.com';
```

### **Fix 3: Fix RLS Policies**
```sql
-- Run this to fix RLS policies
-- scripts/fix_manual_grading_comprehensive.sql
```

### **Fix 4: Test Manual Grade Insertion**
```sql
-- Test if you can insert a grade manually
INSERT INTO public.quiz_question_grades (
  attempt_id,
  question_id,
  points_awarded,
  feedback,
  graded_by
) VALUES (
  'your-attempt-id',
  'your-question-id',
  5,
  'Test feedback',
  'your-user-id'
);
```

## 🎯 Step-by-Step Testing Process

### **Test 1: Basic System Check**
1. **Open Quiz Management**
2. **Select a quiz** that has essay/short answer questions
3. **Look for attempts** with "Pending Grading" status
4. **Click "Grade"** on an attempt

### **Test 2: Grade Entry Test**
1. **Enter points** for a question (0 to max points)
2. **Add feedback** (optional)
3. **Click "Save Grade"**
4. **Check browser console** for success/error messages

### **Test 3: Database Verification**
1. **Check if grade was saved:**
   ```sql
   SELECT * FROM public.quiz_question_grades 
   WHERE attempt_id = 'your-attempt-id';
   ```

2. **Check if quiz attempt was updated:**
   ```sql
   SELECT id, score, status FROM public.quiz_attempts 
   WHERE id = 'your-attempt-id';
   ```

## 🚨 Emergency Fixes

### **If Nothing Works - Reset Everything:**

1. **Run the comprehensive fix script:**
   ```sql
   -- scripts/fix_manual_grading_comprehensive.sql
   ```

2. **Clear browser cache** (Ctrl+Shift+Delete)

3. **Log out and log back in**

4. **Try a different browser** (Chrome, Firefox, Edge)

### **If Database Issues Persist:**

1. **Check Supabase project status**
2. **Verify database connection**
3. **Check if RLS is enabled properly**
4. **Contact Supabase support if needed**

## 📞 Getting Help

If the issue persists, provide this information:

1. **Browser console logs** (copy all error messages)
2. **Results from the diagnostic script**
3. **Your user role and permissions**
4. **Specific steps that aren't working**
5. **Screenshots of any error messages**

## 🎉 Success Indicators

When manual grading is working correctly, you should see:

- ✅ **Grade entry form** appears when clicking "Grade"
- ✅ **Points and feedback** can be entered
- ✅ **"Save Grade" button** works without errors
- ✅ **Success message** appears after saving
- ✅ **Quiz score updates** automatically
- ✅ **Students can see results** immediately
- ✅ **No error messages** in browser console

The system should work smoothly with clear feedback at each step!












