import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/types"

type CourseMaterial = Database["public"]["Tables"]["course_materials"]["Row"]
type CourseMaterialInsert = Database["public"]["Tables"]["course_materials"]["Insert"]
type CourseMaterialUpdate = Database["public"]["Tables"]["course_materials"]["Update"]

export interface CourseMaterialWithDetails extends CourseMaterial {
  profiles: {
    full_name: string
    email: string
  }
}

export async function getCourseMaterials(courseId: string): Promise<CourseMaterialWithDetails[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("course_materials")
    .select(`
      *,
      profiles(full_name, email)
    `)
    .eq("course_id", courseId)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getCourseMaterialsForStudent(studentId: string): Promise<CourseMaterialWithDetails[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("course_materials")
    .select(`
      *,
      profiles(full_name, email),
      courses(title, course_code)
    `)
    .eq("enrollments.student_id", studentId)
    .eq("enrollments.status", "approved")
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getCourseMaterialsByEnrolledCourses(studentId: string): Promise<CourseMaterialWithDetails[]> {
  const supabase = createClient()

  // First get all enrolled courses for the student
  const { data: enrollments, error: enrollmentError } = await supabase
    .from("enrollments")
    .select(`
      course_id,
      courses(id, title, course_code)
    `)
    .eq("student_id", studentId)
    .eq("status", "approved")

  if (enrollmentError) throw enrollmentError

  if (!enrollments || enrollments.length === 0) {
    return []
  }

  // Extract course IDs
  const courseIds = enrollments.map(e => e.course_id)

  // Get course materials for all enrolled courses
  const { data, error } = await supabase
    .from("course_materials")
    .select(`
      *,
      profiles(full_name, email),
      courses(title, course_code)
    `)
    .in("course_id", courseIds)
    .order("course_id", { ascending: true })
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function createCourseMaterial(material: CourseMaterialInsert): Promise<CourseMaterial> {
  const supabase = createClient()

  console.log('Creating course material with data:', material)

  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    console.error('Authentication error:', authError)
    throw new Error('User not authenticated')
  }
  console.log('User authenticated:', user.id)

  // Validate required fields
  if (!material.course_id) {
    throw new Error('Course ID is required')
  }
  if (!material.title) {
    throw new Error('Title is required')
  }
  if (!material.created_by) {
    throw new Error('Created by is required')
  }

  console.log('All validations passed, attempting insert...')

  const { data, error } = await supabase
    .from("course_materials")
    .insert(material)
    .select()
    .single()

  if (error) {
    console.error('Error creating course material:', error)
    console.error('Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    throw error
  }
  
  console.log('Course material created successfully:', data)
  return data
}

export async function updateCourseMaterial(id: string, updates: CourseMaterialUpdate): Promise<CourseMaterial> {
  const supabase = createClient()

  console.log('Updating course material:', { id, updates })

  // First, let's check if the material exists
  const { data: existingMaterial, error: fetchError } = await supabase
    .from("course_materials")
    .select("*")
    .eq("id", id)
    .single()

  if (fetchError) {
    console.error('Error fetching existing material:', fetchError)
    throw new Error(`Material not found: ${fetchError.message}`)
  }

  console.log('Existing material before update:', existingMaterial)

  const { data, error } = await supabase
    .from("course_materials")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error('Database error updating course material:', error)
    console.error('Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    throw error
  }
  
  console.log('Course material updated successfully:', data)
  return data
}

export async function updateCourseMaterialWithFile(
  id: string, 
  updates: CourseMaterialUpdate, 
  file?: File,
  oldFileName?: string
): Promise<CourseMaterial> {
  const supabase = createClient()

  console.log('Updating course material with file:', { id, updates, hasFile: file && file.size > 0, oldFileName })

  // If a new file is provided, upload it
  if (file && file.size > 0) {
    console.log('Processing new file upload:', file.name)
    
    // Delete old file if it exists
    if (oldFileName) {
      try {
        // Get the old file path from the file_url if available
        const material = await supabase
          .from('course_materials')
          .select('file_url')
          .eq('id', id)
          .single()
        
        if (material.data?.file_url) {
          // Extract the file path from the URL
          const url = new URL(material.data.file_url)
          const pathParts = url.pathname.split('/')
          const fileName = pathParts[pathParts.length - 1]
          const oldFilePath = `${updates.course_id}/${fileName}`
          console.log('Deleting old file:', oldFilePath)
          await deleteCourseMaterialFile(oldFilePath)
        }
      } catch (error) {
        console.warn('Could not delete old file:', error)
      }
    }
    
    console.log('Uploading new file...')
    const { url, path } = await uploadCourseMaterialFile(file, updates.course_id!, id)
    updates.file_url = url
    updates.file_name = file.name
    updates.file_size = file.size
    updates.file_type = file.type
    console.log('File uploaded successfully:', { url, path })
  }

  console.log('Final updates object:', updates)

  const { data, error } = await supabase
    .from("course_materials")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error('Database error updating course material with file:', error)
    throw error
  }
  
  console.log('Course material with file updated successfully:', data)
  return data
}

export async function deleteCourseMaterial(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from("course_materials")
    .delete()
    .eq("id", id)

  if (error) throw error
}

export async function uploadCourseMaterialFile(
  file: File,
  courseId: string,
  materialId: string
): Promise<{ url: string; path: string }> {
  const supabase = createClient()

  console.log('Starting file upload:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    courseId,
    materialId
  })

  // Get current user ID for the file path
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    console.error('Authentication error:', authError)
    throw new Error('User not authenticated')
  }

  // Create a unique file path
  // Since you have multiple policies, let's use a simpler path structure
  const fileExt = file.name.split('.').pop()
  const fileName = `${materialId}-${Date.now()}.${fileExt}`
  const filePath = `${courseId}/${fileName}`

  console.log('File path:', filePath)

  try {
    console.log('User authenticated:', user.id)
    console.log('Attempting direct upload to course-materials bucket...')

    // Upload file to storage
    console.log('Uploading file to storage...')
    const { data, error } = await supabase.storage
      .from('course-materials')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Allow overwriting existing files
      })

    if (error) {
      console.error('File upload error:', error)
      console.error('Error details:', {
        message: error.message,
        name: error.name
      })
      throw new Error(`File upload failed: ${error.message}`)
    }

    console.log('File uploaded successfully:', data)

    // Get public URL
    console.log('Getting public URL...')
    const { data: urlData } = supabase.storage
      .from('course-materials')
      .getPublicUrl(filePath)

    console.log('Public URL generated:', urlData.publicUrl)

    return {
      url: urlData.publicUrl,
      path: filePath
    }
  } catch (error) {
    console.error('File upload failed:', error)
    throw error
  }
}

