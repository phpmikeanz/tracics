import { createClient } from "@/lib/supabase/client"

export interface FileUploadResult {
  success: boolean
  url?: string
  error?: string
}

export interface FileUploadProgress {
  loaded: number
  total: number
  percentage: number
}

// Fallback: Convert file to base64 data URL
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}

export async function uploadAssignmentFile(
  file: File,
  studentId: string,
  assignmentId: string,
  onProgress?: (progress: FileUploadProgress) => void
): Promise<FileUploadResult> {
  try {
    console.log('Starting file upload:', { fileName: file.name, fileSize: file.size, studentId, assignmentId })
    
    const supabase = createClient()

    // Create a unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `assignments/${assignmentId}/${studentId}/${fileName}`

    console.log('Upload path:', filePath)

    // First, try to check if bucket exists
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    console.log('Available buckets:', buckets)
    
    if (bucketError) {
      console.error('Error listing buckets:', bucketError)
    }

    // Check if assignment-files bucket exists
    const bucketExists = buckets?.some(bucket => bucket.id === 'assignment-files')
    
    if (!bucketExists) {
      console.log('assignment-files bucket not found, attempting to create...')
      
      // Try to create the bucket
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('assignment-files', {
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
      
      if (createError) {
        console.error('Failed to create bucket:', createError)
        console.log('Falling back to base64 encoding...')
        
        // Fallback: Convert to base64 for small files
        if (file.size > 5000000) { // 5MB limit for base64
          return { success: false, error: 'File too large and storage not available. Please use a smaller file.' }
        }
        
        // Simulate progress for base64 conversion
        if (onProgress) {
          onProgress({ loaded: 0, total: file.size, percentage: 0 })
          // Simulate progress steps
          for (let i = 0; i <= 100; i += 10) {
            await new Promise(resolve => setTimeout(resolve, 50))
            onProgress({ loaded: (file.size * i) / 100, total: file.size, percentage: i })
          }
        }
        
        const base64Data = await fileToBase64(file)
        return {
          success: true,
          url: base64Data
        }
      }
      
      console.log('Bucket created successfully:', newBucket)
    }

    // Upload file to Supabase storage with progress simulation
    if (onProgress) {
      onProgress({ loaded: 0, total: file.size, percentage: 0 })
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        const currentProgress = Math.min(90, Math.random() * 30 + 10) // Random progress between 10-90%
        onProgress({ 
          loaded: (file.size * currentProgress) / 100, 
          total: file.size, 
          percentage: currentProgress 
        })
      }, 200)
      
      // Clear interval after upload completes
      setTimeout(() => clearInterval(progressInterval), 2000)
    }
    
    const { data, error } = await supabase.storage
      .from('assignment-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return { success: false, error: `Upload failed: ${error.message}` }
    }

    console.log('Upload successful:', data)

    // Update progress to 100%
    if (onProgress) {
      onProgress({ loaded: file.size, total: file.size, percentage: 100 })
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from('assignment-files')
      .getPublicUrl(filePath)

    console.log('Public URL generated:', publicData.publicUrl)

    return {
      success: true,
      url: publicData.publicUrl
    }

  } catch (error) {
    console.error('File upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

export async function downloadAssignmentFile(fileUrl: string, fileName: string) {
  try {
    console.log('Downloading file:', { fileUrl: fileUrl.substring(0, 50) + '...', fileName })
    
    // Create a temporary link and trigger download
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = fileName
    
    // For base64 data URLs, we don't need target="_blank"
    if (!fileUrl.startsWith('data:')) {
      link.target = '_blank'
    }
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('Download error:', error)
    throw new Error('Failed to download file')
  }
}

export function getFileNameFromUrl(url: string): string {
  try {
    // Handle base64 data URLs
    if (url.startsWith('data:')) {
      // Extract file type from data URL
      const mimeMatch = url.match(/data:([^;]+)/)
      if (mimeMatch) {
        const mimeType = mimeMatch[1]
        if (mimeType.includes('pdf')) return 'document.pdf'
        if (mimeType.includes('word')) return 'document.docx'
        if (mimeType.includes('text')) return 'document.txt'
        if (mimeType.includes('image')) return 'image.jpg'
      }
      return 'submitted-file'
    }
    
    // Handle regular URLs
    const urlParts = url.split('/')
    const fileName = urlParts[urlParts.length - 1]
    // Remove the timestamp and random string prefix
    const parts = fileName.split('-')
    if (parts.length >= 3) {
      return parts.slice(2).join('-')
    }
    return fileName
  } catch {
    return 'assignment-file'
  }
}
