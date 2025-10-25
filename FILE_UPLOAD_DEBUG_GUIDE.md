# File Upload Debug Guide

## Your Storage Setup is Correct! ✅

From the SQL results, I can see:
- ✅ `course-materials` bucket exists
- ✅ Bucket is public
- ✅ 100MB file size limit
- ✅ MIME types configured
- ✅ Storage policies exist

## The Issue is Likely in the Application Code

Since your storage is set up correctly, let's debug the application:

### Step 1: Test File Upload in Faculty Portal

1. **Go to Faculty Portal** → Course Management
2. **Select a course** → Course Materials tab
3. **Try to add a new material** with a file
4. **Open Browser Developer Tools** (F12) → Console tab
5. **Look for error messages** in the console

### Step 2: Common Error Messages and Solutions

#### Error: "Storage bucket not found"
- **Solution**: This shouldn't happen since your bucket exists
- **Check**: Make sure you're using the correct bucket name

#### Error: "Permission denied" or "RLS policy violation"
- **Solution**: The file path structure might not match your policies
- **Check**: Look at the file path being used in the console logs

#### Error: "File too large"
- **Solution**: Try uploading a smaller file (under 100MB)
- **Check**: Your file size limit is set to 100MB

#### Error: "Invalid MIME type"
- **Solution**: Try uploading a different file type
- **Check**: Your bucket supports: PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, PNG, MP4, ZIP, etc.

### Step 3: Check Console Logs

When you try to upload a file, look for these log messages in the browser console:

```
Starting file upload: {fileName: "...", fileSize: ..., fileType: "..."}
File path: courseId/filename.ext
Storage bucket found: {...}
User authenticated: user-id-here
Uploading file to storage...
File uploaded successfully: {...}
```

### Step 4: Test with Different File Types

Try uploading these file types one by one:
1. **Small text file** (.txt) - Should work
2. **PDF file** (.pdf) - Should work  
3. **Image file** (.jpg, .png) - Should work
4. **Document file** (.docx) - Should work

### Step 5: Check File Path Structure

In the console logs, look for the file path being used. It should look like:
- `courseId/filename.ext` (simple structure)
- Or `courseId/userId/filename.ext` (if using user ID)

### Step 6: Manual Test (Advanced)

If you want to test the upload manually, you can run this in your browser console:

```javascript
// Test file upload manually
async function testUpload() {
  const supabase = window.supabase;
  
  // Create a test file
  const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
  
  // Try to upload
  const { data, error } = await supabase.storage
    .from('course-materials')
    .upload('test-course/test-file.txt', testFile);
  
  if (error) {
    console.error('Upload failed:', error);
  } else {
    console.log('Upload successful:', data);
  }
}

testUpload();
```

## What to Do Next

1. **Try uploading a file** in your faculty portal
2. **Check the browser console** for error messages
3. **Share the error message** with me so I can help you fix it

## Most Likely Issues

Based on your setup, the issue is probably:
1. **File path structure** - The path format doesn't match your policies
2. **Authentication** - User not properly authenticated as instructor
3. **File type** - File type not in allowed MIME types
4. **Application code** - Bug in the upload function

**Try the upload and let me know what error message you see in the browser console!**





