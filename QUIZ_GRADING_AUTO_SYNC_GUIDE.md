# Quiz Grading Auto-Sync Implementation Guide

## 🎯 Overview

This solution automatically updates `quiz_attempts.score` and `quiz_attempts.status` whenever manual grades are inserted, updated, or deleted in the `quiz_question_grades` table.

## 📋 Database Schema

```sql
quiz_attempts (
  id uuid PRIMARY KEY,
  quiz_id uuid,
  student_id uuid,
  score numeric,
  status text,
  started_at timestamp,
  completed_at timestamp,
  created_at timestamp
);

quiz_question_grades (
  id uuid PRIMARY KEY,
  attempt_id uuid REFERENCES quiz_attempts(id),
  question_id uuid,
  points_awarded numeric,
  feedback text,
  graded_by uuid,
  graded_at timestamp,
  created_at timestamp
);
```

## 🚀 Implementation

### **Step 1: Run the Trigger Script**

Execute the trigger creation script in your Supabase SQL editor:

```sql
-- Run: scripts/simple_quiz_grading_trigger.sql
```

This creates:
- ✅ **Trigger function** that calculates total scores
- ✅ **INSERT trigger** - fires when new grades are added
- ✅ **UPDATE trigger** - fires when existing grades are modified  
- ✅ **DELETE trigger** - fires when grades are removed

### **Step 2: How It Works**

#### **Automatic Score Calculation:**
1. **Auto-graded questions** (multiple_choice, true_false):
   - Calculates points based on correct answers in `quiz_attempts.answers`
   - Compares student answers with `quiz_questions.correct_answer`

2. **Manual-graded questions** (essay, short_answer):
   - Sums all `points_awarded` from `quiz_question_grades` for the attempt

3. **Total Score**: `auto_score + manual_score`

#### **Automatic Status Update:**
- Sets `quiz_attempts.status = 'graded'` whenever manual grades exist
- Students can immediately see their results

### **Step 3: Testing the Implementation**

#### **Test 1: Insert a Manual Grade**
```sql
-- Replace with actual IDs from your system
INSERT INTO quiz_question_grades (
    attempt_id,
    question_id,
    points_awarded,
    feedback,
    graded_by
) VALUES (
    'your-attempt-id',
    'your-question-id',
    5,
    'Good work!',
    'your-user-id'
);
```

#### **Test 2: Verify the Update**
```sql
-- Check if the quiz attempt was updated
SELECT 
    id,
    score,
    status,
    completed_at
FROM quiz_attempts 
WHERE id = 'your-attempt-id';
```

#### **Test 3: Update a Grade**
```sql
-- Update the grade and verify score recalculates
UPDATE quiz_question_grades 
SET points_awarded = 8
WHERE attempt_id = 'your-attempt-id' 
AND question_id = 'your-question-id';
```

#### **Test 4: Delete a Grade**
```sql
-- Delete the grade and verify score updates
DELETE FROM quiz_question_grades 
WHERE attempt_id = 'your-attempt-id' 
AND question_id = 'your-question-id';
```

## 🔧 Advanced Features

### **Bulk Sync Existing Data**

If you have existing manual grades that need to be synced, run:

```sql
-- This will update all quiz attempts with manual grades
SELECT * FROM sync_all_quiz_attempts();
```

### **Monitoring and Debugging**

#### **Check Trigger Status:**
```sql
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'quiz_question_grades';
```

#### **View Recent Updates:**
```sql
-- Check which attempts have been updated recently
SELECT 
    qa.id,
    qa.score,
    qa.status,
    qa.completed_at,
    COUNT(qqg.id) as manual_grades_count,
    SUM(qqg.points_awarded) as total_manual_points
FROM quiz_attempts qa
LEFT JOIN quiz_question_grades qqg ON qa.id = qqg.attempt_id
WHERE qa.status = 'graded'
GROUP BY qa.id, qa.score, qa.status, qa.completed_at
ORDER BY qa.completed_at DESC
LIMIT 10;
```

## 🎯 Expected Behavior

### **Before Implementation:**
- ❌ Manual grades saved but quiz score not updated
- ❌ Students see "Pending Grading" even after grading
- ❌ Faculty must manually update scores

### **After Implementation:**
- ✅ **Automatic score calculation** when grades are added/updated/deleted
- ✅ **Immediate status update** to "graded" when manual grades exist
- ✅ **Students see results instantly** after faculty grades questions
- ✅ **No manual intervention required**

## 🔍 Troubleshooting

### **Issue: Triggers Not Firing**
```sql
-- Check if triggers exist
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table = 'quiz_question_grades';
```

### **Issue: Scores Not Updating**
```sql
-- Check if the trigger function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'update_quiz_attempt_score';
```

### **Issue: Permission Errors**
- Ensure the database user has TRIGGER permissions
- Check RLS policies allow the operations

## 📊 Performance Considerations

### **Optimization Tips:**
1. **Index on attempt_id** in quiz_question_grades for faster lookups
2. **Index on quiz_id** in quiz_questions for faster auto-score calculation
3. **Consider batching** if inserting many grades at once

### **Monitoring:**
```sql
-- Check trigger performance
SELECT 
    schemaname,
    tablename,
    n_tup_ins,
    n_tup_upd,
    n_tup_del
FROM pg_stat_user_tables 
WHERE tablename IN ('quiz_attempts', 'quiz_question_grades');
```

## 🎉 Benefits

1. **Automatic Synchronization**: No manual score updates needed
2. **Real-time Updates**: Students see results immediately
3. **Data Consistency**: Scores always match manual grades
4. **Reduced Errors**: Eliminates manual score calculation mistakes
5. **Better UX**: Faculty can focus on grading, not score management

## 🔄 Rollback Plan

If you need to disable the triggers:

```sql
-- Disable triggers
DROP TRIGGER IF EXISTS quiz_grading_sync_insert ON quiz_question_grades;
DROP TRIGGER IF EXISTS quiz_grading_sync_update ON quiz_question_grades;
DROP TRIGGER IF EXISTS quiz_grading_sync_delete ON quiz_question_grades;

-- Drop the function
DROP FUNCTION IF EXISTS update_quiz_attempt_score();
```

This solution provides a robust, automatic way to keep quiz scores synchronized with manual grades, ensuring students always see accurate, up-to-date results!












