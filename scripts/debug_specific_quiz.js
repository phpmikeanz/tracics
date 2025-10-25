/**
 * Debug Specific Quiz - Computer Programming I
 * This script will diagnose the exact issue with Quiz ID: 6902ea3f-ebe9-418d-ba4c-8a1c3eb5b8c1
 */

const { createClient } = require('@supabase/supabase-js');

async function debugSpecificQuiz() {
  try {
    console.log('🔍 DEBUGGING SPECIFIC QUIZ: Computer Programming I');
    console.log('==================================================');
    console.log('Quiz ID: 6902ea3f-ebe9-418d-ba4c-8a1c3eb5b8c1');
    console.log('');
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hdogujyfbjvvewwotman.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhkb2d1anlmYmp2dmV3d290bWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDYyNTksImV4cCI6MjA3Mjg4MjI1OX0.dJBQAU0eHSr1hThSC1eZPpIJwzlqRm7LUfB-p4qepAo";
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const quizId = '6902ea3f-ebe9-418d-ba4c-8a1c3eb5b8c1';
    
    // Step 1: Check if quiz exists
    console.log('1️⃣ CHECKING QUIZ EXISTS...');
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
    console.log(`   Time Limit: ${quiz.time_limit} minutes`);
    console.log(`   Max Attempts: ${quiz.max_attempts}`);
    console.log(`   Due Date: ${quiz.due_date}`);
    console.log('');
    
    // Step 2: Check quiz questions
    console.log('2️⃣ CHECKING QUIZ QUESTIONS...');
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
        console.log('💡 The quiz exists but has no questions in the database.');
      }
    }
    console.log('');
    
    // Step 3: Check course enrollments
    console.log('3️⃣ CHECKING COURSE ENROLLMENTS...');
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
    console.log('');
    
    // Step 4: Check RLS policies
    console.log('4️⃣ CHECKING RLS POLICIES...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_table_policies', { table_name: 'quiz_questions' });
    
    if (policiesError) {
      console.log('⚠️ Could not check RLS policies (this is normal for anon key)');
    } else {
      console.log(`🔒 Found ${policies?.length || 0} RLS policies on quiz_questions table`);
    }
    console.log('');
    
    // Step 5: Test student access simulation
    console.log('5️⃣ TESTING STUDENT ACCESS SIMULATION...');
    
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
    console.log('');
    
    // Step 6: Summary and recommendations
    console.log('📋 DIAGNOSIS SUMMARY:');
    console.log('=====================');
    console.log(`✅ Quiz exists: ${quiz ? 'Yes' : 'No'}`);
    console.log(`✅ Quiz status: ${quiz?.status}`);
    console.log(`❓ Questions count: ${questions?.length || 0}`);
    console.log(`❓ Enrollments count: ${enrollments?.length || 0}`);
    console.log(`❓ Student access: ${studentQuestions?.length || 0} questions`);
    console.log('');
    
    console.log('🔧 RECOMMENDED FIXES:');
    console.log('=====================');
    
    if (!questions || questions.length === 0) {
      console.log('1. ❌ NO QUESTIONS FOUND');
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
    
    console.log('🎯 NEXT STEPS:');
    console.log('==============');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Check the quiz_questions table for questions with quiz_id = ' + quizId);
    console.log('3. If no questions exist, add them through your admin panel');
    console.log('4. Check enrollments table for approved students in this course');
    console.log('5. Make sure quiz status is "published"');
    console.log('6. Test with a student account again');
    
    return {
      quiz,
      questions,
      enrollments,
      studentQuestions,
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
