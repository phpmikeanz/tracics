# 📸 Profile Photo System Setup Guide

## 🎯 **Overview**

This guide will help you set up a complete profile photo system for your LMS using Supabase Storage and your existing `profiles` table with the `avatar_url` field.

## 🚀 **Quick Setup**

### **1. Run the Storage Setup Script**
```sql
-- Execute in Supabase SQL editor
\i scripts/setup-profile-photos.sql
```

### **2. Install the Components**
The following files have been created:
- `lib/profile-photo.ts` - Core photo management functions
- `hooks/use-profile-photo.ts` - React hook for photo management
- `components/profile/profile-photo-upload.tsx` - UI components
- `scripts/setup-profile-photos.sql` - Database setup

## 📁 **File Structure**

```
lib/
├── profile-photo.ts              # Core photo management
hooks/
├── use-profile-photo.ts          # React hook
components/profile/
├── profile-photo-upload.tsx      # UI components
scripts/
├── setup-profile-photos.sql      # Database setup
```

## 🛠️ **Features**

### **✅ What You Get**

1. **Photo Upload** - Upload images from device
2. **URL Input** - Set avatar from external URL
3. **Photo Management** - Update, delete, refresh
4. **Automatic Fallbacks** - Default avatars when no photo
5. **File Validation** - Size and type checking
6. **Storage Management** - Automatic cleanup
7. **Security** - RLS policies for access control
8. **Performance** - Optimized queries and caching

### **🎨 UI Components**

- **ProfilePhotoUpload** - Full-featured upload component
- **ProfileAvatar** - Simple avatar display
- **ProfilePhotoCard** - Card wrapper for settings

## 🔧 **Usage Examples**

### **Basic Upload Component**
```tsx
import { ProfilePhotoUpload } from "@/components/profile/profile-photo-upload"

function ProfileSettings() {
  return (
    <div>
      <h2>Profile Photo</h2>
      <ProfilePhotoUpload 
        size="xl"
        showUploadButton={true}
        showDeleteButton={true}
        showUrlInput={true}
      />
    </div>
  )
}
```

### **Simple Avatar Display**
```tsx
import { ProfileAvatar } from "@/components/profile/profile-photo-upload"

function UserCard({ userId }: { userId: string }) {
  return (
    <div className="flex items-center gap-3">
      <ProfileAvatar userId={userId} size="md" />
      <span>User Name</span>
    </div>
  )
}
```

### **Using the Hook**
```tsx
import { useProfilePhoto } from "@/hooks/use-profile-photo"

function CustomPhotoComponent() {
  const {
    avatarUrl,
    loading,
    error,
    uploadPhoto,
    deletePhoto,
    getDisplayAvatar
  } = useProfilePhoto()

  const handleFileUpload = async (file: File) => {
    const result = await uploadPhoto(file)
    if (result.success) {
      console.log("Photo uploaded:", result.url)
    }
  }

  return (
    <div>
      <img src={getDisplayAvatar()} alt="Profile" />
      <input 
        type="file" 
        onChange={(e) => handleFileUpload(e.target.files[0])}
      />
    </div>
  )
}
```

## 🗄️ **Database Schema**

### **Enhanced Profiles Table**
```sql
-- Your existing profiles table already has avatar_url
-- No changes needed to the table structure
```

### **Storage Bucket**
```sql
-- Creates 'avatars' bucket in Supabase Storage
-- Public access for viewing avatars
-- Authenticated users can upload/update/delete their own
```

### **New Functions**
```sql
-- get_avatar_url(user_uuid) - Get avatar URL with fallback
-- get_user_profile_with_avatar(user_uuid) - Get profile with avatar
-- update_user_avatar(user_uuid, url) - Update avatar URL
-- delete_user_avatar(user_uuid) - Delete avatar
-- cleanup_old_avatars() - Clean up orphaned files
-- get_avatar_stats() - Get storage statistics
```

## 🔒 **Security Features**

### **Row Level Security (RLS)**
- ✅ **Upload Policy** - Users can only upload their own avatars
- ✅ **View Policy** - Anyone can view avatars (public bucket)
- ✅ **Update Policy** - Users can only update their own avatars
- ✅ **Delete Policy** - Users can only delete their own avatars

