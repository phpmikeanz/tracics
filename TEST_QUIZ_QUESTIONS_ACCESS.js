// TEST QUIZ QUESTIONS ACCESS
// Run this in browser console to test database access

console.log('🧪 TESTING QUIZ QUESTIONS ACCESS...');

// Test function to check quiz questions
async function testQuizQuestions() {
  try {
    console.log('📡 Testing database connection...');
    
    // Get the quiz ID from the current page URL or component
    let quizId = null;
    
    // Try to get quiz ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    quizId = urlParams.get('quizId') || urlParams.get('id');
    
    // Try to get quiz ID from the page content
    if (!quizId) {
      const quizElement = document.querySelector('[data-quiz-id]');
      if (quizElement) {
        quizId = quizElement.getAttribute('data-quiz-id');
      }
    }
    
    // Try to get quiz ID from window object (if set by the component)
    if (!quizId && window.currentQuizId) {
      quizId = window.currentQuizId;
    }
    
    if (!quizId) {
      console.error('❌ Could not find quiz ID. Please provide it manually.');
      console.log('💡 You can set it manually by running: window.currentQuizId = "your-quiz-id"');
      return;
    }
    
    console.log('🎯 Testing quiz ID:', quizId);
    
    // Test the getQuizQuestions function
    const { getQuizQuestions } = await import('/lib/quizzes.js');
    console.log('📚 getQuizQuestions function loaded');
    
    // Call the function
    const questions = await getQuizQuestions(quizId);
    console.log('📊 QUESTIONS RESULT:', questions);
    console.log('📊 QUESTIONS COUNT:', questions?.length || 0);
    console.log('📊 QUESTIONS TYPE:', typeof questions);
    console.log('📊 IS ARRAY:', Array.isArray(questions));
    
    if (questions && questions.length > 0) {
      console.log('✅ SUCCESS: Questions loaded from database');
      console.log('📋 Question IDs:', questions.map(q => q.id));
      console.log('📋 Question types:', questions.map(q => q.type));
      console.log('📋 Question points:', questions.map(q => q.points));
    } else {
      console.error('❌ FAILED: No questions received');
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  }
}

// Run the test
testQuizQuestions();

console.log('🧪 Test completed. Check the results above.');
