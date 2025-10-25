# 🧪 Notification System Testing Guide

## ✅ **Fixed the Setup Error**

The error you encountered was caused by trying to insert a sample notification with `auth.uid()` which returns `null` when there's no authenticated user. I've fixed this by removing the problematic sample data insertion.

## 🚀 **Step-by-Step Testing**

### **1. Run the Setup Script (Fixed)**
```sql
-- Execute in Supabase SQL editor
\i scripts/setup-notification-system.sql
```

### **2. Verify the Setup**
```sql
-- Check if everything is set up correctly
\i scripts/verify-setup.sql
```

### **3. Install the Triggers**
```sql
-- Install automatic notification triggers
\i lib/notification-triggers.sql
```

### **4. Test with Real Data**

#### **A. Create a Test Notification (Manual)**
```sql
-- Replace 'your-user-id-here' with a real user ID from your profiles table
INSERT INTO notifications (
    user_id, 
    title, 
    message, 
    type, 
    read
) VALUES (
    'your-user-id-here'::UUID,
    'Welcome to the LMS!',
    'You have successfully logged in to the Learning Management System.',
    'announcement',
    FALSE
);
```

#### **B. Test Assignment Submission Notifications**
```sql
-- 1. Create a test assignment submission
INSERT INTO assignment_submissions (
    assignment_id,
    student_id,
    content,
    status
) VALUES (
    'your-assignment-id'::UUID,
    'your-student-id'::UUID,
    'Test submission content',
    'draft'
);

-- 2. Update status to 'submitted' to trigger notification
UPDATE assignment_submissions 
SET status = 'submitted' 
WHERE id = 'your-submission-id';

-- 3. Update status to 'graded' to trigger grade notification
UPDATE assignment_submissions 
SET status = 'graded', grade = 85 
WHERE id = 'your-submission-id';
```

#### **C. Test Quiz Completion Notifications**
```sql
-- 1. Create a test quiz attempt
INSERT INTO quiz_attempts (
    quiz_id,
    student_id,
    answers,
    status
) VALUES (
    'your-quiz-id'::UUID,
    'your-student-id'::UUID,
    '{"answer1": "A", "answer2": "B"}'::jsonb,
    'in_progress'
);

-- 2. Update status to 'completed' to trigger notification
UPDATE quiz_attempts 
SET status = 'completed', score = 85 
WHERE id = 'your-attempt-id';
```

#### **D. Test Enrollment Notifications**
```sql
-- 1. Create enrollment request
INSERT INTO enrollments (
    student_id,
    course_id,
    status
) VALUES (
    'your-student-id'::UUID,
    'your-course-id'::UUID,
    'pending'
);

-- 2. Update status to 'approved' to trigger notification
UPDATE enrollments 
SET status = 'approved' 
WHERE id = 'your-enrollment-id';
```

## 🔍 **What to Expect**

### **After Assignment Submission:**
- **Faculty gets**: "📚 New Assignment Submission" notification
- **Student gets**: "🎉 Assignment Graded!" notification (when graded)

### **After Quiz Completion:**
- **Faculty gets**: "📊 Quiz Completed" notification
- **Student gets**: "🎯 Quiz Completed!" notification

### **After Enrollment Request:**
- **Faculty gets**: "👥 New Enrollment Request" notification
- **Student gets**: "📝 Enrollment Requested" notification
- **After approval**: "🎉 Enrollment Approved!" notification

## 📊 **Check Results**

### **View All Notifications:**
```sql
SELECT 
    n.id,
    n.title,
    n.message,
    n.type,
    n.read,
    n.created_at,
    c.title as course_title,
    a.title as assignment_title,
    q.title as quiz_title
FROM notifications n
LEFT JOIN courses c ON n.course_id = c.id
LEFT JOIN assignments a ON n.assignment_id = a.id
LEFT JOIN quizzes q ON n.quiz_id = q.id
ORDER BY n.created_at DESC;
```

### **Check Notification Count:**
```sql
SELECT get_notification_count('your-user-id-here'::UUID);
```

### **View Notification Statistics:**
```sql
SELECT * FROM notification_stats;
```

## 🛠️ **Troubleshooting**

### **If Notifications Don't Appear:**
1. **Check if triggers are installed**: Run `\i lib/notification-triggers.sql`
2. **Check if RLS is working**: Make sure you're authenticated
3. **Check if foreign keys exist**: Verify your assignment/quiz/student IDs are valid

### **If You Get Permission Errors:**
1. **Check RLS policies**: Make sure they're properly set up
2. **Check user authentication**: Make sure you're logged in
3. **Check foreign key constraints**: Verify all referenced IDs exist

### **If Triggers Don't Fire:**
1. **Check trigger functions**: Make sure they're created
2. **Check trigger conditions**: Verify the WHEN conditions are correct
3. **Check data types**: Make sure status values match the CHECK constraints

## 🎯 **Manual Testing Functions**

### **Send Course Announcement:**
```sql
SELECT send_course_announcement(
    'your-course-id'::UUID,
    'Important Update',
    'Please review the updated syllabus.',
    'your-faculty-id'::UUID
);
```

### **Send Assignment Reminders:**
```sql
SELECT send_assignment_reminders();
```

### **Create Custom Notification:**
```sql
SELECT create_notification(
    'your-user-id'::UUID,
    'Custom Title',
    'Custom Message',
    'assignment',
    'your-course-id'::UUID,
    'your-assignment-id'::UUID,
    NULL,
    NULL,
    NULL,
    NULL
);
```

## ✅ **Success Indicators**

- ✅ **No errors** when running setup scripts
- ✅ **Notifications appear** when testing triggers
- ✅ **RLS policies** allow proper access
- ✅ **Functions work** without errors
- ✅ **Triggers fire** automatically
- ✅ **Real-time updates** in the UI

The notification system is now **properly set up** and ready for testing with your real data!
