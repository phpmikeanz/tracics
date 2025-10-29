// Debug script to identify why quiz questions are being filtered out
// Run this in the browser console while taking a quiz

console.log('=== QUIZ QUESTIONS SHUFFLE DEBUG SCRIPT ===');

// Function to debug quiz questions loading and filtering
async function debugQuizQuestionsShuffle() {
  console.log('Starting quiz questions shuffle debug...');
  
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
    
    console.log('=== RAW QUESTIONS FROM DATABASE ===');
    console.log('Total questions received:', questions.length);
    console.log('Questions array:', questions);
    
    // Analyze each question
    questions.forEach((q, index) => {
      console.log(`Question ${index + 1}:`, {
        id: q?.id || 'MISSING',
        type: q?.type || 'MISSING',
        question: q?.question ? q.question.substring(0, 50) + '...' : 'MISSING',
        points: q?.points || 'MISSING',
        order_index: q?.order_index || 'MISSING',
        options: q?.options ? q.options.length : 'MISSING',
        hasValidId: !!q?.id,
        hasValidType: !!q?.type,
        hasValidQuestion: !!(q?.question && q.question.trim()),
        hasValidPoints: !!(q?.points && q.points > 0),
        hasValidOrderIndex: q?.order_index !== null && q?.order_index !== undefined
      });
    });
    
    // Test the filtering logic
    console.log('=== TESTING FILTERING LOGIC ===');
    const validQuestions = questions.filter(q => {
      if (!q || !q.id) {
        console.warn('❌ Filtering out question without ID:', q);
        return false;
      }
      // Allow questions with missing type - default to multiple_choice
      if (!q.type || q.type.trim() === '') {
        console.warn('⚠️ Question missing type, would default to multiple_choice:', q.id);
        q.type = 'multiple_choice';
      }
      // Allow questions with missing question text - provide default
      if (!q.question || q.question.trim() === '') {
        console.warn('⚠️ Question missing text, would provide default:', q.id);
        q.question = 'Question text not available';
      }
      // Allow questions with missing points - default to 1
      if (!q.points || q.points <= 0) {
        console.warn('⚠️ Question missing points, would default to 1:', q.id);
        q.points = 1;
      }
      // Allow questions with missing order_index - use array index
      if (q.order_index === null || q.order_index === undefined) {
        console.warn('⚠️ Question missing order_index, would use array index:', q.id);
        q.order_index = questions.indexOf(q);
      }
      return true;
    });
    
    console.log('=== FILTERING RESULTS ===');
    console.log('Original questions:', questions.length);
    console.log('Valid questions after filtering:', validQuestions.length);
    console.log('Questions filtered out:', questions.length - validQuestions.length);
    
    if (validQuestions.length !== questions.length) {
      console.warn('⚠️ Some questions were filtered out!');
      const filteredOut = questions.filter(q => !validQuestions.includes(q));
      console.log('Filtered out questions:', filteredOut);
    }
    
    // Test shuffle function
    console.log('=== TESTING SHUFFLE FUNCTION ===');
    
    // Simple shuffle function for testing
    const testShuffle = (array, seed) => {
      const shuffled = [...array];
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      const random = () => {
        hash = (hash * 9301 + 49297) % 233280;
        return hash / 233280;
      };
      
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };
    
    const shuffledQuestions = testShuffle(validQuestions, 'test-seed');
    console.log('Shuffled questions:', shuffledQuestions.length);
    console.log('First shuffled question:', shuffledQuestions[0]);
    
    // Check if any questions were lost during shuffle
    if (shuffledQuestions.length !== validQuestions.length) {
      console.error('❌ Questions were lost during shuffle!');
      console.error('Before shuffle:', validQuestions.length);
      console.error('After shuffle:', shuffledQuestions.length);
    } else {
      console.log('✅ No questions lost during shuffle');
    }
    
    // Final summary
    console.log('=== FINAL SUMMARY ===');
    console.log('Database questions:', questions.length);
    console.log('Valid questions:', validQuestions.length);
    console.log('Shuffled questions:', shuffledQuestions.length);
    console.log('Questions that should be displayed:', shuffledQuestions.length);
    
    if (shuffledQuestions.length === 0) {
      console.error('❌ NO QUESTIONS WILL BE DISPLAYED!');
      console.log('This explains why the quiz shows no questions.');
    } else {
      console.log('✅ Questions should be displayed properly.');
    }
    
  } catch (error) {
    console.error('Debug failed:', error);
  }
}

// Run the debug function
debugQuizQuestionsShuffle();

console.log('=== DEBUG COMPLETE ===');
console.log('Check the console output above for details about question filtering and shuffling.');
