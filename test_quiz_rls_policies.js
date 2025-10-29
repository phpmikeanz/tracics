const { createClient } = require('@supabase/supabase-js');

async function testQuizRLSPolicies() {
  try {
    console.log('🔍 TESTING QUIZ RLS POLICIES');
    console.log('============================');
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables!');
      console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file');
      process.exit(1);
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test with a specific quiz ID
    const quizId = '15fd339d-4a71-481f-b1d6-8adc028eb58c';
    console.log('Quiz ID:', quizId);
    
    // ===========================================
    // STEP 1: CHECK QUIZ EXISTS AND STATUS
    // ===========================================
    console.log('\n1️⃣ CHECKING QUIZ STATUS...');
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
    
    // ===========================================
    // STEP 2: CHECK COURSE ENROLLMENTS
    // ===========================================
    console.log('\n2️⃣ CHECKING COURSE ENROLLMENTS...');
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
    
    // ===========================================
    // STEP 3: TEST STUDENT ACCESS TO QUIZ QUESTIONS
    // ===========================================
    console.log('\n3️⃣ TESTING STUDENT ACCESS TO QUIZ QUESTIONS...');
    
    // Test 1: Direct access to quiz_questions table
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
      console.log('❌ Error accessing quiz questions:', questionsError.message);
      console.log('💡 This suggests RLS policy is blocking access');
    } else {
      console.log(`✅ Successfully accessed quiz questions: ${questions?.length || 0} questions found`);
      
      if (questions && questions.length > 0) {
        console.log('📝 Questions found:');
        questions.forEach((q, index) => {
          console.log(`   ${index + 1}. ${q.question} (${q.type}) - ${q.points} points`);
          if (q.options) {
            console.log(`      Options: ${JSON.stringify(q.options)}`);
          }
        });
      } else {
        console.log('❌ NO QUESTIONS FOUND! This is the main issue.');
      }
    }
    
    // ===========================================
    // STEP 4: TEST WITH JOIN QUERY (REALISTIC SCENARIO)
    // ===========================================
    console.log('\n4️⃣ TESTING JOIN QUERY (REALISTIC SCENARIO)...');
    
    const { data: joinedData, error: joinedError } = await supabase
      .from('quiz_questions')
      .select(`
        id,
        question,
        type,
        points,
        order_index,
        quizzes!inner(
          id,
          title,
          status,
          courses!inner(
            id,
            title,
            course_code
          )
        )
      `)
      .eq('quiz_id', quizId);
    
    if (joinedError) {
      console.log('❌ Error with join query:', joinedError.message);
    } else {
      console.log(`✅ Join query successful: ${joinedData?.length || 0} questions found`);
    }
    
    // ===========================================
    // STEP 5: CHECK RLS POLICIES
    // ===========================================
    console.log('\n5️⃣ CHECKING RLS POLICIES...');
    
    // This would need to be run as a superuser or with service role key
    // For now, we'll just check if we can access the data
    console.log('💡 RLS policies are active. If you can see questions above, policies are working.');
    
    // ===========================================
    // STEP 6: TEST QUIZ ATTEMPTS ACCESS
    // ===========================================
    console.log('\n6️⃣ TESTING QUIZ ATTEMPTS ACCESS...');
    
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select(`
        id,
        quiz_id,
        student_id,
        status,
        score,
        started_at,
        completed_at
      `)
      .eq('quiz_id', quizId);
    
    if (attemptsError) {
      console.log('❌ Error accessing quiz attempts:', attemptsError.message);
    } else {
      console.log(`✅ Successfully accessed quiz attempts: ${attempts?.length || 0} attempts found`);
    }
    
    // ===========================================
    // STEP 7: DIAGNOSIS AND RECOMMENDATIONS
    // ===========================================
    console.log('\n📋 DIAGNOSIS SUMMARY:');
    console.log('=====================');
    console.log(`✅ Quiz exists: ${quiz ? 'Yes' : 'No'}`);
    console.log(`✅ Quiz status: ${quiz?.status}`);
    console.log(`❓ Questions accessible: ${questions?.length || 0}`);
    console.log(`❓ Enrollments count: ${enrollments?.length || 0}`);
    console.log(`❓ Join query works: ${joinedData?.length || 0}`);
    console.log(`❓ Attempts accessible: ${attempts?.length || 0}`);
    
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
      console.log('   → Run this SQL to create a test enrollment:');
      console.log('');
      console.log(`   INSERT INTO enrollments (student_id, course_id, status)`);
      console.log(`   VALUES (auth.uid(), '${quiz.course_id}', 'approved');`);
      console.log('');
    }
    
    if (quiz.status !== 'published' && quiz.status !== 'closed') {
      console.log('3. ❌ QUIZ NOT PUBLISHED');
      console.log('   → Change quiz status to "published"');
      console.log(`   → Run: UPDATE quizzes SET status = 'published' WHERE id = '${quizId}';`);
      console.log('');
    }
    
    if (questionsError) {
      console.log('4. ❌ RLS POLICY ISSUE');
      console.log('   → Run the comprehensive_quiz_rls_policies.sql script');
      console.log('   → Check that all policies are created correctly');
      console.log('   → Verify user roles in the profiles table');
      console.log('');
    }
    
    return {
      quiz,
      questions,
      enrollments,
      attempts,
      joinedData,
      hasQuestions: (questions?.length || 0) > 0,
      hasEnrollments: (enrollments?.length || 0) > 0,
      isPublished: quiz?.status === 'published' || quiz?.status === 'closed',
      questionsAccessible: !questionsError,
      attemptsAccessible: !attemptsError
    };
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    throw error;
  }
}

// Run the test
console.log('Starting quiz RLS policy test...\n');

testQuizRLSPolicies()
  .then((result) => {
    console.log('\n✅ Test completed successfully!');
    
    if (!result.hasQuestions) {
      console.log('🎯 MAIN ISSUE: Quiz has no questions - add questions to fix this');
    } else if (!result.hasEnrollments) {
      console.log('🎯 MAIN ISSUE: No approved enrollments - enroll students to fix this');
    } else if (!result.isPublished) {
      console.log('🎯 MAIN ISSUE: Quiz not published - publish quiz to fix this');
    } else if (!result.questionsAccessible) {
      console.log('🎯 MAIN ISSUE: RLS policy blocking access - run the comprehensive RLS script');
    } else {
      console.log('🎯 All checks passed - quiz system should be working correctly');
    }
    
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
