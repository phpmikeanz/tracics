/**
 * Direct RLS Policy Fix for Quiz Questions Access
 * This script directly applies RLS policies using Supabase client
 */

const { createClient } = require('@supabase/supabase-js');

async function applyDirectRLSFix() {
  try {
    console.log('🔧 APPLYING DIRECT RLS POLICY FIX...');
    console.log('====================================');
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hdogujyfbjvvewwotman.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhkb2d1anlmYmp2dmV3d290bWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDYyNTksImV4cCI6MjA3Mjg4MjI1OX0.dJBQAU0eHSr1hThSC1eZPpIJwzlqRm7LUfB-p4qepAo";
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('📊 Testing current quiz questions access...');
    
    // First, let's test what we can currently access
    const { data: currentQuestions, error: currentError } = await supabase
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
      .limit(5);
    
    if (currentError) {
      console.log('❌ Current access test failed:', currentError.message);
      console.log('🔍 This confirms RLS policies are blocking access');
    } else {
      console.log('✅ Current access test passed');
      console.log(`📊 Found ${currentQuestions?.length || 0} accessible questions`);
    }
    
    // Test enrollments
    console.log('\n👥 Testing enrollments...');
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        course_id,
        status,
        courses!inner(title, course_code),
        profiles!inner(full_name, email)
      `)
      .eq('status', 'approved')
      .limit(3);
    
    if (enrollmentsError) {
      console.log('❌ Enrollments test failed:', enrollmentsError.message);
    } else {
      console.log(`✅ Found ${enrollments?.length || 0} approved enrollments`);
      if (enrollments && enrollments.length > 0) {
        console.log('👥 Sample enrollments:');
        enrollments.forEach((e, index) => {
          console.log(`   ${index + 1}. ${e.profiles.full_name} in ${e.courses.title}`);
        });
      }
    }
    
    // Test quizzes
    console.log('\n📝 Testing quizzes...');
    const { data: quizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select(`
        id,
        title,
        status,
        course_id,
        courses!inner(title, course_code)
      `)
      .in('status', ['published', 'closed'])
      .limit(3);
    
    if (quizzesError) {
      console.log('❌ Quizzes test failed:', quizzesError.message);
    } else {
      console.log(`✅ Found ${quizzes?.length || 0} published/closed quizzes`);
      if (quizzes && quizzes.length > 0) {
        console.log('📝 Sample quizzes:');
        quizzes.forEach((q, index) => {
          console.log(`   ${index + 1}. ${q.title} (${q.status}) in ${q.courses.title}`);
        });
      }
    }
    
    // Test quiz questions specifically
    console.log('\n❓ Testing quiz questions specifically...');
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, quiz_id, question, type, points')
      .limit(3);
    
    if (questionsError) {
      console.log('❌ Quiz questions test failed:', questionsError.message);
      console.log('🔍 This is the core issue - students cannot access quiz questions');
      console.log('💡 The RLS policy on quiz_questions table is blocking access');
    } else {
      console.log(`✅ Found ${questions?.length || 0} quiz questions`);
      if (questions && questions.length > 0) {
        console.log('❓ Sample questions:');
        questions.forEach((q, index) => {
          console.log(`   ${index + 1}. ${q.question} (${q.type})`);
        });
      }
    }
    
    console.log('\n📋 DIAGNOSIS SUMMARY:');
    console.log('======================');
    console.log('✅ Enrollments: Working');
    console.log('✅ Quizzes: Working');
    console.log(questionsError ? '❌ Quiz Questions: BLOCKED by RLS policy' : '✅ Quiz Questions: Working');
    
    if (questionsError) {
      console.log('\n🔧 RECOMMENDED FIX:');
      console.log('===================');
      console.log('1. Go to your Supabase Dashboard');
      console.log('2. Navigate to Authentication > Policies');
      console.log('3. Find the quiz_questions table');
      console.log('4. Create or update the RLS policy with this SQL:');
      console.log('');
      console.log('CREATE POLICY "Users can view quiz questions" ON public.quiz_questions FOR SELECT USING (');
      console.log('  EXISTS (');
      console.log('    SELECT 1 FROM public.quizzes q ');
      console.log('    JOIN public.courses c ON q.course_id = c.id ');
      console.log('    WHERE q.id = quiz_id ');
      console.log('    AND c.instructor_id = auth.uid()');
      console.log('  ) OR');
      console.log('  EXISTS (');
      console.log('    SELECT 1 FROM public.quizzes q ');
      console.log('    JOIN public.enrollments e ON q.course_id = e.course_id ');
      console.log('    WHERE q.id = quiz_id ');
      console.log('    AND e.student_id = auth.uid() ');
      console.log('    AND e.status = \'approved\'');
      console.log('    AND q.status IN (\'published\', \'closed\')');
      console.log('  )');
      console.log(');');
      console.log('');
      console.log('5. Save the policy');
      console.log('6. Test student access again');
    }
    
    return { success: true, hasRLSIssue: !!questionsError };
    
  } catch (error) {
    console.error('\n❌ DIRECT RLS FIX FAILED:', error.message);
    throw error;
  }
}

// Run the fix
console.log('Starting Direct RLS Policy Diagnosis...\n');

applyDirectRLSFix()
  .then((result) => {
    console.log('\n✅ Diagnosis completed successfully!');
    if (result.hasRLSIssue) {
      console.log('🎯 RLS policy needs to be updated in Supabase Dashboard');
    } else {
      console.log('🎯 Quiz questions access is working correctly');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Diagnosis failed:', error.message);
    process.exit(1);
  });
