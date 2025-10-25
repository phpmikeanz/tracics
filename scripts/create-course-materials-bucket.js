// Script to create course-materials storage bucket
// Run with: node scripts/create-course-materials-bucket.js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createCourseMaterialsBucket() {
  try {
    console.log('Creating course-materials storage bucket...')
    
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('Error listing buckets:', listError)
      return false
    }
    
    const existingBucket = buckets?.find(bucket => bucket.id === 'course-materials')
    if (existingBucket) {
      console.log('✅ course-materials bucket already exists')
      return true
    }
    
    // Create bucket
    const { data, error } = await supabase.storage.createBucket('course-materials', {
      public: true,
      fileSizeLimit: 104857600, // 100MB
      allowedMimeTypes: [
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
    })
    
    if (error) {
      console.error('Error creating bucket:', error)
      return false
    }
    
    console.log('✅ course-materials bucket created successfully:', data)
    return true
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return false
  }
}

createCourseMaterialsBucket()
  .then(success => {
    if (success) {
      console.log('✅ Course materials storage bucket setup complete!')
    } else {
      console.log('❌ Course materials storage bucket setup failed. Check your Supabase settings.')
    }
    process.exit(success ? 0 : 1)
  })





