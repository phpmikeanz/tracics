// Comprehensive test to check all quiz questions access
// Run this in browser console while on a quiz page

console.log('=== COMPREHENSIVE QUIZ QUESTIONS TEST ===');

async function testAllQuizQuestions() {
  try {
    // Get quiz ID from URL
    const quizId = window.location.pathname.split('/').pop();
    console.log('Testing quiz ID:', quizId);
    
    if (!quizId || !window.location.pathname.includes('/quiz/')) {
      console.error('Not on a quiz page. Please navigate to a quiz first.');
      return;
    }
    
    // Import required functions
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    // Test 1: Check current user and role
    console.log('\n=== TEST 1: USER INFO ===');
    const { data: { user } } = await supabase.auth.getUser();
    console.log('User ID:', user?.id);
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();
    console.log('User profile:', profile);
    
    // Test 2: Check quiz access
    console.log('\n=== TEST 2: QUIZ ACCESS ===');
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, status, course_id')
      .eq('id', quizId)
      .single();
    
    console.log('Quiz data:', quizData);
    console.log('Quiz error:', quizError);
    
    // Test 3: Check enrollment
    console.log('\n=== TEST 3: ENROLLMENT CHECK ===');
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('course_id, status')
      .eq('student_id', user.id)
      .eq('course_id', quizData?.course_id);
    
    console.log('Enrollment for this course:', enrollment);
    
    // Test 4: Direct quiz questions query (bypassing RLS)
    console.log('\n=== TEST 4: DIRECT QUIZ QUESTIONS QUERY ===');
    const { data: allQuestions, error: allQuestionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId);
    
    console.log('All questions (direct query):', allQuestions);
    console.log('All questions error:', allQuestionsError);
    console.log('Total questions found:', allQuestions?.length || 0);
    
    // Test 5: Questions with order_index
    console.log('\n=== TEST 5: ORDERED QUESTIONS ===');
    const { data: orderedQuestions, error: orderedError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true });
    
    console.log('Ordered questions:', orderedQuestions);
    console.log('Ordered questions error:', orderedError);
    console.log('Ordered questions count:', orderedQuestions?.length || 0);
    
    // Test 6: Questions without order_index
    console.log('\n=== TEST 6: UNORDERED QUESTIONS ===');
    const { data: unorderedQuestions, error: unorderedError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId);
    
    console.log('Unordered questions:', unorderedQuestions);
    console.log('Unordered questions error:', unorderedError);
    console.log('Unordered questions count:', unorderedQuestions?.length || 0);
    
    // Test 7: Check question details
    if (allQuestions && allQuestions.length > 0) {
      console.log('\n=== TEST 7: QUESTION DETAILS ===');
      allQuestions.forEach((q, index) => {
        console.log(`Question ${index + 1}:`, {
          id: q.id,
          type: q.type,
          question: q.question?.substring(0, 100) + '...',
          hasOptions: !!q.options,
          optionsCount: q.options?.length || 0,
          points: q.points,
          orderIndex: q.order_index,
          correctAnswer: q.correct_answer,
          createdAt: q.created_at
        });
      });
    }
    
    // Test 8: Compare with getQuizQuestions function
    console.log('\n=== TEST 8: COMPARE WITH getQuizQuestions FUNCTION ===');
    const { getQuizQuestions } = await import('/lib/quizzes.js');
    const functionQuestions = await getQuizQuestions(quizId);
    
    console.log('Questions from getQuizQuestions function:', functionQuestions);
    console.log('Function questions count:', functionQuestions?.length || 0);
    
    // Compare results
    if (allQuestions && functionQuestions) {
      console.log('\n=== COMPARISON RESULTS ===');
      console.log('Direct query count:', allQuestions.length);
      console.log('Function query count:', functionQuestions.length);
      console.log('Difference:', allQuestions.length - functionQuestions.length);
      
      if (allQuestions.length !== functionQuestions.length) {
        console.warn('⚠️ MISMATCH DETECTED!');
        console.log('Questions in direct query but not in function:', 
          allQuestions.filter(q => !functionQuestions.find(fq => fq.id === q.id))
        );
        console.log('Questions in function but not in direct query:', 
          functionQuestions.filter(fq => !allQuestions.find(q => q.id === fq.id))
        );
      } else {
        console.log('✅ Counts match!');
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testAllQuizQuestions();

console.log('=== TEST COMPLETE - CHECK CONSOLE OUTPUT ABOVE ===');