export async function deleteCourseMaterialFile(filePath: string): Promise<void> {
  const supabase = createClient()

  console.log('Deleting file:', filePath)

  try {
    const { error } = await supabase.storage
      .from('course-materials')
      .remove([filePath])

    if (error) {
      console.warn('Could not delete file:', error)
      throw error
    }
    
    console.log('File deleted successfully:', filePath)
  } catch (error) {
    console.warn('Error deleting file:', error)
    // Don't throw error to avoid breaking the main operation
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getFileIcon(fileType: string): string {
  if (fileType?.includes('pdf')) return '📄'
  if (fileType?.includes('word') || fileType?.includes('document')) return '📝'
  if (fileType?.includes('powerpoint') || fileType?.includes('presentation')) return '📊'
  if (fileType?.includes('excel') || fileType?.includes('spreadsheet')) return '📈'
  if (fileType?.includes('image')) return '🖼️'
  if (fileType?.includes('video')) return '🎥'
  if (fileType?.includes('audio')) return '🎵'
  if (fileType?.includes('zip') || fileType?.includes('archive')) return '📦'
  return '📄'
}

export async function testCourseMaterialsConnection(): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from("course_materials")
      .select("id, title, file_url, file_name")
      .limit(1)
    
    if (error) {
      console.error('Database connection test failed:', error)
      return false
    }
    
    console.log('Database connection test successful, sample data:', data)
    return true
  } catch (error) {
    console.error('Database connection test error:', error)
    return false
  }
}

