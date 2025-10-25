// Simple script to create storage bucket
// Run with: node scripts/create-storage-bucket.js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createStorageBucket() {
  try {
    console.log('Creating assignment-files storage bucket...')
    
    // Create bucket
    const { data, error } = await supabase.storage.createBucket('assignment-files', {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/zip',
        'application/x-zip-compressed'
      ]
    })
    
    if (error) {
      console.error('Error creating bucket:', error)
      return false
    }
    
    console.log('Bucket created successfully:', data)
    return true
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return false
  }
}

createStorageBucket()
  .then(success => {
    if (success) {
      console.log('✅ Storage bucket setup complete!')
    } else {
      console.log('❌ Storage bucket setup failed. Check your Supabase settings.')
    }
    process.exit(success ? 0 : 1)
  })

