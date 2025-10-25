# Role Detection Testing Instructions

## What Was Fixed

The authentication system was hardcoding all users as "student" role instead of fetching the actual role from the database. This has been fixed by:

1. **Updated Auth Context**: Modified `contexts/auth-context.tsx` to properly fetch user profiles from the database
2. **Enhanced Role Detection**: Added proper error handling and debugging for role fetching
3. **Visual Indicators**: Added role badges to dashboard headers to clearly show the user's role
4. **Debug Panel**: Added a debug panel in the top-right corner showing authentication status and user role

## Testing the Fix

### 1. Create Test Accounts

**Student Account:**
1. Go to the signup page
2. Fill in the form:
   - Full Name: Test Student
   - Email: student@test.com
   - Password: test123
   - **Role: Student** ← Important!
3. Create account

**Faculty Account:**
1. Go to the signup page
2. Fill in the form:
   - Full Name: Test Faculty
   - Email: faculty@test.com
   - Password: test123
   - **Role: Faculty** ← Important!
3. Create account

### 2. Verify Role Detection

After logging in with each account, you should see:

**Student Account:**
- Dashboard header shows "TTRAC Student Portal"
- Blue badge saying "Student Account"
- Student-specific navigation (Overview, Courses, Assignments, Quizzes)
- Debug panel shows Role: student (in blue)

**Faculty Account:**
- Dashboard header shows "TTRAC Faculty Portal"
- Green badge saying "Faculty Account"
- Faculty-specific navigation (Overview, Courses, Enrollment, Assignments, Quizzes)
- Debug panel shows Role: faculty (in green)

### 3. Debug Information

The debug panel in the top-right corner shows:
- User ID
- Email
- **Role** (this should match the account type)
- Authentication status
- Loading state

### 4. Console Debugging

Open browser developer tools and check the console for detailed auth logs:
- `[Auth] Fetching profile for user: [user-id]`
- `[Auth] Profile found with role: [student/faculty]`

## Database Schema

The fix relies on the `profiles` table having the correct structure:
- `id` (UUID, references auth.users)
- `email` (TEXT)
- `full_name` (TEXT)
- `role` (TEXT, CHECK constraint for 'student' or 'faculty')
- `avatar_url` (TEXT, optional)
- `created_at` and `updated_at` timestamps

## Troubleshooting

If roles are still not working:

1. **Check Console Logs**: Look for auth-related errors in the browser console
2. **Verify Database**: Ensure the `profiles` table exists and has the correct schema
3. **Check RLS Policies**: Ensure Row Level Security policies allow reading profiles
4. **Clear Browser Storage**: Clear localStorage and cookies, then try again
5. **Check Supabase Dashboard**: Verify user profiles are being created in the database

## Production Notes

- Remove the debug panel before deploying to production
- Consider adding admin tools for managing user roles
- Implement proper error handling for failed profile fetches
