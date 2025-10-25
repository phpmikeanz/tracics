/**
 * Create Test Quiz Data
 * This script will create a complete test quiz with questions
 */

const { createClient } = require('@supabase/supabase-js');

async function createTestQuizData() {
  try {
    console.log('🔧 CREATING TEST QUIZ DATA');
    console.log('===========================');
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hdogujyfbjvvewwotman.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhkb2d1anlmYmp2dmV3d290bWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDYyNTksImV4cCI6MjA3Mjg4MjI1OX0.dJBQAU0eHSr1hThSC1eZPpIJwzlqRm7LUfB-p4qepAo";
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('❌ No authenticated user found');
      console.log('💡 You need to be logged in to create quiz data');
      return;
    }
    
    console.log('✅ Authenticated as:', user.id);
    
    // Get available courses
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, title, course_code, instructor_id')
      .limit(5);
    
    if (coursesError) {
      console.log('❌ Error fetching courses:', coursesError.message);
      return;
    }
    
    if (!courses || courses.length === 0) {
      console.log('❌ No courses found');
      console.log('💡 Create a course first before creating quizzes');
      return;
    }
    
    console.log(`✅ Found ${courses.length} courses`);
    const course = courses[0]; // Use first course
    console.log(`📚 Using course: ${course.title} (${course.course_code})`);
    
    // Create a test quiz
    console.log('\n📝 Creating test quiz...');
    const quizData = {
      title: 'Computer Programming I - Test Quiz',
      description: 'A test quiz to verify quiz functionality',
      course_id: course.id,
      time_limit: 30,
      max_attempts: 3,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      status: 'published'
    };
    
    const { data: newQuiz, error: quizError } = await supabase
      .from('quizzes')
      .insert(quizData)
      .select()
      .single();
    
    if (quizError) {
      console.log('❌ Error creating quiz:', quizError.message);
      console.log('💡 Check if you have permission to create quizzes');
      return;
    }
    
    console.log('✅ Quiz created successfully!');
    console.log(`   Quiz ID: ${newQuiz.id}`);
    console.log(`   Title: ${newQuiz.title}`);
    console.log(`   Status: ${newQuiz.status}`);
    
    // Create test questions
    console.log('\n❓ Creating test questions...');
    const questions = [
      {
        quiz_id: newQuiz.id,
        question: 'What is a variable in programming?',
        type: 'multiple_choice',
        options: ['A container for storing data', 'A function', 'A loop', 'A condition'],
        correct_answer: 'A container for storing data',
        points: 10,
        order_index: 1
      },
      {
        quiz_id: newQuiz.id,
        question: 'Is Python a high-level programming language?',
        type: 'true_false',
        options: null,
        correct_answer: 'true',
        points: 5,
        order_index: 2
      },
      {
        quiz_id: newQuiz.id,
        question: 'Explain what a function does in programming.',
        type: 'essay',
        options: null,
        correct_answer: null,
        points: 15,
        order_index: 3
      },
      {
        quiz_id: newQuiz.id,
        question: 'What does HTML stand for?',
        type: 'short_answer',
        options: null,
        correct_answer: 'HyperText Markup Language',
        points: 8,
        order_index: 4
      }
    ];
    
    const { data: newQuestions, error: questionsError } = await supabase
      .from('quiz_questions')
      .insert(questions)
      .select();
    
    if (questionsError) {
      console.log('❌ Error creating questions:', questionsError.message);
      console.log('💡 Check if you have permission to create quiz questions');
      return;
    }
    
    console.log('✅ Questions created successfully!');
    console.log(`   Created ${newQuestions?.length || 0} questions`);
    
    if (newQuestions && newQuestions.length > 0) {
      console.log('📝 Questions:');
      newQuestions.forEach((q, index) => {
        console.log(`   ${index + 1}. ${q.question} (${q.type}) - ${q.points} points`);
      });
    }
    
    // Create a test enrollment (if we can find a student)
    console.log('\n👥 Creating test enrollment...');
    
    // Try to find a student profile
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('role', 'student')
      .limit(1);
    
    if (profilesError || !profiles || profiles.length === 0) {
      console.log('⚠️ No student profiles found');
      console.log('💡 Create a student account first to test enrollment');
    } else {
      const student = profiles[0];
      console.log(`👤 Found student: ${student.full_name} (${student.email})`);
      
      const enrollmentData = {
        student_id: student.id,
        course_id: course.id,
        status: 'approved'
      };
      
      const { data: newEnrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .insert(enrollmentData)
        .select()
        .single();
      
      if (enrollmentError) {
        console.log('❌ Error creating enrollment:', enrollmentError.message);
        console.log('💡 Enrollment might already exist or permission denied');
      } else {
        console.log('✅ Enrollment created successfully!');
        console.log(`   Student: ${student.full_name}`);
        console.log(`   Course: ${course.title}`);
        console.log(`   Status: ${newEnrollment.status}`);
      }
    }
    
    console.log('\n🎉 TEST DATA CREATION COMPLETED!');
    console.log('=================================');
    console.log('✅ Quiz created and published');
    console.log('✅ Questions added to quiz');
    console.log('✅ Student enrolled (if possible)');
    console.log('');
    console.log('🎯 NEXT STEPS:');
    console.log('1. Log in as a student');
    console.log('2. Navigate to the quiz');
    console.log('3. You should now see the questions!');
    console.log('');
    console.log(`📝 Quiz ID: ${newQuiz.id}`);
    console.log(`📚 Course: ${course.title}`);
    console.log(`❓ Questions: ${newQuestions?.length || 0}`);
    
    return {
      quiz: newQuiz,
      questions: newQuestions,
      course: course
    };
    
  } catch (error) {
    console.error('\n❌ TEST DATA CREATION FAILED:', error.message);
    throw error;
  }
}

// Run the script
console.log('Starting test quiz data creation...\n');

createTestQuizData()
  .then((result) => {
    console.log('\n✅ Test data creation completed successfully!');
    if (result) {
      console.log('🎯 You can now test the quiz with a student account');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test data creation failed:', error.message);
    console.error('Please check your database permissions and try again.');
    process.exit(1);
  });
