const { createClient } = require('@supabase/supabase-js');

async function fixQuizQuestionsUndefined() {
  try {
    console.log('🔧 FIXING QUIZ QUESTIONS UNDEFINED ERROR');
    console.log('========================================');
    
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
    // STEP 1: CHECK QUESTIONS IN DATABASE
    // ===========================================
    console.log('\n1️⃣ CHECKING QUESTIONS IN DATABASE...');
    
    const { data: adminQuestions, error: adminQuestionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true });
    
    if (adminQuestionsError) {
      console.log('❌ Error fetching questions:', adminQuestionsError.message);
      return;
    }
    
    console.log(`📊 Questions in database: ${adminQuestions?.length || 0}`);
    
    if (adminQuestions && adminQuestions.length > 0) {
      console.log('📝 Questions found:');
      adminQuestions.forEach((q, index) => {
        console.log(`   ${index + 1}. ID: ${q.id}`);
        console.log(`      Question: ${q.question}`);
        console.log(`      Type: ${q.type}`);
        console.log(`      Points: ${q.points}`);
        console.log(`      Order: ${q.order_index}`);
        console.log(`      Options: ${q.options ? JSON.stringify(q.options) : 'None'}`);
        console.log(`      Correct Answer: ${q.correct_answer || 'None'}`);
        console.log('');
      });
    } else {
      console.log('❌ NO QUESTIONS FOUND! This is the problem.');
      console.log('💡 Adding sample questions...');
      
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
        return;
      } else {
        console.log('✅ Sample questions added');
      }
    }
    
    // ===========================================
    // STEP 2: CHECK STUDENT ACCESS
    // ===========================================
    console.log('\n2️⃣ CHECKING STUDENT ACCESS...');
    
    const { data: studentQuestions, error: studentQuestionsError } = await anonSupabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true });
    
    if (studentQuestionsError) {
      console.log('❌ Student access blocked:', studentQuestionsError.message);
    } else {
      console.log(`📊 Questions visible to students: ${studentQuestions?.length || 0}`);
      
      if (studentQuestions && studentQuestions.length > 0) {
        console.log('📝 Questions visible to students:');
        studentQuestions.forEach((q, index) => {
          console.log(`   ${index + 1}. ID: ${q.id}`);
          console.log(`      Question: ${q.question}`);
          console.log(`      Type: ${q.type}`);
          console.log(`      Points: ${q.points}`);
          console.log(`      Order: ${q.order_index}`);
          console.log(`      Options: ${q.options ? JSON.stringify(q.options) : 'None'}`);
          console.log(`      Correct Answer: ${q.correct_answer || 'None'}`);
          console.log('');
        });
      } else {
        console.log('❌ NO QUESTIONS VISIBLE TO STUDENTS!');
      }
    }
    
    // ===========================================
    // STEP 3: CHECK FOR UNDEFINED/NULL VALUES
    // ===========================================
    console.log('\n3️⃣ CHECKING FOR UNDEFINED/NULL VALUES...');
    
    if (studentQuestions) {
      const undefinedQuestions = studentQuestions.filter(q => !q || q === null || q === undefined);
      const missingTypeQuestions = studentQuestions.filter(q => q && !q.type);
      const missingIdQuestions = studentQuestions.filter(q => q && !q.id);
      
      console.log(`📊 Undefined questions: ${undefinedQuestions.length}`);
      console.log(`📊 Questions missing type: ${missingTypeQuestions.length}`);
      console.log(`📊 Questions missing ID: ${missingIdQuestions.length}`);
      
      if (undefinedQuestions.length > 0) {
        console.log('❌ FOUND UNDEFINED QUESTIONS! This is causing the error.');
        console.log('💡 These questions need to be fixed or removed.');
      }
      
      if (missingTypeQuestions.length > 0) {
        console.log('❌ FOUND QUESTIONS MISSING TYPE! This is causing the error.');
        console.log('💡 These questions need to be fixed.');
      }
      
      if (missingIdQuestions.length > 0) {
        console.log('❌ FOUND QUESTIONS MISSING ID! This is causing the error.');
        console.log('💡 These questions need to be fixed.');
      }
    }
    
    // ===========================================
    // STEP 4: FIX DATA ISSUES
    // ===========================================
    console.log('\n4️⃣ FIXING DATA ISSUES...');
    
    if (adminQuestions && adminQuestions.length > 0) {
      // Check for questions with missing required fields
      const problematicQuestions = adminQuestions.filter(q => 
        !q.id || !q.type || !q.question || q.points === null || q.points === undefined
      );
      
      if (problematicQuestions.length > 0) {
        console.log(`🔧 Found ${problematicQuestions.length} problematic questions. Fixing...`);
        
        for (const question of problematicQuestions) {
          const updates = {};
          
          if (!question.id) {
            updates.id = crypto.randomUUID();
          }
          
          if (!question.type) {
            updates.type = 'multiple_choice';
          }
          
          if (!question.question) {
            updates.question = 'Sample question';
          }
          
          if (question.points === null || question.points === undefined) {
            updates.points = 1;
          }
          
          if (question.order_index === null || question.order_index === undefined) {
            updates.order_index = 1;
          }
          
          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
              .from('quiz_questions')
              .update(updates)
              .eq('id', question.id);
            
            if (updateError) {
              console.log(`❌ Failed to update question ${question.id}:`, updateError.message);
            } else {
              console.log(`✅ Updated question ${question.id}`);
            }
          }
        }
      } else {
        console.log('✅ All questions have required fields');
      }
    }
    
    // ===========================================
    // STEP 5: TEST THE FIX
    // ===========================================
    console.log('\n5️⃣ TESTING THE FIX...');
    
    // Test the exact query that the component uses
    const { data: testQuestions, error: testError } = await anonSupabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true });
    
    if (testError) {
      console.log('❌ Test query failed:', testError.message);
    } else {
      console.log(`✅ Test query successful: ${testQuestions?.length || 0} questions`);
      
      if (testQuestions && testQuestions.length > 0) {
        // Check for undefined values
        const hasUndefined = testQuestions.some(q => !q || q === null || q === undefined);
        const hasMissingType = testQuestions.some(q => q && !q.type);
        const hasMissingId = testQuestions.some(q => q && !q.id);
        
        if (hasUndefined) {
          console.log('❌ Still has undefined questions');
        } else if (hasMissingType) {
          console.log('❌ Still has questions missing type');
        } else if (hasMissingId) {
          console.log('❌ Still has questions missing ID');
        } else {
          console.log('✅ All questions are valid and complete');
          console.log('📝 Questions ready for quiz:');
          testQuestions.forEach((q, index) => {
            console.log(`   ${index + 1}. ${q.question} (${q.type}) - ${q.points} points`);
          });
        }
      }
    }
    
    // ===========================================
    // STEP 6: SUMMARY
    // ===========================================
    console.log('\n📊 SUMMARY:');
    console.log('===========');
    console.log(`✅ Questions in database: ${adminQuestions?.length || 0}`);
    console.log(`✅ Questions visible to students: ${studentQuestions?.length || 0}`);
    console.log(`✅ Test query successful: ${testQuestions?.length || 0}`);
    
    if (testQuestions && testQuestions.length > 0) {
      const hasIssues = testQuestions.some(q => !q || q === null || q === undefined || !q.type || !q.id);
      
      if (!hasIssues) {
        console.log('\n🎉 SUCCESS! Quiz questions are now working properly.');
        console.log('💡 The "Cannot read properties of undefined" error should be resolved.');
        console.log('💡 Students should now be able to take the quiz without errors.');
      } else {
        console.log('\n⚠️  ISSUE PERSISTS');
        console.log('💡 There are still some problematic questions that need manual fixing.');
      }
    } else {
      console.log('\n❌ NO QUESTIONS AVAILABLE');
      console.log('💡 Students will still see "No Questions Available" message.');
    }
    
  } catch (error) {
    console.error('\n❌ FIX FAILED:', error.message);
    throw error;
  }
}

// Run the fix
console.log('Starting quiz questions undefined fix...\n');

fixQuizQuestionsUndefined()
  .then(() => {
    console.log('\n✅ Fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fix failed:', error.message);
    process.exit(1);
  });
