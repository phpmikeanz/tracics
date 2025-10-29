// Debug script to identify missing quiz questions issue
// Run this in the browser console while taking a quiz

console.log('=== QUIZ QUESTIONS DEBUG SCRIPT ===');

// Function to debug quiz questions loading
async function debugQuizQuestions() {
  console.log('Starting quiz questions debug...');
  
  // Get current quiz info from the page
  const quizId = window.location.pathname.split('/').pop();
  console.log('Quiz ID from URL:', quizId);
  
  // Check if we're in a quiz taking page
  if (!quizId || !window.location.pathname.includes('/quiz/')) {
    console.error('Not on a quiz taking page. Please navigate to a quiz first.');
    return;
  }
  
  try {
    // Import the quiz functions
    const { getQuizQuestions } = await import('/lib/quizzes.js');
    
    console.log('Fetching questions for quiz:', quizId);
    const questions = await getQuizQuestions(quizId);
    
    console.log('=== DEBUG RESULTS ===');
    console.log('Total questions received:', questions.length);
    console.log('Questions array:', questions);
    
    if (questions.length === 0) {
      console.error('❌ NO QUESTIONS FOUND!');
      console.log('Possible causes:');
      console.log('1. RLS policy blocking access');
      console.log('2. Quiz not published');
      console.log('3. Student not enrolled/approved');
      console.log('4. No questions in database');
    } else {
      console.log('✅ Questions found!');
      console.log('Question details:');
      questions.forEach((q, index) => {
        console.log(`Q${index + 1}:`, {
          id: q.id,
          type: q.type,
          question: q.question?.substring(0, 50) + '...',
          hasOptions: !!q.options,
          optionsCount: q.options?.length || 0,
          points: q.points,
          orderIndex: q.order_index
        });
      });
    }
    
    // Check if questions are being filtered out
    const validQuestions = questions.filter(q => q && q.id && q.type && q.question);
    console.log('Valid questions after filtering:', validQuestions.length);
    
    if (validQuestions.length !== questions.length) {
      console.warn('⚠️ Some questions were filtered out!');
      const invalidQuestions = questions.filter(q => !q || !q.id || !q.type || !q.question);
      console.log('Invalid questions:', invalidQuestions);
    }
    
  } catch (error) {
    console.error('Debug failed:', error);
  }
}

// Function to check RLS policies
async function checkRLSPolicies() {
  console.log('=== RLS POLICY CHECK ===');
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    // Check current user
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user:', user?.id);
    
    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    console.log('User role:', profile?.role);
    
    // Check enrollments
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course_id, status')
      .eq('student_id', user.id);
    
    console.log('User enrollments:', enrollments);
    
  } catch (error) {
    console.error('RLS check failed:', error);
  }
}

// Run both debug functions
debugQuizQuestions();
checkRLSPolicies();

console.log('=== DEBUG COMPLETE ===');
console.log('Check the console output above for details about missing questions.');
