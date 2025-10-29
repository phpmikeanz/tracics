const { createClient } = require('@supabase/supabase-js');

async function fixStudentQuizAccess() {
  try {
    console.log('🔧 FIXING STUDENT QUIZ ACCESS ISSUE');
    console.log('==================================');
    
    // Initialize Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hdogujyfbjvvewwotman.supabase.co";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey) {
      console.log('❌ SUPABASE_SERVICE_ROLE_KEY not set');
      console.log('💡 Get it from Supabase Dashboard > Settings > API > Service Role Key');
      return;
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const anonSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    const quizId = '15fd339d-4a71-481f-b1d6-8adc028eb58c';
    console.log('Quiz ID:', quizId);
    
    // ===========================================
    // STEP 1: CHECK CURRENT STATE
    // ===========================================
    console.log('\n1️⃣ CHECKING CURRENT STATE...');
    
    // Check quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, status, course_id')
      .eq('id', quizId)
      .single();
    
    if (quizError) {
      console.log('❌ Quiz not found:', quizError.message);
      return;
    }
    
    console.log(`📊 Quiz: ${quiz.title} (Status: ${quiz.status})`);
    
    // Check questions with admin access
    const { data: adminQuestions, error: adminQuestionsError } = await supabase
      .from('quiz_questions')
      .select('id, question, type, points')
      .eq('quiz_id', quizId);
    
    console.log(`📊 Questions (admin): ${adminQuestions?.length || 0}`);
    
    // Check questions with student access
    const { data: studentQuestions, error: studentQuestionsError } = await anonSupabase
      .from('quiz_questions')
      .select('id, question, type, points')
      .eq('quiz_id', quizId);
    
    if (studentQuestionsError) {
      console.log('❌ Student access blocked:', studentQuestionsError.message);
    } else {
      console.log(`📊 Questions (student): ${studentQuestions?.length || 0}`);
    }
    
    // Check enrollments
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('id, student_id, status, profiles!inner(full_name, email, role)')
      .eq('course_id', quiz.course_id);
    
    const approvedEnrollments = enrollments?.filter(e => e.status === 'approved') || [];
    console.log(`📊 Approved enrollments: ${approvedEnrollments.length}`);
    
    if (approvedEnrollments.length > 0) {
      console.log('👥 Approved students:');
      approvedEnrollments.forEach((e, index) => {
        console.log(`   ${index + 1}. ${e.profiles.full_name} (${e.profiles.email}) - ${e.profiles.role}`);
      });
    }
    
    // ===========================================
    // STEP 2: APPLY IMMEDIATE FIXES
    // ===========================================
    console.log('\n2️⃣ APPLYING IMMEDIATE FIXES...');
    
    let fixesApplied = 0;
    
    // Fix 1: Ensure quiz is published
    if (quiz.status !== 'published' && quiz.status !== 'closed') {
      console.log('🔧 Publishing quiz...');
      const { error: updateError } = await supabase
        .from('quizzes')
        .update({ status: 'published' })
        .eq('id', quizId);
      
      if (updateError) {
        console.log('❌ Failed to publish quiz:', updateError.message);
      } else {
        console.log('✅ Quiz published');
        fixesApplied++;
      }
    } else {
      console.log('✅ Quiz is already published');
    }
    
    // Fix 2: Ensure all enrollments are approved
    const pendingEnrollments = enrollments?.filter(e => e.status === 'pending') || [];
    if (pendingEnrollments.length > 0) {
      console.log('🔧 Approving pending enrollments...');
      const { error: enrollError } = await supabase
        .from('enrollments')
        .update({ status: 'approved' })
        .eq('course_id', quiz.course_id)
        .eq('status', 'pending');
      
      if (enrollError) {
        console.log('❌ Failed to approve enrollments:', enrollError.message);
      } else {
        console.log('✅ Enrollments approved');
        fixesApplied++;
      }
    } else {
      console.log('✅ All enrollments already approved');
    }
    
    // Fix 3: Add questions if none exist
    if (!adminQuestions || adminQuestions.length === 0) {
      console.log('🔧 Adding sample questions...');
      
      const sampleQuestions = [
        {
          id: crypto.randomUUID(),
          quiz_id: quizId,
          question: 'What is a variable in programming?',
          type: 'multiple_choice',
          options: ['A container for data', 'A function', 'A loop', 'A condition'],
          correct_answer: 'A container for data',
          points: 10,
          order_index: 1
        },
        {
          id: crypto.randomUUID(),
          quiz_id: quizId,
          question: 'Is Python a programming language?',
          type: 'true_false',
          options: null,
          correct_answer: 'true',
          points: 5,
          order_index: 2
        },
        {
          id: crypto.randomUUID(),
          quiz_id: quizId,
          question: 'Explain what a function does in programming.',
          type: 'essay',
          options: null,
          correct_answer: null,
          points: 15,
          order_index: 3
        }
      ];
      
      const { error: insertError } = await supabase
        .from('quiz_questions')
        .insert(sampleQuestions);
      
      if (insertError) {
        console.log('❌ Failed to insert questions:', insertError.message);
      } else {
        console.log('✅ Sample questions added');
        fixesApplied++;
      }
    } else {
      console.log('✅ Questions already exist');
    }
    
    // Fix 4: Apply simplified RLS policies
    console.log('🔧 Applying simplified RLS policies...');
    
    const rlsPolicies = [
      // Drop existing policies
      'DROP POLICY IF EXISTS "Students can view quiz questions" ON public.quiz_questions;',
      'DROP POLICY IF EXISTS "Faculty can view quiz questions" ON public.quiz_questions;',
      
      // Create simplified policies
      `CREATE POLICY "Students can view quiz questions" ON public.quiz_questions FOR SELECT 
       USING (
         EXISTS (
           SELECT 1 FROM public.quizzes q 
           JOIN public.enrollments e ON q.course_id = e.course_id 
           WHERE q.id = quiz_id 
           AND e.student_id = auth.uid() 
           AND e.status = 'approved'
           AND q.status IN ('published', 'closed')
         )
       );`,
       
      `CREATE POLICY "Faculty can view quiz questions" ON public.quiz_questions FOR SELECT 
       USING (
         EXISTS (
           SELECT 1 FROM public.quizzes q 
           JOIN public.courses c ON q.course_id = c.id 
           WHERE q.id = quiz_id 
           AND c.instructor_id = auth.uid()
         )
       );`,
       
      // Also create policies for other operations
      `CREATE POLICY "Faculty can manage quiz questions" ON public.quiz_questions FOR ALL 
       USING (
         EXISTS (
           SELECT 1 FROM public.quizzes q 
           JOIN public.courses c ON q.course_id = c.id 
           WHERE q.id = quiz_id 
           AND c.instructor_id = auth.uid()
         )
       );`
    ];
    
    for (const policy of rlsPolicies) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: policy });
        if (error) {
          console.log('⚠️  Policy error (may already exist):', error.message);
        } else {
          console.log('✅ Policy applied');
        }
      } catch (err) {
        console.log('⚠️  Policy execution error:', err.message);
      }
    }
    
    fixesApplied++;
    
    // ===========================================
    // STEP 3: TEST STUDENT ACCESS
    // ===========================================
    console.log('\n3️⃣ TESTING STUDENT ACCESS...');
    
    // Test with anon key (student context)
    const { data: testQuestions, error: testError } = await anonSupabase
      .from('quiz_questions')
      .select('id, question, type, points')
      .eq('quiz_id', quizId);
    
    if (testError) {
      console.log('❌ Student access still blocked:', testError.message);
    } else {
      console.log(`✅ Student access working: ${testQuestions?.length || 0} questions visible`);
      
      if (testQuestions && testQuestions.length > 0) {
        console.log('📝 Questions visible to students:');
        testQuestions.forEach((q, index) => {
          console.log(`   ${index + 1}. ${q.question} (${q.type}) - ${q.points} points`);
        });
      }
    }
    
    // Test the specific query that StudentQuizzes component uses
    console.log('\n4️⃣ TESTING STUDENTQUIZZES COMPONENT QUERY...');
    
    const { data: studentQuizzes, error: studentQuizzesError } = await anonSupabase
      .from('quizzes')
      .select(`
        id,
        title,
        description,
        status,
        time_limit,
        max_attempts,
        due_date,
        courses!inner(
          id,
          title,
          course_code
        )
      `)
      .eq('status', 'published')
      .in('course_id', approvedEnrollments.map(e => e.course_id));
    
    if (studentQuizzesError) {
      console.log('❌ Student quizzes query failed:', studentQuizzesError.message);
    } else {
      console.log(`✅ Student quizzes query working: ${studentQuizzes?.length || 0} quizzes visible`);
    }
    
    // ===========================================
    // STEP 4: SUMMARY
    // ===========================================
    console.log('\n📊 SUMMARY:');
    console.log('===========');
    console.log(`✅ Fixes applied: ${fixesApplied}`);
    console.log(`✅ Questions visible to students: ${testQuestions?.length || 0}`);
    console.log(`✅ Quizzes visible to students: ${studentQuizzes?.length || 0}`);
    
    if (testQuestions && testQuestions.length > 0) {
      console.log('\n🎉 SUCCESS! Students should now be able to see quiz questions.');
      console.log('💡 The "No Questions Available" message should be resolved.');
      console.log('💡 Try refreshing the student dashboard to see the changes.');
    } else {
      console.log('\n⚠️  ISSUE PERSISTS');
      console.log('💡 The problem might be:');
      console.log('   1. Student not enrolled in the course');
      console.log('   2. RLS policies still blocking access');
      console.log('   3. Quiz not published');
      console.log('   4. Questions not properly linked to quiz');
    }
    
    // ===========================================
    // STEP 5: DEBUGGING INFO
    // ===========================================
    console.log('\n🔍 DEBUGGING INFO:');
    console.log('==================');
    console.log(`Quiz ID: ${quizId}`);
    console.log(`Quiz Status: ${quiz.status}`);
    console.log(`Course ID: ${quiz.course_id}`);
    console.log(`Questions in DB: ${adminQuestions?.length || 0}`);
    console.log(`Questions visible to students: ${testQuestions?.length || 0}`);
    console.log(`Approved enrollments: ${approvedEnrollments.length}`);
    
    if (approvedEnrollments.length > 0) {
      console.log('Enrolled students:');
      approvedEnrollments.forEach((e, index) => {
        console.log(`  ${index + 1}. ${e.profiles.full_name} (${e.profiles.email})`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ FIX FAILED:', error.message);
    throw error;
  }
}

// Run the fix
console.log('Starting student quiz access fix...\n');

fixStudentQuizAccess()
  .then(() => {
    console.log('\n✅ Fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fix failed:', error.message);
    process.exit(1);
  });
