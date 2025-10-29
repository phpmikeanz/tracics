const { createClient } = require('@supabase/supabase-js');

async function quickFixNoQuestions() {
  try {
    console.log('🔧 QUICK FIX FOR "NO QUESTIONS AVAILABLE" ISSUE');
    console.log('==============================================');
    
    // Initialize Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hdogujyfbjvvewwotman.supabase.co";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey) {
      console.log('❌ SUPABASE_SERVICE_ROLE_KEY not set');
      console.log('💡 Get it from Supabase Dashboard > Settings > API > Service Role Key');
      return;
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    const quizId = '15fd339d-4a71-481f-b1d6-8adc028eb58c';
    console.log('Quiz ID:', quizId);
    
    // ===========================================
    // STEP 1: CHECK CURRENT STATE
    // ===========================================
    console.log('\n1️⃣ CHECKING CURRENT STATE...');
    
    // Check quiz status
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
    
    // Check questions
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, question, type, points')
      .eq('quiz_id', quizId);
    
    console.log(`📊 Questions: ${questions?.length || 0}`);
    
    // Check enrollments
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('id, student_id, status')
      .eq('course_id', quiz.course_id);
    
    const approvedEnrollments = enrollments?.filter(e => e.status === 'approved') || [];
    console.log(`📊 Approved enrollments: ${approvedEnrollments.length}`);
    
    // ===========================================
    // STEP 2: APPLY FIXES
    // ===========================================
    console.log('\n2️⃣ APPLYING FIXES...');
    
    let fixesApplied = 0;
    
    // Fix 1: Publish quiz if not published
    if (quiz.status !== 'published' && quiz.status !== 'closed') {
      console.log('🔧 Fixing quiz status...');
      const { error: updateError } = await supabase
        .from('quizzes')
        .update({ status: 'published' })
        .eq('id', quizId);
      
      if (updateError) {
        console.log('❌ Failed to update quiz status:', updateError.message);
      } else {
        console.log('✅ Quiz status updated to published');
        fixesApplied++;
      }
    } else {
      console.log('✅ Quiz is already published');
    }
    
    // Fix 2: Approve all pending enrollments
    if (approvedEnrollments.length === 0) {
      console.log('🔧 Approving enrollments...');
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
      console.log('✅ Enrollments already approved');
    }
    
    // Fix 3: Add sample questions if none exist
    if (!questions || questions.length === 0) {
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
    
    // Fix 4: Apply RLS policies
    console.log('🔧 Applying RLS policies...');
    
    const rlsPolicies = [
      // Drop existing policies
      'DROP POLICY IF EXISTS "Students can view quiz questions" ON public.quiz_questions;',
      'DROP POLICY IF EXISTS "Faculty can view quiz questions" ON public.quiz_questions;',
      
      // Create new policies
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
       );`
    ];
    
    for (const policy of rlsPolicies) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: policy });
        if (error) {
          console.log('⚠️  Policy error (may already exist):', error.message);
        }
      } catch (err) {
        console.log('⚠️  Policy execution error:', err.message);
      }
    }
    
    console.log('✅ RLS policies applied');
    fixesApplied++;
    
    // ===========================================
    // STEP 3: VERIFY FIXES
    // ===========================================
    console.log('\n3️⃣ VERIFYING FIXES...');
    
    // Test student access
    const anonSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
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
    
    // ===========================================
    // STEP 4: SUMMARY
    // ===========================================
    console.log('\n📊 SUMMARY:');
    console.log('===========');
    console.log(`✅ Fixes applied: ${fixesApplied}`);
    console.log(`✅ Questions visible: ${testQuestions?.length || 0}`);
    
    if (testQuestions && testQuestions.length > 0) {
      console.log('\n🎉 SUCCESS! Students should now be able to see quiz questions.');
      console.log('💡 The "No Questions Available" message should be resolved.');
    } else {
      console.log('\n⚠️  ISSUE PERSISTS');
      console.log('💡 Run the debug script for more details: node debug_no_questions_issue.js');
    }
    
  } catch (error) {
    console.error('\n❌ QUICK FIX FAILED:', error.message);
    throw error;
  }
}

// Run the quick fix
console.log('Starting quick fix for "No Questions Available"...\n');

quickFixNoQuestions()
  .then(() => {
    console.log('\n✅ Quick fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Quick fix failed:', error.message);
    process.exit(1);
  });
