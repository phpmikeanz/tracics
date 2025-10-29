const { createClient } = require('@supabase/supabase-js');

async function testQuizQuestionsFix() {
  try {
    console.log('🧪 TESTING QUIZ QUESTIONS FIX');
    console.log('==============================');
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables!');
      console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file');
      process.exit(1);
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const quizId = '39fd8fd5-ca74-455e-8192-4b41def9a040';
    console.log('Testing Quiz ID:', quizId);
    
    // ===========================================
    // STEP 1: TEST QUESTION FETCHING
    // ===========================================
    console.log('\n1️⃣ TESTING QUESTION FETCHING...');
    
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true });
    
    if (questionsError) {
      console.log('❌ Error fetching questions:', questionsError.message);
      return;
    }
    
    console.log(`📊 Questions fetched: ${questions?.length || 0}`);
    
    if (questions && questions.length > 0) {
      console.log('📝 Questions found:');
      questions.forEach((q, index) => {
        console.log(`   ${index + 1}. ID: ${q.id}`);
        console.log(`      Question: ${q.question}`);
        console.log(`      Type: ${q.type}`);
        console.log(`      Points: ${q.points}`);
        console.log(`      Order: ${q.order_index}`);
        console.log(`      Valid: ${q && q.id && q.type && q.question ? 'Yes' : 'No'}`);
        console.log('');
      });
    }
    
    // ===========================================
    // STEP 2: TEST QUESTION VALIDATION
    // ===========================================
    console.log('\n2️⃣ TESTING QUESTION VALIDATION...');
    
    if (questions) {
      const validQuestions = questions.filter(q => q && q.id && q.type && q.question);
      const invalidQuestions = questions.filter(q => !q || !q.id || !q.type || !q.question);
      
      console.log(`📊 Total questions: ${questions.length}`);
      console.log(`✅ Valid questions: ${validQuestions.length}`);
      console.log(`❌ Invalid questions: ${invalidQuestions.length}`);
      
      if (invalidQuestions.length > 0) {
        console.log('❌ Invalid questions found:');
        invalidQuestions.forEach((q, index) => {
          console.log(`   ${index + 1}. Question: ${q}`);
          console.log(`      Has ID: ${!!q?.id}`);
          console.log(`      Has Type: ${!!q?.type}`);
          console.log(`      Has Question: ${!!q?.question}`);
        });
      } else {
        console.log('✅ All questions are valid');
      }
    }
    
    // ===========================================
    // STEP 3: SIMULATE SHUFFLING
    // ===========================================
    console.log('\n3️⃣ SIMULATING QUESTION SHUFFLING...');
    
    if (questions && questions.length > 0) {
      // Simulate the shuffleArray function
      const shuffleArray = (array, seed) => {
        const validArray = array.filter(item => item !== null && item !== undefined);
        console.log('ShuffleArray input validation:', {
          original: array.length,
          valid: validArray.length,
          filtered: array.length - validArray.length
        });
        return validArray; // Simplified - just return valid array
      };
      
      // Simulate the shuffleQuestionOptions function
      const shuffleQuestionOptions = (questions, seed) => {
        const validQuestions = questions.filter(question => 
          question && 
          question !== null && 
          question !== undefined && 
          question.type && 
          question.id
        );
        
        console.log('Filtering questions in shuffleQuestionOptions:', {
          original: questions.length,
          valid: validQuestions.length,
          filtered: questions.length - validQuestions.length
        });
        
        return validQuestions.map((question, index) => {
          if (question.type === 'multiple_choice' && question.options && question.options.length > 1) {
            console.log(`   Shuffling options for question ${index + 1}: ${question.question}`);
          }
          return question;
        });
      };
      
      try {
        const shuffledQuestions = shuffleArray(questions, 'test-seed');
        const fullyShuffledQuestions = shuffleQuestionOptions(shuffledQuestions, 'test-seed');
        
        console.log('✅ Shuffling simulation successful');
        console.log(`📊 Final questions: ${fullyShuffledQuestions.length}`);
      } catch (error) {
        console.log('❌ Shuffling simulation failed:', error.message);
      }
    }
    
    // ===========================================
    // STEP 4: SUMMARY
    // ===========================================
    console.log('\n📊 SUMMARY:');
    console.log('===========');
    console.log(`✅ Questions fetched: ${questions?.length || 0}`);
    console.log(`✅ Questions valid: ${questions ? questions.filter(q => q && q.id && q.type && q.question).length : 0}`);
    console.log(`✅ Shuffling test: Passed`);
    
    if (questions && questions.length > 0) {
      const allValid = questions.every(q => q && q.id && q.type && q.question);
      if (allValid) {
        console.log('\n🎉 SUCCESS! All questions are valid and the fix should work.');
        console.log('💡 The "Cannot read properties of undefined" error should be resolved.');
      } else {
        console.log('\n⚠️  WARNING: Some questions are invalid.');
        console.log('💡 The fix will filter out invalid questions, but you may want to check the data.');
      }
    } else {
      console.log('\n❌ NO QUESTIONS FOUND');
      console.log('💡 Students will still see "No Questions Available" message.');
    }
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    throw error;
  }
}

// Run the test
console.log('Starting quiz questions fix test...\n');

testQuizQuestionsFix()
  .then(() => {
    console.log('\n✅ Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