export async function testInsertCourseMaterial(): Promise<boolean> {
  const supabase = createClient()
  
  try {
    // Test insert with minimal data
    const testData = {
      course_id: '00000000-0000-0000-0000-000000000000', // dummy ID
      title: 'Test Material',
      material_type: 'document' as const,
      created_by: '00000000-0000-0000-0000-000000000000', // dummy ID
    }
    
    console.log('Testing insert with data:', testData)
    
    const { data, error } = await supabase
      .from("course_materials")
      .insert(testData)
      .select()
      .single()
    
    if (error) {
      console.error('Test insert failed:', error)
      return false
    }
    
    console.log('Test insert successful:', data)
    
    // Clean up test data
    await supabase.from("course_materials").delete().eq("id", data.id)
    console.log('Test data cleaned up')
    
    return true
  } catch (error) {
    console.error('Test insert error:', error)
    return false
  }
}

export async function testUpdateCourseMaterial(id: string): Promise<boolean> {
  const supabase = createClient()
  
  try {
    console.log('Testing update for material ID:', id)
    
    const updateData = {
      file_url: 'https://example.com/test-update.pdf',
      file_name: 'test-update.pdf',
      file_size: 2048,
      file_type: 'application/pdf'
    }
    
    console.log('Testing update with data:', updateData)
    
    const { data, error } = await supabase
      .from("course_materials")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()
    
    if (error) {
      console.error('Test update failed:', error)
      return false
    }
    
    console.log('Test update successful:', data)
    return true
  } catch (error) {
    console.error('Test update error:', error)
    return false
  }
}

export async function testStorageBucket(): Promise<boolean> {
  const supabase = createClient()
  
  try {
    console.log('Testing storage bucket...')
    
    // Check if bucket exists
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    
    if (bucketError) {
      console.error('Error listing buckets:', bucketError)
      return false
    }
    
    console.log('Available buckets:', buckets?.map(b => b.id))
    
    const courseMaterialsBucket = buckets?.find(bucket => bucket.id === 'course-materials')
    if (!courseMaterialsBucket) {
      console.error('course-materials bucket not found')
      console.log('Available buckets:', buckets?.map(b => b.id))
      return false
    }
    
    console.log('Storage bucket found:', courseMaterialsBucket)
    return true
  } catch (error) {
    console.error('Storage test error:', error)
    return false
  }
}

export async function testCourseMaterialInsert(courseId: string): Promise<boolean> {
  const supabase = createClient()
  
  try {
    console.log('Testing course material insert for course:', courseId)
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Authentication error:', authError)
      return false
    }
    
    console.log('User authenticated:', user.id)
    
    // Test insert with minimal data
    const testMaterial = {
      course_id: courseId,
      title: 'Test Material',
      description: 'This is a test material',
      material_type: 'document',
      created_by: user.id
    }
    
    console.log('Attempting to insert test material:', testMaterial)
    
    const { data, error } = await supabase
      .from("course_materials")
      .insert(testMaterial)
      .select()
      .single()
    
    if (error) {
      console.error('Test insert failed:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return false
    }
    
    console.log('Test insert successful:', data)
    
    // Clean up test record
    const { error: deleteError } = await supabase
      .from("course_materials")
      .delete()
      .eq("id", data.id)
    
    if (deleteError) {
      console.warn('Could not clean up test record:', deleteError)
    } else {
      console.log('Test record cleaned up successfully')
    }
    
    return true
  } catch (error) {
    console.error('Test insert error:', error)
    return false
  }
}
