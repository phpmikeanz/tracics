// Simple function to test manual grading database updates
// This can be run in the browser console to test the update

async function testManualGradingUpdate(attemptId, questionId, pointsAwarded) {
  try {
    console.log('🧪 Testing manual grading update...')
    console.log('Attempt ID:', attemptId)
    console.log('Question ID:', questionId)
    console.log('Points Awarded:', pointsAwarded)
    
    // Step 1: Save the manual grade
    const { data: gradeResult, error: gradeError } = await supabase
      .from('quiz_question_grades')
      .upsert({
        attempt_id: attemptId,
        question_id: questionId,
        points_awarded: pointsAwarded,
        feedback: 'Test feedback',
        graded_by: (await supabase.auth.getUser()).data.user.id,
        graded_at: new Date().toISOString()
      }, {
        onConflict: 'attempt_id,question_id'
      })
      .select()
    
    if (gradeError) {
      console.error('❌ Grade save failed:', gradeError)
      return false
    }
    
    console.log('✅ Grade saved:', gradeResult[0])
    
    // Step 2: Get current attempt data
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select('id, score, status, quiz_id, answers')
      .eq('id', attemptId)
      .single()
    
    if (attemptError) {
      console.error('❌ Cannot fetch attempt:', attemptError)
      return false
    }
    
    console.log('📊 Current attempt:', attempt)
    
    // Step 3: Calculate new total score
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, type, points, correct_answer')
      .eq('quiz_id', attempt.quiz_id)
    
    if (questionsError) {
      console.error('❌ Cannot fetch questions:', questionsError)
      return false
    }
    
    // Get all manual grades
    const { data: manualGrades, error: gradesError } = await supabase
      .from('quiz_question_grades')
      .select('question_id, points_awarded')
      .eq('attempt_id', attemptId)
    
    if (gradesError) {
      console.error('❌ Cannot fetch manual grades:', gradesError)
      return false
    }
    
    // Calculate total score
    let totalScore = 0
    questions.forEach(question => {
      const studentAnswer = attempt.answers[question.id]
      
      if (question.type === 'multiple_choice' || question.type === 'true_false') {
        // Auto-grade
        if (studentAnswer === question.correct_answer) {
          totalScore += question.points
        }
      } else if (question.type === 'short_answer' || question.type === 'essay') {
        // Manual grade
        const manualGrade = manualGrades.find(g => g.question_id === question.id)
        if (manualGrade) {
          totalScore += manualGrade.points_awarded
        }
      }
    })
    
    console.log('📊 Calculated total score:', totalScore)
    console.log('📊 Previous score:', attempt.score)
    
    // Step 4: Update quiz attempt
    const { data: updateResult, error: updateError } = await supabase
      .from('quiz_attempts')
      .update({
        score: totalScore,
        status: 'graded'
      })
      .eq('id', attemptId)
      .select('id, score, status')
    
    if (updateError) {
      console.error('❌ Update failed:', updateError)
      console.error('Error details:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      })
      return false
    }
    
    console.log('✅ Quiz attempt updated:', updateResult[0])
    return true
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

// Export for use in browser console
window.testManualGradingUpdate = testManualGradingUpdate

console.log('🧪 Manual grading test function loaded. Use testManualGradingUpdate(attemptId, questionId, points) to test.')

