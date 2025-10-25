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

async function createTestData() {
  console.log('🏗️ Creating Complete Test Data...\n')

  try {
    // Step 1: Get existing courses
    console.log('1️⃣ Getting existing courses...')
    const { data: courses, error: courseError } = await supabase
      .from('courses')
      .select('id, title, instructor_id')
      .limit(1)

    if (courseError) {
      console.error('❌ Failed to get courses:', courseError.message)
      return
    }

    if (courses.length === 0) {
      console.error('❌ No courses found. Please create a course first.')
      return
    }

    const course = courses[0]
    console.log(`✅ Using course: ${course.title} (ID: ${course.id})`)

    // Step 2: Create a test quiz
    console.log('\n2️⃣ Creating test quiz...')
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        title: 'Test Quiz - RLS Fix Verification',
        description: 'This quiz tests if RLS policies are working correctly',
        course_id: course.id,
        status: 'published',
        time_limit: 30,
        max_attempts: 3,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      })
      .select()
      .single()

    if (quizError) {
      console.error('❌ Failed to create quiz:', quizError.message)
      return
    }

    console.log(`✅ Created quiz: ${quiz.title} (ID: ${quiz.id})`)

    // Step 3: Create quiz questions
    console.log('\n3️⃣ Creating quiz questions...')
    const questions = [
      {
        quiz_id: quiz.id,
        question: 'What is the capital of France?',
        type: 'multiple_choice',
        points: 10,
        options: ['London', 'Paris', 'Berlin', 'Madrid'],
        correct_answer: 'Paris',
        order_index: 1
      },
      {
        quiz_id: quiz.id,
        question: 'What is 2 + 2?',
        type: 'multiple_choice',
        points: 5,
        options: ['3', '4', '5', '6'],
        correct_answer: '4',
        order_index: 2
      },
      {
        quiz_id: quiz.id,
        question: 'Explain the concept of photosynthesis.',
        type: 'essay',
        points: 15,
        options: null,
        correct_answer: null,
        order_index: 3
      }
    ]

    const { data: createdQuestions, error: questionsError } = await supabase
      .from('quiz_questions')
      .insert(questions)
      .select()

    if (questionsError) {
      console.error('❌ Failed to create questions:', questionsError.message)
      return
    }

    console.log(`✅ Created ${createdQuestions.length} quiz questions`)

    // Step 4: Create a test student profile
    console.log('\n4️⃣ Creating test student profile...')
    const testStudentId = 'test-student-' + Date.now()
    const { data: studentProfile, error: studentError } = await supabase
      .from('profiles')
      .insert({
        id: testStudentId,
        email: 'teststudent@example.com',
        full_name: 'Test Student',
        role: 'student'
      })
      .select()
      .single()

    if (studentError) {
      console.error('❌ Failed to create student profile:', studentError.message)
      return
    }

    console.log(`✅ Created student profile: ${studentProfile.full_name} (ID: ${studentProfile.id})`)

    // Step 5: Create enrollment
    console.log('\n5️⃣ Creating enrollment...')
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .insert({
        student_id: testStudentId,
        course_id: course.id,
        status: 'approved',
        enrolled_at: new Date().toISOString()
      })
      .select()
      .single()

    if (enrollmentError) {
      console.error('❌ Failed to create enrollment:', enrollmentError.message)
      return
    }

    console.log(`✅ Created enrollment: Student ${testStudentId} enrolled in ${course.title}`)

    // Step 6: Test student access to quiz questions
    console.log('\n6️⃣ Testing student access to quiz questions...')
    const { data: studentQuestions, error: studentAccessError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quiz.id)

    if (studentAccessError) {
      console.error('❌ Student cannot access quiz questions:', studentAccessError.message)
      return
    }

    console.log(`✅ Student can access ${studentQuestions.length} questions for quiz ${quiz.title}`)

    // Step 7: Create a quiz attempt
    console.log('\n7️⃣ Creating quiz attempt...')
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .insert({
        student_id: testStudentId,
        quiz_id: quiz.id,
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (attemptError) {
      console.error('❌ Failed to create quiz attempt:', attemptError.message)
      return
    }

    console.log(`✅ Created quiz attempt: ${attempt.id}`)

    console.log('\n🎉 Test Data Creation Complete!')
    console.log('\n📋 Summary:')
    console.log(`   Course: ${course.title}`)
    console.log(`   Quiz: ${quiz.title}`)
    console.log(`   Questions: ${createdQuestions.length}`)
    console.log(`   Student: ${studentProfile.full_name}`)
    console.log(`   Enrollment: Approved`)
    console.log(`   Attempt: Created`)
    
    console.log('\n🧪 Now test your student account:')
    console.log('   1. Log in as the test student (teststudent@example.com)')
    console.log('   2. Go to "My Quizzes"')
    console.log('   3. You should see the "Test Quiz - RLS Fix Verification"')
    console.log('   4. Click on it and you should see the 3 questions!')

  } catch (error) {
    console.error('❌ Test data creation failed:', error.message)
  }
}

createTestData()