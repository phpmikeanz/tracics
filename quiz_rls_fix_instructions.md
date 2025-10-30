# Quiz Submission RLS Fix Instructions

## Problem
Students are getting a 403 Forbidden error when submitting quizzes:
```
new row violates row-level security policy for table "notifications"
```

## Root Cause
The RLS policies on the `notifications` table are blocking the creation of notifications when quiz attempts are submitted. The system tries to create notifications for both the student and faculty, but the current policies don't allow this.

## Solution
Apply the SQL fix from `FINAL_QUIZ_NOTIFICATION_COMPLETE_FIX.sql` to your Supabase database.

## Steps to Fix

### 1. Open Supabase Dashboard
- Go to your Supabase project dashboard
- Navigate to the SQL Editor

### 2. Run the Complete Fix
Copy and paste the entire contents of `FINAL_QUIZ_NOTIFICATION_COMPLETE_FIX.sql` into the SQL Editor and execute it.

### 3. What the Fix Does
- **Fixes RLS Policies**: Creates proper policies that allow system/triggers to insert notifications
- **Updates Notification Types**: Ensures all necessary notification types are allowed
- **Creates Secure Triggers**: Sets up quiz completion notification triggers with `SECURITY DEFINER`
- **Maintains Security**: Keeps proper user access controls while allowing system operations

### 4. Key Changes
1. **System Insert Policy**: `CREATE POLICY "notifications_insert_system" ON public.notifications FOR INSERT WITH CHECK (true);`
2. **Secure Trigger Function**: Uses `SECURITY DEFINER` to bypass RLS when creating notifications
3. **Updated Constraint**: Allows all necessary notification types including 'quiz'

### 5. Verification
After applying the fix, test by:
1. Having a student submit a quiz
2. Check that no RLS errors occur
3. Verify notifications are created for both student and faculty

## Expected Result
✅ Students can submit quizzes without RLS errors
✅ Notifications are created automatically for quiz completions
✅ Faculty receive notifications when students complete quizzes
✅ Students receive confirmation notifications

## Files Involved
- `FINAL_QUIZ_NOTIFICATION_COMPLETE_FIX.sql` - Complete SQL fix
- `lib/quizzes.ts` - Quiz submission logic
- `components/quizzes/quiz-taking.tsx` - Quiz taking interface
- Database triggers in `lib/notification-triggers.sql`

