const { createClient } = require('@supabase/supabase-js');

async function debugNoQuestionsIssue() {
  try {
    console.log('🔍 DEBUGGING "NO QUESTIONS AVAILABLE" ISSUE');
    console.log('==========================================');
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hdogujyfbjvvewwotman.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhkb2d1anlmYmp2dmV3d290bWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDYyNTksImV4cCI6MjA3Mjg4MjI1OX0.dJBQAU0eHSr1hThSC1eZPpIJwzlqRm7LUfB-p4qepAo";
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test with a specific quiz ID
    const quizId = '15fd339d-4a71-481f-b1d6-8adc028eb58c';
    console.log('Quiz ID:', quizId);
    
    // ===========================================
    // STEP 1: CHECK IF QUESTIONS EXIST IN DATABASE
    // ===========================================
    console.log('\n1️⃣ CHECKING IF QUESTIONS EXIST IN DATABASE...');
    
    // Use service role to bypass RLS and check raw data
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let adminSupabase = null;
    
    if (serviceRoleKey) {
      adminSupabase = createClient(supabaseUrl, serviceRoleKey);
      console.log('✅ Using service role to check raw data');
    } else {
      console.log('⚠️  No service role key - using anon key (may be limited by RLS)');
    }
    
    const clientToUse = adminSupabase || supabase;
    
    const { data: rawQuestions, error: rawQuestionsError } = await clientToUse
      .from('quiz_questions')
      .select(`
        id,
        quiz_id,
        question,
        type,
        points,
        order_index,
        created_at
      `)
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true });
    
    if (rawQuestionsError) {
      console.log('❌ Error fetching raw questions:', rawQuestionsError.message);
    } else {
      console.log(`📊 Raw questions in database: ${rawQuestions?.length || 0}`);
      
      if (rawQuestions && rawQuestions.length > 0) {
        console.log('✅ Questions exist in database:');
        rawQuestions.forEach((q, index) => {
          console.log(`   ${index + 1}. ${q.question} (${q.type}) - ${q.points} points`);
        });
      } else {
        console.log('❌ NO QUESTIONS FOUND IN DATABASE!');
        console.log('💡 This means questions were not actually saved to the database');
        return;
      }
    }
    
    // ===========================================
    // STEP 2: CHECK QUIZ STATUS
    // ===========================================
    console.log('\n2️⃣ CHECKING QUIZ STATUS...');
    
    const { data: quiz, error: quizError } = await clientToUse
      .from('quizzes')
      .select(`
        id,
        title,
        status,
        course_id,
        created_at
      `)
      .eq('id', quizId)
      .single();
    
    if (quizError) {
      console.log('❌ Error fetching quiz:', quizError.message);
    } else {
      console.log('✅ Quiz found:');
      console.log(`   Title: ${quiz.title}`);
      console.log(`   Status: ${quiz.status}`);
      console.log(`   Course ID: ${quiz.course_id}`);
      
      if (quiz.status !== 'published' && quiz.status !== 'closed') {
        console.log('❌ QUIZ NOT PUBLISHED! Students cannot see questions.');
        console.log('💡 Fix: Update quiz status to "published"');
        console.log(`   SQL: UPDATE quizzes SET status = 'published' WHERE id = '${quizId}';`);
      }
    }
    
    // ===========================================
    // STEP 3: CHECK COURSE ENROLLMENTS
    // ===========================================
    console.log('\n3️⃣ CHECKING COURSE ENROLLMENTS...');
    
    const { data: enrollments, error: enrollmentsError } = await clientToUse
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
      .eq('course_id', quiz.course_id);
    
    if (enrollmentsError) {
      console.log('❌ Error fetching enrollments:', enrollmentsError.message);
    } else {
      console.log(`📊 Total enrollments for course: ${enrollments?.length || 0}`);
      
      const approvedEnrollments = enrollments?.filter(e => e.status === 'approved') || [];
      console.log(`✅ Approved enrollments: ${approvedEnrollments.length}`);
      
      if (approvedEnrollments.length > 0) {
        console.log('👥 Approved students:');
        approvedEnrollments.forEach((e, index) => {
          console.log(`   ${index + 1}. ${e.profiles.full_name} (${e.profiles.email}) - ${e.profiles.role}`);
        });
      } else {
        console.log('❌ NO APPROVED ENROLLMENTS! Students cannot access quiz.');
        console.log('💡 Fix: Approve student enrollments');
      }
    }
    
    // ===========================================
    // STEP 4: TEST STUDENT ACCESS (WITH ANON KEY)
    // ===========================================
    console.log('\n4️⃣ TESTING STUDENT ACCESS (WITH ANON KEY)...');
    
    const { data: studentQuestions, error: studentError } = await supabase
      .from('quiz_questions')
      .select(`
        id,
        quiz_id,
        question,
        type,
        points,
        order_index
      `)
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true });
    
    if (studentError) {
      console.log('❌ Student access blocked:', studentError.message);
      console.log('💡 This indicates RLS policy is blocking access');
    } else {
      console.log(`✅ Student access successful: ${studentQuestions?.length || 0} questions`);
      
      if (studentQuestions && studentQuestions.length === 0) {
        console.log('❌ Student can access table but finds 0 questions');
        console.log('💡 This means RLS is filtering out all questions');
      } else {
        console.log('✅ Student can see questions:');
        studentQuestions.forEach((q, index) => {
          console.log(`   ${index + 1}. ${q.question} (${q.type}) - ${q.points} points`);
        });
      }
    }
    
    // ===========================================
    // STEP 5: CHECK RLS POLICIES
    // ===========================================
    console.log('\n5️⃣ CHECKING RLS POLICIES...');
    
    if (adminSupabase) {
      const { data: policies, error: policiesError } = await adminSupabase
        .from('pg_policies')
        .select('*')
        .in('tablename', ['quiz_questions'])
        .order('policyname');
      
      if (policiesError) {
        console.log('❌ Error checking policies:', policiesError.message);
      } else {
        console.log(`📋 Found ${policies?.length || 0} RLS policies for quiz_questions`);
        
        if (policies && policies.length > 0) {
          console.log('📝 Active policies:');
          policies.forEach(policy => {
            console.log(`   - ${policy.policyname} (${policy.cmd})`);
          });
        } else {
          console.log('❌ NO RLS POLICIES FOUND! This is the problem.');
          console.log('💡 Fix: Run the comprehensive_quiz_rls_policies.sql script');
        }
      }
    } else {
      console.log('⚠️  Cannot check RLS policies without service role key');
    }
    
    // ===========================================
    // STEP 6: TEST SPECIFIC RLS CONDITIONS
    // ===========================================
    console.log('\n6️⃣ TESTING SPECIFIC RLS CONDITIONS...');
    
    // Test if we can access the quiz through the proper join
    const { data: joinedData, error: joinedError } = await supabase
      .from('quiz_questions')
      .select(`
        id,
        question,
        type,
        points,
        quizzes!inner(
          id,
          title,
          status,
          courses!inner(
            id,
            title,
            enrollments!inner(
              student_id,
              status
            )
          )
        )
      `)
      .eq('quiz_id', quizId);
    
    if (joinedError) {
      console.log('❌ Join query failed:', joinedError.message);
      console.log('💡 This suggests RLS policy conditions are not met');
    } else {
      console.log(`✅ Join query successful: ${joinedData?.length || 0} questions`);
    }
    
    // ===========================================
    // STEP 7: DIAGNOSIS AND FIXES
    // ===========================================
    console.log('\n📋 DIAGNOSIS SUMMARY:');
    console.log('=====================');
    console.log(`✅ Questions in DB: ${rawQuestions?.length || 0}`);
    console.log(`✅ Quiz status: ${quiz?.status}`);
    console.log(`✅ Approved enrollments: ${enrollments?.filter(e => e.status === 'approved').length || 0}`);
    console.log(`✅ Student access: ${studentQuestions?.length || 0}`);
    console.log(`✅ Join query: ${joinedData?.length || 0}`);
    
    console.log('\n🔧 IMMEDIATE FIXES NEEDED:');
    console.log('==========================');
    
    if (!rawQuestions || rawQuestions.length === 0) {
      console.log('1. ❌ NO QUESTIONS IN DATABASE');
      console.log('   → Add questions to the quiz');
      console.log('   → Check if the add questions operation actually succeeded');
    }
    
    if (quiz?.status !== 'published' && quiz?.status !== 'closed') {
      console.log('2. ❌ QUIZ NOT PUBLISHED');
      console.log('   → Update quiz status to published');
      console.log(`   → SQL: UPDATE quizzes SET status = 'published' WHERE id = '${quizId}';`);
    }
    
    if (!enrollments?.some(e => e.status === 'approved')) {
      console.log('3. ❌ NO APPROVED ENROLLMENTS');
      console.log('   → Approve student enrollments');
      console.log(`   → SQL: UPDATE enrollments SET status = 'approved' WHERE course_id = '${quiz.course_id}';`);
    }
    
    if (studentQuestions?.length === 0 && rawQuestions?.length > 0) {
      console.log('4. ❌ RLS POLICY BLOCKING ACCESS');
      console.log('   → Apply the comprehensive RLS policies');
      console.log('   → Run: comprehensive_quiz_rls_policies.sql');
    }
    
    if (studentError) {
      console.log('5. ❌ RLS POLICY ERROR');
      console.log('   → Check RLS policy syntax');
      console.log('   → Verify user roles in profiles table');
    }
    
    return {
      rawQuestions,
      quiz,
      enrollments,
      studentQuestions,
      joinedData,
      hasQuestions: (rawQuestions?.length || 0) > 0,
      isPublished: quiz?.status === 'published' || quiz?.status === 'closed',
      hasApprovedEnrollments: enrollments?.some(e => e.status === 'approved') || false,
      studentCanAccess: (studentQuestions?.length || 0) > 0,
      hasRLSError: !!studentError
    };
    
  } catch (error) {
    console.error('\n❌ DEBUG FAILED:', error.message);
    throw error;
  }
}

// Run the debug
console.log('Starting "No Questions Available" debug...\n');

debugNoQuestionsIssue()
  .then((result) => {
    console.log('\n✅ Debug completed successfully!');
    
    if (!result.hasQuestions) {
      console.log('🎯 MAIN ISSUE: No questions in database - add questions first');
    } else if (!result.isPublished) {
      console.log('🎯 MAIN ISSUE: Quiz not published - publish the quiz');
    } else if (!result.hasApprovedEnrollments) {
      console.log('🎯 MAIN ISSUE: No approved enrollments - approve student enrollments');
    } else if (!result.studentCanAccess) {
      console.log('🎯 MAIN ISSUE: RLS policy blocking access - apply RLS policies');
    } else if (result.hasRLSError) {
      console.log('🎯 MAIN ISSUE: RLS policy error - fix policy syntax');
    } else {
      console.log('🎯 All checks passed - issue should be resolved');
    }
    
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Debug failed:', error.message);
    process.exit(1);
  });
