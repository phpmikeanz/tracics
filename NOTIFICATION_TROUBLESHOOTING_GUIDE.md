# 🔔 Notification System Troubleshooting Guide

## 🚨 **Issue: Notifications Not Showing in Bell Icon**

If you're not seeing quiz notifications in the notification bell, follow this step-by-step troubleshooting guide.

## 🔍 **Step 1: Check the Debug Component**

I've added a debug component to your notification center. Here's how to use it:

1. **Open your LMS application**
2. **Click the notification bell icon** (🔔) in the top navigation
3. **Scroll down** to see the "Notification Debug Tools" section
4. **Click "Run Full Debug"** to check the current state
5. **Click "Create Quiz Notification"** to test if notifications can be created
6. **Check the browser console** (F12 → Console) for detailed logs

## 🔧 **Step 2: Verify Database Connection**

The debug component will check:
- ✅ Database connection
- ✅ Current notification count
- ✅ User authentication
- ✅ Notification creation
- ✅ Notification retrieval

## 🐛 **Step 3: Common Issues and Solutions**

### **Issue 1: No Notifications in Database**
**Symptoms:** Debug shows 0 notifications
**Solution:**
1. Check if you have any quizzes published
2. Check if students are enrolled in courses
3. Try creating a test notification using the debug component

### **Issue 2: Notifications Created But Not Displayed**
**Symptoms:** Debug shows notifications in database but bell shows empty
**Solution:**
1. Check browser console for JavaScript errors
2. Verify the notification center is using the correct hook
3. Check if there are RLS (Row Level Security) issues

### **Issue 3: Notifications Not Being Created**
**Symptoms:** Quiz/assignment actions don't trigger notifications
**Solution:**
1. Check if the notification functions are being called
2. Verify the database triggers are working
3. Check for errors in the browser console

## 🧪 **Step 4: Manual Testing**

### **Test Quiz Notifications:**
1. **As Faculty:**
   - Create a new quiz
   - Publish the quiz
   - Check if students receive notifications

2. **As Student:**
   - Take a quiz
   - Check if faculty receives completion notification

### **Test Assignment Notifications:**
1. **As Faculty:**
   - Create a new assignment
   - Check if students receive notifications

2. **As Student:**
   - Submit an assignment
   - Check if faculty receives submission notification

## 🔍 **Step 5: Check Browser Console**

Open browser console (F12) and look for:
- ✅ `📊 Loaded X notifications (Y unread)` - Shows notifications are loading
- ❌ `Error loading notifications:` - Indicates a problem
- ❌ `Error creating notification:` - Indicates creation failure

## 🛠️ **Step 6: Database Verification**

If the debug component shows issues, check your Supabase database:

1. **Go to your Supabase dashboard**
2. **Navigate to Table Editor → notifications**
3. **Check if there are any notifications for your user ID**
4. **Verify the notifications table structure**

## 📋 **Step 7: Check Notification Types**

The system supports these notification types:
- `quiz` - Quiz-related notifications
- `assignment` - Assignment-related notifications  
- `grade` - Grading notifications
- `announcement` - General announcements
- `enrollment` - Enrollment notifications

## 🚀 **Step 8: Force Refresh**

If notifications still don't appear:
1. **Hard refresh** the browser (Ctrl+F5)
2. **Clear browser cache**
3. **Check if you're logged in as the correct user**
4. **Try logging out and back in**

## 📞 **Step 9: Get Help**

If the issue persists:
1. **Run the debug component** and copy the results
2. **Check browser console** for any error messages
3. **Verify your Supabase connection** is working
4. **Check if other parts of the app** are working (quizzes, assignments)

## 🎯 **Expected Behavior**

### **For Students:**
- ✅ See notification when new quiz is published
- ✅ See notification when new assignment is created
- ✅ See notification when quiz/assignment is graded

### **For Faculty:**
- ✅ See notification when student completes quiz
- ✅ See notification when student submits assignment
- ✅ See notification when student submits late

## 🔧 **Quick Fixes**

### **Fix 1: Restart the Application**
```bash
# Stop the dev server (Ctrl+C)
# Then restart
npm run dev
```

### **Fix 2: Clear Browser Data**
- Clear cookies and local storage
- Hard refresh (Ctrl+F5)

### **Fix 3: Check Environment Variables**
- Verify Supabase URL and key are correct
- Check if database is accessible

## 📊 **Debug Output Example**

When working correctly, you should see:
```
🔍 Starting notification debug...
📊 Current notifications: [array of notifications]
📊 Unread count: 3
🗄️ Database notifications: [array from database]
✅ Test notification created: {id: "...", title: "..."}
📊 Updated notifications: [updated array]
📊 Updated unread count: 4
```

## 🎉 **Success Indicators**

You'll know the system is working when:
- ✅ Debug component shows notifications in database
- ✅ Test notifications can be created successfully
- ✅ Notification bell shows the correct count
- ✅ Notifications appear in the bell dropdown
- ✅ Notifications can be marked as read/deleted

---

**Remember:** The debug component is your best friend for troubleshooting! Use it to identify exactly where the issue is occurring.
