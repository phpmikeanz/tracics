const { createClient } = require('@supabase/supabase-js');

async function debugSpecificQuiz() {
  try {
    console.log('🔍 DEBUGGING SPECIFIC QUIZ ISSUE');
    console.log('=================================');
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables!');
      console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file');
      process.exit(1);
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const quizId = '15fd339d-4a71-481f-b1d6-8adc028eb58c';
    console.log('Quiz ID:', quizId);
    
    // Step 1: Check if quiz exists
    console.log('\n1️⃣ CHECKING QUIZ EXISTS...');
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select(`
        id,
        title,
        description,
        status,
        course_id,
        time_limit,
        max_attempts,
        due_date,
        created_at,
        courses!inner(
          id,
          title,
          course_code,
          instructor_id
        )
      `)
      .eq('id', quizId)
      .single();
    
    if (quizError) {
      console.log('❌ Quiz not found:', quizError.message);
      return;
    }
    
    console.log('✅ Quiz found:');
    console.log(`   Title: ${quiz.title}`);
    console.log(`   Status: ${quiz.status}`);
    console.log(`   Course: ${quiz.courses.title} (${quiz.courses.course_code})`);
    console.log(`   Instructor ID: ${quiz.courses.instructor_id}`);
    
    // Step 2: Check quiz questions directly
    console.log('\n2️⃣ CHECKING QUIZ QUESTIONS...');
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select(`
        id,
        quiz_id,
        question,
        type,
        options,
        correct_answer,
        points,
        order_index,
        created_at
      `)
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true });
    
    if (questionsError) {
      console.log('❌ Error fetching questions:', questionsError.message);
      console.log('Error details:', questionsError);
    } else {
      console.log(`📊 Found ${questions?.length || 0} questions for this quiz`);
      
      if (questions && questions.length > 0) {
        console.log('📝 Questions:');
        questions.forEach((q, index) => {
          console.log(`   ${index + 1}. ${q.question} (${q.type}) - ${q.points} points`);
          if (q.options) {
            console.log(`      Options: ${JSON.stringify(q.options)}`);
          }
          if (q.correct_answer) {
            console.log(`      Correct Answer: ${q.correct_answer}`);
          }
        });
      } else {
        console.log('❌ NO QUESTIONS FOUND! This is the problem.');
      }
    }
    
    // Step 3: Check course enrollments
    console.log('\n3️⃣ CHECKING COURSE ENROLLMENTS...');
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        course_id,
        status,
        created_at,
        profiles!inner(
          id,
          full_name,
          email,
          role
        )
      `)
      .eq('course_id', quiz.course_id)
      .eq('status', 'approved');
    
    if (enrollmentsError) {
      console.log('❌ Error fetching enrollments:', enrollmentsError.message);
    } else {
      console.log(`👥 Found ${enrollments?.length || 0} approved enrollments for this course`);
      
      if (enrollments && enrollments.length > 0) {
        console.log('👥 Enrolled students:');
        enrollments.forEach((e, index) => {
          console.log(`   ${index + 1}. ${e.profiles.full_name} (${e.profiles.email}) - ${e.profiles.role}`);
        });
      } else {
        console.log('❌ NO APPROVED ENROLLMENTS! Students cannot access this quiz.');
      }
    }
    
    // Step 4: Test RLS policies
    console.log('\n4️⃣ TESTING RLS POLICIES...');
    
    // Try to access questions as if we were a student
    const { data: studentQuestions, error: studentError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId);
    
    if (studentError) {
      console.log('❌ Student access blocked:', studentError.message);
      console.log('💡 This suggests RLS policy is blocking access');
    } else {
      console.log(`✅ Student access test: Found ${studentQuestions?.length || 0} questions`);
      if (studentQuestions && studentQuestions.length === 0) {
        console.log('❌ Student can access quiz_questions table but finds 0 questions');
        console.log('💡 This means either:');
        console.log('   1. No questions exist in the database');
        console.log('   2. Questions exist but are not linked to this quiz');
        console.log('   3. Questions exist but RLS is filtering them out');
      }
    }
    
    // Step 5: Check all questions in database
    console.log('\n5️⃣ CHECKING ALL QUESTIONS IN DATABASE...');
    const { data: allQuestions, error: allQuestionsError } = await supabase
      .from('quiz_questions')
      .select('id, quiz_id, question, type, points')
      .limit(10);
    
    if (allQuestionsError) {
      console.log('❌ Error fetching all questions:', allQuestionsError.message);
    } else {
      console.log(`📊 Total questions in database: ${allQuestions?.length || 0}`);
      if (allQuestions && allQuestions.length > 0) {
        console.log('📝 Sample questions:');
        allQuestions.forEach((q, index) => {
          console.log(`   ${index + 1}. Quiz ${q.quiz_id}: ${q.question} (${q.type})`);
        });
      }
    }
    
    // Step 6: Check if questions exist for this specific quiz
    console.log('\n6️⃣ CHECKING QUESTIONS FOR SPECIFIC QUIZ...');
    const { data: specificQuestions, error: specificQuestionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId);
    
    if (specificQuestionsError) {
      console.log('❌ Error fetching specific questions:', specificQuestionsError.message);
    } else {
      console.log(`📊 Questions for quiz ${quizId}: ${specificQuestions?.length || 0}`);
      if (specificQuestions && specificQuestions.length > 0) {
        console.log('📝 Questions found:');
        specificQuestions.forEach((q, index) => {
          console.log(`   ${index + 1}. ${q.question} (${q.type}) - ${q.points} points`);
        });
      } else {
        console.log('❌ NO QUESTIONS FOUND FOR THIS QUIZ!');
        console.log('💡 This is the exact problem - the quiz has no questions.');
      }
    }
    
    console.log('\n📋 DIAGNOSIS SUMMARY:');
    console.log('=====================');
    console.log(`✅ Quiz exists: ${quiz ? 'Yes' : 'No'}`);
    console.log(`✅ Quiz status: ${quiz?.status}`);
    console.log(`❓ Questions count: ${questions?.length || 0}`);
    console.log(`❓ Enrollments count: ${enrollments?.length || 0}`);
    console.log(`❓ Student access: ${studentQuestions?.length || 0} questions`);
    console.log(`❓ Specific questions: ${specificQuestions?.length || 0} questions`);
    
    console.log('\n🔧 RECOMMENDED FIXES:');
    console.log('=====================');
    
    if (!questions || questions.length === 0) {
      console.log('1. ❌ NO QUESTIONS FOUND FOR THIS QUIZ');
      console.log('   → Add questions to the quiz in your admin panel');
      console.log('   → Or run this SQL to add test questions:');
      console.log('');
      console.log(`   INSERT INTO quiz_questions (id, quiz_id, question, type, options, correct_answer, points, order_index)`);
      console.log(`   VALUES `);
      console.log(`     (gen_random_uuid(), '${quizId}', 'What is a variable?', 'multiple_choice', '["A container for data", "A function", "A loop", "A condition"]', 'A container for data', 10, 1),`);
      console.log(`     (gen_random_uuid(), '${quizId}', 'Is Python a programming language?', 'true_false', NULL, 'true', 5, 2),`);
      console.log(`     (gen_random_uuid(), '${quizId}', 'Explain what a function does.', 'essay', NULL, NULL, 15, 3);`);
      console.log('');
    }
    
    if (!enrollments || enrollments.length === 0) {
      console.log('2. ❌ NO APPROVED ENROLLMENTS');
      console.log('   → Enroll students in the course');
      console.log('   → Make sure enrollment status is "approved"');
      console.log('');
    }
    
    if (quiz.status !== 'published' && quiz.status !== 'closed') {
      console.log('3. ❌ QUIZ NOT PUBLISHED');
      console.log('   → Change quiz status to "published"');
      console.log(`   → Run: UPDATE quizzes SET status = 'published' WHERE id = '${quizId}';`);
      console.log('');
    }
    
    return {
      quiz,
      questions,
      enrollments,
      studentQuestions,
      specificQuestions,
      hasQuestions: (questions?.length || 0) > 0,
      hasEnrollments: (enrollments?.length || 0) > 0,
      isPublished: quiz?.status === 'published' || quiz?.status === 'closed'
    };
    
  } catch (error) {
    console.error('\n❌ DEBUG FAILED:', error.message);
    throw error;
  }
}

// Run the debug
console.log('Starting specific quiz debug...\n');

debugSpecificQuiz()
  .then((result) => {
    console.log('\n✅ Debug completed successfully!');
    if (!result.hasQuestions) {
      console.log('🎯 MAIN ISSUE: Quiz has no questions - add questions to fix this');
    } else if (!result.hasEnrollments) {
      console.log('🎯 MAIN ISSUE: No approved enrollments - enroll students to fix this');
    } else if (!result.isPublished) {
      console.log('🎯 MAIN ISSUE: Quiz not published - publish quiz to fix this');
    } else {
      console.log('🎯 All checks passed - issue might be elsewhere');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Debug failed:', error.message);
    process.exit(1);
  });

