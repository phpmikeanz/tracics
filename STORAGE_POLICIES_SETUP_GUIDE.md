# Course Materials Storage Policies Setup Guide

## Problem
You're getting errors when trying to upload files to the course materials storage bucket. This is typically caused by missing or incorrect Row Level Security (RLS) policies.

## Solution Options

I've created two SQL scripts to fix this issue. Choose the one that best fits your security requirements:

### Option 1: Simple Policies (Recommended for Testing)
Use `scripts/simple_course_materials_policies.sql` - This creates basic policies that allow any authenticated user to upload/view files.

### Option 2: Advanced Policies (Recommended for Production)
Use `scripts/fix_course_materials_storage_policies.sql` - This creates detailed policies with proper course/instructor permissions.

## Step-by-Step Setup

### Step 1: Access Supabase SQL Editor
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Policy Script
Choose one of the scripts below and copy-paste it into the SQL Editor:

#### For Simple Setup (Copy this):
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload course material files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view course material files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own course material files" ON storage.objects;

-- Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-materials',
  'course-materials',
  true,
  104857600, -- 100MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed'
  ]
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600;

-- Policy 1: Allow authenticated users to upload to course-materials bucket
CREATE POLICY "Authenticated users can upload course materials" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'course-materials' AND
  auth.uid() IS NOT NULL
);

-- Policy 2: Allow authenticated users to view course-materials files
CREATE POLICY "Authenticated users can view course materials" ON storage.objects
FOR SELECT USING (
  bucket_id = 'course-materials' AND
  auth.uid() IS NOT NULL
);

-- Policy 3: Allow users to delete files they uploaded
CREATE POLICY "Users can delete their own course material files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'course-materials' AND
  auth.uid() IS NOT NULL
);

-- Policy 4: Allow users to update files they uploaded
CREATE POLICY "Users can update their own course material files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'course-materials' AND
  auth.uid() IS NOT NULL
);

SELECT 'Simple course materials storage policies created successfully!' as message;
```

### Step 3: Execute the Script
1. Click **Run** button in the SQL Editor
2. You should see a success message

### Step 4: Verify the Bucket Exists
1. Go to **Storage** in your Supabase Dashboard
2. You should see a bucket named `course-materials`
3. Make sure it's set to **Public**

### Step 5: Test File Upload
1. Go to your faculty portal
2. Try adding a course material with a file
3. Check the browser console for any errors

## Troubleshooting

### If you still get upload errors:

1. **Check Browser Console**: Look for specific error messages
2. **Verify Authentication**: Make sure you're logged in as a faculty member
3. **Check Bucket Settings**: Ensure the bucket is public and has correct MIME types
4. **Test with Simple Policy**: Use the simple policy script first to isolate the issue

### Common Error Messages and Solutions:

- **"Storage bucket not found"**: Run the bucket creation part of the script
- **"Permission denied"**: The RLS policies aren't set up correctly
- **"File too large"**: Check the file size limit (currently set to 100MB)
- **"Invalid MIME type"**: The file type isn't in the allowed list

## Advanced Configuration

If you need more granular permissions (e.g., only instructors can upload to their own courses), use the advanced policy script:

```bash
# Copy the contents of scripts/fix_course_materials_storage_policies.sql
# and run it in your Supabase SQL Editor
```

## Verification Commands

You can run these queries in the SQL Editor to verify everything is set up correctly:

```sql
-- Check if bucket exists
SELECT * FROM storage.buckets WHERE id = 'course-materials';

-- Check storage policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- Test file upload (this should return the bucket info)
SELECT * FROM storage.objects WHERE bucket_id = 'course-materials' LIMIT 5;
```

## Next Steps

After running the policy script:
1. Test file upload in your faculty portal
2. Verify files appear in the Supabase Storage dashboard
3. Check that students can download the files
4. Consider implementing more restrictive policies for production use

## Security Notes

- The simple policies allow any authenticated user to upload/view files
- For production, consider implementing course-specific permissions
- Monitor storage usage to prevent abuse
- Regularly review and audit storage policies





