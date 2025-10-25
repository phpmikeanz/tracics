const { createClient } = require('@supabase/supabase-js')

// Load environment variables manually
const fs = require('fs')
const path = require('path')

// Try to load .env file
try {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=')
      if (key && value) {
        process.env[key.trim()] = value.trim()
      }
    })
  }
} catch (error) {
  console.log('No .env.local file found, using system environment variables')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkRLSPolicies() {
  console.log('🔍 Checking RLS Policies...\n')

  try {
    // Check if we can get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      console.log('ℹ️ No authenticated user (this is expected for anon access)')
    } else {
      console.log('✅ Authenticated user:', user.id)
    }

    // Check profiles table
    console.log('\n1️⃣ Checking profiles access...')
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .limit(3)

    if (profileError) {
      console.error('❌ Profiles access failed:', profileError.message)
    } else {
      console.log(`✅ Found ${profiles.length} profiles`)
      if (profiles.length > 0) {
        console.log('   Sample:', profiles[0].email, `(${profiles[0].role})`)
      }
    }

    // Check courses table
    console.log('\n2️⃣ Checking courses access...')
    const { data: courses, error: courseError } = await supabase
      .from('courses')
      .select('id, title, instructor_id')
      .limit(3)

    if (courseError) {
      console.error('❌ Courses access failed:', courseError.message)
    } else {
      console.log(`✅ Found ${courses.length} courses`)
      if (courses.length > 0) {
        console.log('   Sample:', courses[0].title, `(Instructor: ${courses[0].instructor_id})`)
      }
    }

    // Check enrollments table
    console.log('\n3️⃣ Checking enrollments access...')
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id, student_id, course_id, status')
      .limit(3)

    if (enrollmentError) {
      console.error('❌ Enrollments access failed:', enrollmentError.message)
    } else {
      console.log(`✅ Found ${enrollments.length} enrollments`)
      if (enrollments.length > 0) {
        console.log('   Sample:', `Student: ${enrollments[0].student_id}, Status: ${enrollments[0].status}`)
      }
    }

    // Check quizzes table
    console.log('\n4️⃣ Checking quizzes access...')
    const { data: quizzes, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, status, course_id')
      .limit(3)

    if (quizError) {
      console.error('❌ Quizzes access failed:', quizError.message)
    } else {
      console.log(`✅ Found ${quizzes.length} quizzes`)
      if (quizzes.length > 0) {
        console.log('   Sample:', quizzes[0].title, `(Status: ${quizzes[0].status})`)
      }
    }

    // Check quiz_questions table
    console.log('\n5️⃣ Checking quiz_questions access...')
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, quiz_id, question, type, points')
      .limit(3)

    if (questionsError) {
      console.error('❌ Quiz questions access failed:', questionsError.message)
    } else {
      console.log(`✅ Found ${questions.length} quiz questions`)
      if (questions.length > 0) {
        console.log('   Sample:', questions[0].question.substring(0, 50) + '...')
      }
    }

    console.log('\n📋 RLS Policy Check Complete!')
    console.log('If you see ❌ errors above, the RLS policies need to be fixed.')

  } catch (error) {
    console.error('❌ Check failed:', error.message)
  }
}

checkRLSPolicies()



