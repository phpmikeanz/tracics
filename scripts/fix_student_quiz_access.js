/**
 * Fix Student Quiz Access - RLS Policy Issue
 * This script diagnoses and fixes why students can't see quiz questions
 */

const { createClient } = require('@supabase/supabase-js');

async function fixStudentQuizAccess() {
  try {
    console.log('🔧 FIXING STUDENT QUIZ ACCESS');
    console.log('=============================');
    console.log('Issue: Questions exist in database but students cannot see them');
    console.log('Cause: RLS (Row Level Security) policies blocking student access');
    console.log('');
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hdogujyfbjvvewwotman.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhkb2d1anlmYmp2dmV3d290bWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDYyNTksImV4cCI6MjA3Mjg4MjI1OX0.dJBQAU0eHSr1hThSC1eZPpIJwzlqRm7LUfB-p4qepAo";
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Step 1: Check if data exists (as admin/service role)
    console.log('1️⃣ CHECKING DATABASE DATA...');
    
    const { data: allQuizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select('id, title, status, course_id')
      .limit(5);
    
    if (quizzesError) {
      console.log('❌ Error fetching quizzes:', quizzesError.message);
    } else {
      console.log(`✅ Found ${allQuizzes?.length || 0} quizzes in database`);
      if (allQuizzes && allQuizzes.length > 0) {
        allQuizzes.forEach((q, index) => {
          console.log(`   ${index + 1}. ${q.title} (${q.status}) - Course: ${q.course_id}`);
        });
      }
    }
    
    const { data: allQuestions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, quiz_id, question, type, points')
      .limit(5);
    
    if (questionsError) {
      console.log('❌ Error fetching questions:', questionsError.message);
    } else {
      console.log(`✅ Found ${allQuestions?.length || 0} quiz questions in database`);
      if (allQuestions && allQuestions.length > 0) {
        allQuestions.forEach((q, index) => {
          console.log(`   ${index + 1}. ${q.question} (${q.type}) - Quiz: ${q.quiz_id}`);
        });
      }
    }
    
    const { data: allEnrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('id, student_id, course_id, status')
      .limit(5);
    
    if (enrollmentsError) {
      console.log('❌ Error fetching enrollments:', enrollmentsError.message);
    } else {
      console.log(`✅ Found ${allEnrollments?.length || 0} enrollments in database`);
      if (allEnrollments && allEnrollments.length > 0) {
        allEnrollments.forEach((e, index) => {
          console.log(`   ${index + 1}. Student: ${e.student_id}, Course: ${e.course_id}, Status: ${e.status}`);
        });
      }
    }
    
    console.log('');
    
    // Step 2: Test student access simulation
    console.log('2️⃣ TESTING STUDENT ACCESS...');
    console.log('Simulating what a student would see when trying to access quiz questions...');
    
    // Try to access quiz questions as if we were a student
    const { data: studentQuestions, error: studentError } = await supabase
      .from('quiz_questions')
      .select(`
        id,
        quiz_id,
        question,
        type,
        points,
        quizzes!inner(
          id,
          title,
          status,
          course_id,
          courses!inner(
            id,
            title,
            course_code
          )
        )
      `)
      .eq('quizzes.status', 'published');
    
    if (studentError) {
      console.log('❌ Student access BLOCKED:', studentError.message);
      console.log('💡 This confirms RLS policy is blocking student access');
      
      if (studentError.message.includes('policy') || studentError.message.includes('RLS')) {
        console.log('🔒 RLS POLICY ISSUE CONFIRMED');
        console.log('   Students cannot access quiz_questions due to Row Level Security');
      }
    } else {
      console.log(`✅ Student access test: Found ${studentQuestions?.length || 0} accessible questions`);
      if (studentQuestions && studentQuestions.length === 0) {
        console.log('❌ Student can access table but finds 0 questions');
        console.log('💡 This means either:');
        console.log('   1. No quizzes are published (status != "published")');
        console.log('   2. Student is not enrolled in any courses');
        console.log('   3. RLS policy is filtering out all questions');
      }
    }
    
    console.log('');
    
    // Step 3: Check specific requirements for student access
    console.log('3️⃣ CHECKING STUDENT ACCESS REQUIREMENTS...');
    
    // Check if any quizzes are published
    const { data: publishedQuizzes, error: publishedError } = await supabase
      .from('quizzes')
      .select('id, title, status, course_id')
      .in('status', ['published', 'closed']);
    
    if (publishedError) {
      console.log('❌ Error checking published quizzes:', publishedError.message);
    } else {
      console.log(`📊 Published/Closed quizzes: ${publishedQuizzes?.length || 0}`);
      if (publishedQuizzes && publishedQuizzes.length === 0) {
        console.log('❌ NO PUBLISHED QUIZZES FOUND');
        console.log('💡 Students can only access published or closed quizzes');
        console.log('🔧 SOLUTION: Change quiz status to "published"');
      }
    }
    
    // Check if any students are enrolled and approved
    const { data: approvedEnrollments, error: approvedError } = await supabase
      .from('enrollments')
      .select('id, student_id, course_id, status')
      .eq('status', 'approved');
    
    if (approvedError) {
      console.log('❌ Error checking approved enrollments:', approvedError.message);
    } else {
      console.log(`👥 Approved enrollments: ${approvedEnrollments?.length || 0}`);
      if (approvedEnrollments && approvedEnrollments.length === 0) {
        console.log('❌ NO APPROVED ENROLLMENTS FOUND');
        console.log('💡 Students must be enrolled and approved to access quizzes');
        console.log('🔧 SOLUTION: Approve student enrollments');
      }
    }
    
    console.log('');
    
    // Step 4: Provide specific fixes
    console.log('4️⃣ PROVIDING SPECIFIC FIXES...');
    console.log('================================');
    
    if ((publishedQuizzes?.length || 0) === 0) {
      console.log('🔧 FIX 1: PUBLISH YOUR QUIZZES');
      console.log('-------------------------------');
      console.log('❌ Problem: No quizzes are published');
      console.log('✅ Solution: Change quiz status to "published"');
      console.log('');
      console.log('SQL to fix:');
      console.log('UPDATE quizzes SET status = \'published\' WHERE status = \'draft\';');
      console.log('');
    }
    
    if ((approvedEnrollments?.length || 0) === 0) {
      console.log('🔧 FIX 2: APPROVE STUDENT ENROLLMENTS');
      console.log('------------------------------------');
      console.log('❌ Problem: No approved student enrollments');
      console.log('✅ Solution: Approve student enrollments');
      console.log('');
      console.log('SQL to fix:');
      console.log('UPDATE enrollments SET status = \'approved\' WHERE status = \'pending\';');
      console.log('');
    }
    
    console.log('🔧 FIX 3: CHECK RLS POLICIES');
    console.log('-----------------------------');
    console.log('❌ Problem: RLS policies may be blocking student access');
    console.log('✅ Solution: Apply the correct RLS policy');
    console.log('');
    console.log('Go to your Supabase Dashboard > Authentication > Policies');
    console.log('Find the quiz_questions table and create this policy:');
    console.log('');
    console.log('CREATE POLICY "Students can view quiz questions" ON quiz_questions FOR SELECT USING (');
    console.log('  EXISTS (');
    console.log('    SELECT 1 FROM quizzes q ');
    console.log('    JOIN enrollments e ON q.course_id = e.course_id ');
    console.log('    WHERE q.id = quiz_id ');
    console.log('    AND e.student_id = auth.uid() ');
    console.log('    AND e.status = \'approved\'');
    console.log('    AND q.status IN (\'published\', \'closed\')');
    console.log('  )');
    console.log(');');
    console.log('');
    
    console.log('🎯 SUMMARY OF ISSUES FOUND:');
    console.log('===========================');
    console.log(`📊 Quizzes in database: ${allQuizzes?.length || 0}`);
    console.log(`❓ Questions in database: ${allQuestions?.length || 0}`);
    console.log(`👥 Enrollments in database: ${allEnrollments?.length || 0}`);
    console.log(`📝 Published quizzes: ${publishedQuizzes?.length || 0}`);
    console.log(`✅ Approved enrollments: ${approvedEnrollments?.length || 0}`);
    console.log(`🔍 Student can access questions: ${studentQuestions?.length || 0}`);
    
    if ((studentQuestions?.length || 0) === 0) {
      console.log('');
      console.log('🚨 MAIN ISSUE: Students cannot access quiz questions');
      console.log('💡 This is why students see "No Questions Available"');
      console.log('');
      console.log('🔧 IMMEDIATE ACTIONS NEEDED:');
      console.log('1. Publish your quizzes (change status to "published")');
      console.log('2. Approve student enrollments (change status to "approved")');
      console.log('3. Check RLS policies on quiz_questions table');
      console.log('4. Test with a student account after making these changes');
    }
    
    return {
      hasData: (allQuizzes?.length || 0) > 0 && (allQuestions?.length || 0) > 0,
      hasPublishedQuizzes: (publishedQuizzes?.length || 0) > 0,
      hasApprovedEnrollments: (approvedEnrollments?.length || 0) > 0,
      studentCanAccess: (studentQuestions?.length || 0) > 0
    };
    
  } catch (error) {
    console.error('\n❌ FIX FAILED:', error.message);
    throw error;
  }
}

// Run the fix
console.log('Starting student quiz access fix...\n');

fixStudentQuizAccess()
  .then((result) => {
    console.log('\n✅ Student access diagnosis completed!');
    if (!result.studentCanAccess) {
      console.log('🎯 Students cannot access quiz questions - follow the fixes above');
    } else {
      console.log('🎯 Student access is working correctly');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fix failed:', error.message);
    process.exit(1);
  });