### **File Validation**
- ✅ **File Type** - Only images (JPEG, PNG, GIF, WebP)
- ✅ **File Size** - Maximum 5MB
- ✅ **Unique Names** - Prevents conflicts
- ✅ **Automatic Cleanup** - Removes orphaned files

## 📊 **Storage Management**

### **Automatic Cleanup**
```sql
-- Run this periodically to clean up orphaned files
SELECT cleanup_old_avatars();
```

### **Storage Statistics**
```sql
-- Get avatar usage statistics
SELECT * FROM get_avatar_stats();
```

### **View All Profiles with Avatars**
```sql
-- Get all user profiles with avatar URLs
SELECT * FROM user_profiles_with_avatars;
```

## 🎨 **Customization Options**

### **Avatar Sizes**
```tsx
<ProfilePhotoUpload size="sm" />   // 32x32px
<ProfilePhotoUpload size="md" />   // 48x48px
<ProfilePhotoUpload size="lg" />   // 64x64px
<ProfilePhotoUpload size="xl" />   // 96x96px
```

### **Component Props**
```tsx
<ProfilePhotoUpload 
  size="lg"                    // Avatar size
  showUploadButton={true}      // Show upload button
  showDeleteButton={true}      // Show delete button
  showUrlInput={true}         // Show URL input
  className="custom-class"    // Custom CSS class
/>
```

### **Fallback Avatars**
```tsx
// Custom fallback URL
const avatarUrl = getDisplayAvatar("https://example.com/default.jpg")

// Generate initials
const initials = getUserInitials() // "JD" for "John Doe"
```

## 🔄 **Integration with Existing System**

### **Update User Profile Component**
```tsx
// Add to your existing profile settings
import { ProfilePhotoCard } from "@/components/profile/profile-photo-upload"

function ProfileSettings() {
  return (
    <div className="space-y-6">
      <ProfilePhotoCard />
      {/* Your existing profile fields */}
    </div>
  )
}
```

### **Update Navigation/Header**
```tsx
// Add avatar to navigation
import { ProfileAvatar } from "@/components/profile/profile-photo-upload"

function Navigation() {
  const { user } = useAuth()
  
  return (
    <div className="flex items-center gap-3">
      <ProfileAvatar userId={user.id} size="sm" />
      <span>{user.full_name}</span>
    </div>
  )
}
```

## 🧪 **Testing**

### **Test Upload**
1. Go to profile settings
2. Click "Upload" button
3. Select an image file
4. Verify photo appears

### **Test URL Input**
1. Click "URL" button
2. Enter image URL
3. Verify photo updates

### **Test Delete**
1. Click "Delete" button
2. Verify photo is removed
3. Check fallback appears

### **Test Validation**
1. Try uploading non-image file
2. Try uploading large file (>5MB)
3. Verify error messages appear

## 🚨 **Troubleshooting**

### **Common Issues**

#### **"Bucket not found" Error**
```sql
-- Check if bucket exists
SELECT * FROM storage.buckets WHERE id = 'avatars';
```

#### **"Permission denied" Error**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'objects';
```

#### **"File not found" Error**
```sql
-- Check if file exists in storage
SELECT * FROM storage.objects WHERE bucket_id = 'avatars';
```

#### **"Invalid file type" Error**
- Check file extension
- Ensure file is actually an image
- Try different image format

### **Debug Commands**
```sql
-- Check avatar URLs
SELECT id, full_name, avatar_url FROM profiles;

-- Check storage files
SELECT name, size FROM storage.objects WHERE bucket_id = 'avatars';

-- Check policies
SELECT policyname, permissive, roles FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%avatar%';
```

## 📈 **Performance Tips**

### **Optimize Images**
- Use WebP format for better compression
- Resize images before upload
- Use appropriate dimensions

### **Caching**
- Avatar URLs are cached by browser
- Use CDN for better performance
- Consider image optimization service

### **Storage Limits**
- Monitor storage usage
- Clean up old avatars regularly
- Set storage quotas if needed

## 🎉 **Success!**

Your profile photo system is now ready! Users can:

- ✅ **Upload photos** from their device
- ✅ **Set photos** from URLs
- ✅ **Delete photos** when needed
- ✅ **See fallbacks** when no photo
- ✅ **Manage storage** automatically
- ✅ **Access securely** with RLS

The system integrates seamlessly with your existing LMS and provides a professional user experience!
