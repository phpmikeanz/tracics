# 🔧 Profile Photo Troubleshooting Guide

## 🚨 **Issue: Avatar Only Shows Name/Initials**

If your avatar is only showing the name or initials instead of the actual photo, here's how to fix it:

## 🔍 **Step 1: Check Database Setup**

### **Run the Setup Script**
```sql
-- Execute in Supabase SQL editor
\i scripts/setup-profile-photos.sql
```

### **Verify Setup**
```sql
-- Check if everything is configured
\i scripts/check-profile-photos.sql
```

## 🧪 **Step 2: Test Photo Upload**

### **Visit Test Page**
Go to: `http://localhost:3000/test-photo`

### **Upload a Photo**
1. Click "Upload Photo" button
2. Select an image file from your device
3. Wait for upload to complete
4. Check if avatar shows your photo

## 🔍 **Step 3: Check Common Issues**

### **Issue 1: Storage Bucket Not Created**
```sql
-- Check if avatars bucket exists
SELECT * FROM storage.buckets WHERE id = 'avatars';
```

**Fix:** Run the setup script to create the bucket.

### **Issue 2: RLS Policies Missing**
```sql
-- Check storage policies
SELECT policyname FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%avatar%';
```

**Fix:** The setup script should create these policies.

### **Issue 3: User Not Authenticated**
```sql
-- Check current user
SELECT auth.uid();
```

**Fix:** Make sure you're logged in to your app.

### **Issue 4: File Upload Failed**
Check browser console for errors like:
- "Bucket not found"
- "Permission denied"
- "File too large"

**Fix:** Check file size (max 5MB) and file type (images only).

## 🛠️ **Step 4: Manual Setup (If Needed)**

### **Create Storage Bucket Manually**
```sql
-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
```

### **Create Storage Policies Manually**
```sql
-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow anyone to view avatars
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Allow users to update their own avatars
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## 🧪 **Step 5: Test Upload Manually**

### **Test File Upload**
```sql
-- This is just to test - don't run this directly
-- The component will handle the actual upload
```

### **Check Uploaded Files**
```sql
-- Check if files are uploaded
SELECT name, size, created_at 
FROM storage.objects 
WHERE bucket_id = 'avatars'
ORDER BY created_at DESC;
```

### **Check Profile Avatar URL**
```sql
-- Check if avatar_url is set
SELECT id, full_name, avatar_url 
FROM profiles 
WHERE id = auth.uid();
```

## 🔧 **Step 6: Fix Component Issues**

### **Check Avatar Display**
The avatar should show:
- **With Photo**: Your uploaded image
- **Without Photo**: Initials or default avatar

### **Check Loading States**
- Upload button should show "Uploading..." during upload
- Avatar should show loading overlay during upload

### **Check Error Messages**
- File type errors
- File size errors
- Upload errors

## 🎯 **Step 7: Verify Integration**

### **Check Navigation**
After uploading a photo, your navigation should show:
- Your actual photo instead of initials
- Clickable avatar that opens upload dialog

### **Check Profile Settings**
- Photo should appear in profile settings
- Upload/delete buttons should work

## 🚨 **Common Error Messages**

### **"Bucket not found"**
- **Cause:** Storage bucket not created
- **Fix:** Run setup script

### **"Permission denied"**
- **Cause:** RLS policies not set up
- **Fix:** Run setup script

### **"File too large"**
- **Cause:** File exceeds 5MB limit
- **Fix:** Compress image or use smaller file

### **"Invalid file type"**
- **Cause:** File is not an image
- **Fix:** Use JPEG, PNG, GIF, or WebP

### **"User not authenticated"**
- **Cause:** User not logged in
- **Fix:** Make sure user is authenticated

## ✅ **Success Indicators**

When everything is working correctly, you should see:

- ✅ **Avatar shows your photo** instead of initials
- ✅ **Clicking avatar opens upload dialog**
- ✅ **Upload button works** and shows progress
- ✅ **Photo updates immediately** after upload
- ✅ **No error messages** in console
- ✅ **Navigation shows your photo**

## 🆘 **Still Having Issues?**

### **Check Browser Console**
Look for JavaScript errors that might indicate:
- Network issues
- Authentication problems
- File upload failures

### **Check Supabase Dashboard**
1. Go to Storage → avatars bucket
2. Check if files are uploaded
3. Check if policies are set up

### **Check Database**
1. Go to Table Editor → profiles
2. Check if avatar_url is set
3. Verify the URL is accessible

### **Test with Simple Upload**
Use the test page at `/test-photo` to isolate the issue.

## 🎉 **Once Fixed**

Your avatar should now:
- Show your actual photo
- Be clickable for updates
- Work in navigation
- Update in real-time

The system will automatically handle fallbacks when no photo is set!
