# 🔧 Profile Photo Upload Debug Steps

## 🚨 **Quick Diagnosis**

Let's systematically check why your profile photo upload isn't working.

## 📋 **Step 1: Check Database Setup**

### **1.1 Run the Setup Script**
First, make sure the database is properly configured:

```sql
-- Execute this in your Supabase SQL Editor
\i scripts/setup-profile-photos.sql
```

### **1.2 Verify Storage Bucket**
```sql
-- Check if avatars bucket exists
SELECT * FROM storage.buckets WHERE id = 'avatars';
```

**Expected Result:** Should return one row with `id = 'avatars'` and `public = true`

### **1.3 Check Storage Policies**
```sql
-- Check if storage policies exist
SELECT policyname FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%avatar%';
```

**Expected Result:** Should return 4 policies for avatars

## 🔍 **Step 2: Check Authentication**

### **2.1 Verify User is Logged In**
Open browser console (F12) and check:
```javascript
// Check if user is authenticated
console.log("User:", user);
console.log("User ID:", user?.id);
```

### **2.2 Check Supabase Connection**
```javascript
// Check Supabase client
console.log("Supabase client:", supabase);
```

## 🧪 **Step 3: Test Upload Manually**

### **3.1 Visit Test Page**
Go to: `http://localhost:3001/test-profile-photos`

### **3.2 Try Upload**
1. Click on any profile photo
2. Try uploading a small image file (< 1MB)
3. Check browser console for errors

### **3.3 Check Console Errors**
Look for these common errors:
- `"Bucket not found"`
- `"Permission denied"`
- `"User not authenticated"`
- `"File too large"`

## 🛠️ **Step 4: Manual Database Setup (If Needed)**

If the setup script didn't work, run these commands manually:

### **4.1 Create Storage Bucket**
```sql
-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
```

### **4.2 Create Storage Policies**
```sql
-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view all avatars
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

## 🔧 **Step 5: Check File Requirements**

### **5.1 File Type**
Make sure your image is one of these types:
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

### **5.2 File Size**
File must be less than 5MB

### **5.3 Test with Small File**
Try uploading a very small image (under 100KB) first

## 🚨 **Step 6: Common Issues & Solutions**

### **Issue 1: "Bucket not found"**
**Solution:** Run the database setup script

### **Issue 2: "Permission denied"**
**Solution:** Check RLS policies are created

### **Issue 3: "User not authenticated"**
**Solution:** Make sure you're logged in

### **Issue 4: "File too large"**
**Solution:** Compress your image or use a smaller file

### **Issue 5: "Invalid file type"**
**Solution:** Use a supported image format

## 🧪 **Step 7: Test with Simple Upload**

Create a simple test to isolate the issue:

```javascript
// Test in browser console
const testUpload = async () => {
  const supabase = createClient();
  
  // Test 1: Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  console.log("User:", user);
  
  // Test 2: Check if bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  console.log("Buckets:", buckets);
  
  // Test 3: Try to list files in avatars bucket
  const { data: files } = await supabase.storage.from('avatars').list();
  console.log("Files in avatars:", files);
};
```

## ✅ **Step 8: Success Indicators**

When everything is working, you should see:

- ✅ **No console errors** during upload
- ✅ **Success toast** message appears
- ✅ **Profile photo updates** immediately
- ✅ **Avatar shows your photo** instead of initials
- ✅ **File appears** in Supabase Storage dashboard

## 🆘 **Still Having Issues?**

### **Check These:**

1. **Browser Console** - Look for JavaScript errors
2. **Network Tab** - Check if upload requests are being made
3. **Supabase Dashboard** - Check Storage → avatars bucket
4. **Database** - Check profiles table for avatar_url

### **Try These:**

1. **Clear browser cache** and try again
2. **Try different browser** (Chrome, Firefox, etc.)
3. **Try smaller image file** (< 100KB)
4. **Check internet connection**

## 🎯 **Quick Fix Commands**

If you need to reset everything:

```sql
-- Drop and recreate bucket
DELETE FROM storage.buckets WHERE id = 'avatars';
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Recreate policies (run the setup script)
\i scripts/setup-profile-photos.sql
```

Let me know what errors you see in the console, and I'll help you fix the specific issue! 🚀
