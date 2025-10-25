# Course Materials File Upload Fix

## Issue Description
Faculty members were unable to add files when editing course materials in the faculty portal. The file upload would fail silently or with authentication errors.

## Root Cause
The issue was caused by a mismatch between the file path structure used in the upload function and what the Supabase RLS (Row Level Security) policies expected:

1. **RLS Policy Expected**: File paths in format `courseId/userId/fileName`
2. **Upload Function Used**: File paths in format `courseId/fileName` (missing userId)

The RLS policy on line 76 of `scripts/012_create_course_materials.sql`:
```sql
CREATE POLICY "Users can upload course material files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'course-materials' AND
  auth.uid()::text = (storage.foldername(name))[2]  -- Expects user ID in position 2
);
```

This policy expects the user ID to be in the second position of the folder path, but the upload function was only creating `courseId/fileName`.

## Solution Applied

### 1. Fixed File Path Structure in `lib/course-materials.ts`

**Updated `uploadCourseMaterialFile` function:**
- Added user authentication check at the beginning
- Modified file path creation to include user ID: `${courseId}/${user.id}/${fileName}`
- Removed duplicate authentication check

**Before:**
```typescript
const filePath = `${courseId}/${fileName}`
```

**After:**
```typescript
// Get current user ID for the file path
const { data: { user }, error: authError } = await supabase.auth.getUser()
if (authError || !user) {
  throw new Error('User not authenticated')
}

// Create a unique file path that matches RLS policy expectations
const filePath = `${courseId}/${user.id}/${fileName}`
```

### 2. Updated File Deletion Logic

**Updated `deleteCourseMaterialFile` function:**
- Changed parameter from `fileName` to `filePath` to accept full path
- Simplified deletion logic to use the full file path directly

**Updated `updateCourseMaterialWithFile` function:**
- Added logic to reconstruct old file path when deleting previous files
- Uses the same path structure: `${courseId}/${userId}/${materialId}.${fileExt}`

### 3. Created Setup Script

**Added `scripts/create-course-materials-bucket.js`:**
- Script to create the course-materials storage bucket if it doesn't exist
- Includes all necessary MIME types for course materials
- Can be run with: `node scripts/create-course-materials-bucket.js`

## Files Modified

1. **`lib/course-materials.ts`**
   - `uploadCourseMaterialFile()` - Fixed file path structure
   - `deleteCourseMaterialFile()` - Updated to use full file paths
   - `updateCourseMaterialWithFile()` - Fixed old file deletion logic

2. **`scripts/create-course-materials-bucket.js`** (new file)
   - Setup script for course-materials storage bucket

## Testing Steps

1. **Verify Storage Bucket Exists:**
   ```bash
   node scripts/create-course-materials-bucket.js
   ```

2. **Test File Upload in Faculty Portal:**
   - Go to Faculty Portal → Course Management
   - Select a course → Course Materials tab
   - Try adding a new material with a file
   - Try editing an existing material and uploading a new file

3. **Check Browser Console:**
   - Look for detailed upload progress logs
   - Verify file paths include user ID: `courseId/userId/materialId.ext`

## Expected Behavior After Fix

- ✅ Faculty can add files when creating new course materials
- ✅ Faculty can replace files when editing existing course materials
- ✅ Files are properly stored with correct path structure
- ✅ RLS policies allow uploads for authenticated instructors
- ✅ Old files are properly deleted when replaced

## Additional Notes

- The fix maintains backward compatibility with existing course materials
- File paths now follow the pattern: `courseId/userId/materialId.fileExtension`
- All file operations (upload, download, delete) now use consistent path structure
- The solution works with the existing RLS policies without requiring database changes
