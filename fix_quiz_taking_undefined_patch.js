const fs = require('fs');
const path = require('path');

function fixQuizTakingUndefined() {
  try {
    console.log('🔧 FIXING QUIZ-TAKING UNDEFINED ERROR');
    console.log('=====================================');
    
    const filePath = path.join(__dirname, 'components', 'quizzes', 'quiz-taking.tsx');
    
    if (!fs.existsSync(filePath)) {
      console.log('❌ quiz-taking.tsx file not found');
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Find the shuffleQuestionOptions function and add null checks
    const oldFunction = `  // Shuffle multiple choice options within questions
  const shuffleQuestionOptions = (questions: QuizQuestion[], seed?: string): QuizQuestion[] => {
    return questions.map((question, index) => {
      if (question.type === 'multiple_choice' && question.options && question.options.length > 1) {
        // Use question ID and index as seed for consistent option shuffling
        const optionSeed = seed ? \`\${seed}-\${question.id}-\${index}\` : undefined
        const shuffledOptions = shuffleArray(question.options, optionSeed)
        return {
          ...question,
          options: shuffledOptions
        }
      }
      return question
    })
  }`;
    
    const newFunction = `  // Shuffle multiple choice options within questions
  const shuffleQuestionOptions = (questions: QuizQuestion[], seed?: string): QuizQuestion[] => {
    // Filter out undefined, null, or invalid questions first
    const validQuestions = questions.filter(question => 
      question && 
      question !== null && 
      question !== undefined && 
      question.type && 
      question.id
    );
    
    console.log('Filtering questions:', {
      original: questions.length,
      valid: validQuestions.length,
      filtered: questions.length - validQuestions.length
    });
    
    return validQuestions.map((question, index) => {
      if (question.type === 'multiple_choice' && question.options && question.options.length > 1) {
        // Use question ID and index as seed for consistent option shuffling
        const optionSeed = seed ? \`\${seed}-\${question.id}-\${index}\` : undefined
        const shuffledOptions = shuffleArray(question.options, optionSeed)
        return {
          ...question,
          options: shuffledOptions
        }
      }
      return question
    })
  }`;
    
    if (content.includes(oldFunction)) {
      content = content.replace(oldFunction, newFunction);
      console.log('✅ Updated shuffleQuestionOptions function');
    } else {
      console.log('⚠️  Could not find exact function to replace');
    }
    
    // Also add a safety check in the loadQuestions function
    const loadQuestionsPattern = /const loadQuestions = async \(\) => \{[\s\S]*?setLoading\(false\)[\s\S]*?\}/;
    const loadQuestionsMatch = content.match(loadQuestionsPattern);
    
    if (loadQuestionsMatch) {
      const loadQuestionsFunction = loadQuestionsMatch[0];
      
      // Add validation after questions are loaded
      const validationCode = `
        // Validate questions before processing
        if (!Array.isArray(questions)) {
          console.error('Questions is not an array:', questions);
          toast({
            title: "Error",
            description: "Invalid quiz data received. Please contact your instructor.",
            variant: "destructive",
          });
          return;
        }
        
        const validQuestions = questions.filter(q => q && q.id && q.type && q.question);
        if (validQuestions.length === 0) {
          console.error('No valid questions found:', questions);
          toast({
            title: "No Questions Available",
            description: "This quiz doesn't have any valid questions yet, or you may not have access. Please contact your instructor.",
            variant: "destructive",
          });
          return;
        }
        
        if (validQuestions.length !== questions.length) {
          console.warn('Some questions were filtered out:', {
            original: questions.length,
            valid: validQuestions.length
          });
        }
        
        // Use only valid questions
        questions = validQuestions;`;
      
      // Insert validation code after questions are loaded but before processing
      const insertPoint = loadQuestionsFunction.indexOf('console.log(\'Questions received from getQuizQuestions:\', questions)');
      if (insertPoint !== -1) {
        const beforeValidation = loadQuestionsFunction.substring(0, insertPoint);
        const afterValidation = loadQuestionsFunction.substring(insertPoint);
        const newLoadQuestionsFunction = beforeValidation + validationCode + '\n        ' + afterValidation;
        
        content = content.replace(loadQuestionsFunction, newLoadQuestionsFunction);
        console.log('✅ Added question validation to loadQuestions function');
      }
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log('✅ Successfully updated quiz-taking.tsx');
    console.log('💡 The component will now handle undefined questions gracefully');
    console.log('💡 Students should no longer see the "Cannot read properties of undefined" error');
    
  } catch (error) {
    console.error('❌ Failed to fix quiz-taking component:', error.message);
    throw error;
  }
}

// Run the fix
console.log('Starting quiz-taking undefined fix...\n');

fixQuizTakingUndefined()
  .then(() => {
    console.log('\n✅ Fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fix failed:', error.message);
    process.exit(1);
  });
