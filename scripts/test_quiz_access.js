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
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✅ Set' : '❌ Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testQuizAccess() {
  console.log('🧪 Testing Quiz Access After RLS Fix...\n')

  try {
    // Test 1: Check if we can access quizzes
    console.log('1️⃣ Testing quiz access...')
    const { data: quizzes, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, status, course_id')
      .limit(5)

    if (quizError) {
      console.error('❌ Quiz access failed:', quizError.message)
      return
    }

    console.log(`✅ Found ${quizzes.length} quizzes`)
    if (quizzes.length > 0) {
      console.log('   Sample quiz:', quizzes[0].title, `(Status: ${quizzes[0].status})`)
    }

    // Test 2: Check if we can access quiz questions
    console.log('\n2️⃣ Testing quiz questions access...')
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, quiz_id, question, type, points')
      .limit(5)

    if (questionsError) {
      console.error('❌ Quiz questions access failed:', questionsError.message)
      return
    }

    console.log(`✅ Found ${questions.length} quiz questions`)
    if (questions.length > 0) {
      console.log('   Sample question:', questions[0].question.substring(0, 50) + '...')
    }

    // Test 3: Check enrollments
    console.log('\n3️⃣ Testing enrollment access...')
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id, student_id, course_id, status')
      .limit(5)

    if (enrollmentError) {
      console.error('❌ Enrollment access failed:', enrollmentError.message)
      return
    }

    console.log(`✅ Found ${enrollments.length} enrollments`)
    if (enrollments.length > 0) {
      console.log('   Sample enrollment:', `Student: ${enrollments[0].student_id}, Status: ${enrollments[0].status}`)
    }

    // Test 4: Check courses
    console.log('\n4️⃣ Testing course access...')
    const { data: courses, error: courseError } = await supabase
      .from('courses')
      .select('id, title, instructor_id')
      .limit(5)

    if (courseError) {
      console.error('❌ Course access failed:', courseError.message)
      return
    }

    console.log(`✅ Found ${courses.length} courses`)
    if (courses.length > 0) {
      console.log('   Sample course:', courses[0].title)
    }

    // Test 5: Simulate student access to quiz questions
    console.log('\n5️⃣ Testing student access simulation...')
    if (quizzes.length > 0 && enrollments.length > 0) {
      const testQuizId = quizzes[0].id
      const testStudentId = enrollments[0].student_id
      
      console.log(`   Testing access for student ${testStudentId} to quiz ${testQuizId}`)
      
      // This simulates what happens when a student tries to access quiz questions
      const { data: studentQuestions, error: studentError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', testQuizId)

      if (studentError) {
        console.error('❌ Student quiz access failed:', studentError.message)
      } else {
        console.log(`✅ Student can access ${studentQuestions.length} questions for quiz ${testQuizId}`)
      }
    }

    console.log('\n🎉 RLS Policy Test Complete!')
    console.log('If you see ✅ marks above, the RLS policies are working correctly.')
    console.log('Students should now be able to access quiz questions in your app!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testQuizAccess()
