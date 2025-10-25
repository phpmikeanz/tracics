// Test Course Materials File Upload
// Run this in your browser console to test file upload functionality

async function testCourseMaterialsUpload() {
  console.log('🧪 Testing Course Materials File Upload...');
  
  try {
    // Check if Supabase client is available
    if (typeof window.supabase === 'undefined') {
      console.error('❌ Supabase client not found. Make sure you are on a page with Supabase loaded.');
      return;
    }
    
    const supabase = window.supabase;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ User not authenticated:', authError);
      return;
    }
    console.log('✅ User authenticated:', user.id);
    
    // Check if course-materials bucket exists
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      console.error('❌ Error listing buckets:', bucketError);
      return;
    }
    
    const courseMaterialsBucket = buckets?.find(bucket => bucket.id === 'course-materials');
    if (!courseMaterialsBucket) {
      console.error('❌ course-materials bucket not found');
      return;
    }
    console.log('✅ course-materials bucket found:', courseMaterialsBucket);
    
    // Create a test file
    const testContent = 'This is a test file for course materials upload.';
    const testFile = new File([testContent], 'test-course-material.txt', { type: 'text/plain' });
    console.log('✅ Test file created:', testFile.name, testFile.size, 'bytes');
    
    // Test upload with simple path structure
    const testPath = `test-course/${user.id}/test-${Date.now()}.txt`;
    console.log('📁 Test file path:', testPath);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('course-materials')
      .upload(testPath, testFile);
    
    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      console.error('Error details:', {
        message: uploadError.message,
        statusCode: uploadError.statusCode,
        error: uploadError.error
      });
      return;
    }
    
    console.log('✅ Upload successful:', uploadData);
    
    // Test getting public URL
    const { data: urlData } = supabase.storage
      .from('course-materials')
      .getPublicUrl(testPath);
    
    console.log('✅ Public URL generated:', urlData.publicUrl);
    
    // Clean up test file
    const { error: deleteError } = await supabase.storage
      .from('course-materials')
      .remove([testPath]);
    
    if (deleteError) {
      console.warn('⚠️ Could not delete test file:', deleteError);
    } else {
      console.log('✅ Test file cleaned up');
    }
    
    console.log('🎉 All tests passed! File upload should work correctly.');
    
  } catch (error) {
    console.error('❌ Unexpected error during test:', error);
  }
}

// Instructions for use:
console.log(`
🧪 Course Materials Upload Test

To run this test:
1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Copy and paste this entire script
4. Press Enter to run it

The test will:
- Check authentication
- Verify storage bucket exists
- Test file upload
- Generate public URL
- Clean up test file

If any step fails, it will show detailed error information.
`);

// Uncomment the line below to run the test automatically
// testCourseMaterialsUpload();





