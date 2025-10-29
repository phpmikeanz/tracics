// Complete test for manual grading system
// This will test the entire flow from grading to database update

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testManualGradingComplete() {
  try {
    console.log('🧪 Testing complete manual grading system...\n')
    
    // 1. Check if we can access quiz_question_grades
    console.log('1️⃣ Testing quiz_question_grades access...')
    const { data: grades, error: gradesError } = await supabase
      .from('quiz_question_grades')
      .select('*')
      .limit(5)
    
    if (gradesError) {
      console.error('❌ Cannot access quiz_question_grades:', gradesError)
      return
    } else {
      console.log('✅ Can access quiz_question_grades:', grades.length, 'grades found')
    }
    
    // 2. Check if we can access quiz_attempts
    console.log('\n2️⃣ Testing quiz_attempts access...')
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('id, score, status, student_id, quiz_id')
      .limit(5)
    
    if (attemptsError) {
      console.error('❌ Cannot access quiz_attempts:', attemptsError)
      return
    } else {
      console.log('✅ Can access quiz_attempts:', attempts.length, 'attempts found')
    }
    
    // 3. Test creating a manual grade
    if (attempts.length > 0) {
      const testAttempt = attempts[0]
      console.log(`\n3️⃣ Testing manual grade creation for attempt ${testAttempt.id}...`)
      
      // Get a question for this quiz
      const { data: questions, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('id, type, points')
        .eq('quiz_id', testAttempt.quiz_id)
        .limit(1)
      
      if (questionsError || !questions.length) {
        console.error('❌ Cannot get questions for test:', questionsError)
        return
      }
      
      const testQuestion = questions[0]
      console.log('📝 Test question:', testQuestion.id, testQuestion.type, testQuestion.points, 'points')
      
      // Create a test grade
      const testGradeData = {
        attempt_id: testAttempt.id,
        question_id: testQuestion.id,
        points_awarded: Math.min(5, testQuestion.points), // Award some points
        feedback: 'Test manual grade',
        graded_by: '00000000-0000-0000-0000-000000000000', // Dummy UUID
        graded_at: new Date().toISOString()
      }
      
      console.log('💾 Creating test grade:', testGradeData)
      
      const { data: gradeResult, error: gradeError } = await supabase
        .from('quiz_question_grades')
        .upsert(testGradeData, {
          onConflict: 'attempt_id,question_id'
        })
        .select()
      
      if (gradeError) {
        console.error('❌ Failed to create test grade:', gradeError)
        console.error('Error details:', {
          message: gradeError.message,
          details: gradeError.details,
          hint: gradeError.hint,
          code: gradeError.code
        })
        return
      } else {
        console.log('✅ Test grade created:', gradeResult[0])
      }
      
      // 4. Test updating quiz_attempts score
      console.log('\n4️⃣ Testing quiz_attempts score update...')
      
      // Calculate new score
      const { data: allQuestions, error: allQuestionsError } = await supabase
        .from('quiz_questions')
        .select('id, type, points, correct_answer')
        .eq('quiz_id', testAttempt.quiz_id)
      
      if (allQuestionsError) {
        console.error('❌ Cannot get all questions:', allQuestionsError)
        return
      }
      
      // Get all manual grades for this attempt
      const { data: allGrades, error: allGradesError } = await supabase
        .from('quiz_question_grades')
        .select('question_id, points_awarded')
        .eq('attempt_id', testAttempt.id)
      
      if (allGradesError) {
        console.error('❌ Cannot get all grades:', allGradesError)
        return
      }
      
      // Calculate total score
      let totalScore = 0
      allQuestions.forEach(question => {
        if (question.type === 'multiple_choice' || question.type === 'true_false') {
          // For testing, just add points (simplified)
          totalScore += question.points
        } else if (question.type === 'short_answer' || question.type === 'essay') {
          const manualGrade = allGrades.find(g => g.question_id === question.id)
          if (manualGrade) {
            totalScore += manualGrade.points_awarded
          }
        }
      })
      
      console.log('📊 Calculated total score:', totalScore)
      console.log('📊 Previous score:', testAttempt.score)
      
      // Update quiz attempt
      const { data: updateResult, error: updateError } = await supabase
        .from('quiz_attempts')
        .update({
          score: totalScore,
          status: 'graded'
        })
        .eq('id', testAttempt.id)
        .select('id, score, status')
      
      if (updateError) {
        console.error('❌ Failed to update quiz_attempts:', updateError)
        console.error('Update error details:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        })
        
        // Check RLS policies
        console.log('\n🔍 Checking RLS policies for quiz_attempts...')
        const { data: policies, error: policiesError } = await supabase
          .rpc('exec_sql', { 
            sql: `SELECT policyname, cmd, permissive FROM pg_policies WHERE tablename = 'quiz_attempts' ORDER BY policyname;` 
          })
        
        if (policiesError) {
          console.error('❌ Cannot check RLS policies:', policiesError)
        } else {
          console.log('📋 Current RLS policies for quiz_attempts:', policies)
        }
        
      } else {
        console.log('✅ Quiz attempt updated successfully:', updateResult[0])
      }
      
      // 5. Clean up test data
      console.log('\n5️⃣ Cleaning up test data...')
      const { error: deleteError } = await supabase
        .from('quiz_question_grades')
        .delete()
        .eq('attempt_id', testAttempt.id)
        .eq('question_id', testQuestion.id)
      
      if (deleteError) {
        console.warn('⚠️ Could not clean up test grade:', deleteError)
      } else {
        console.log('✅ Test data cleaned up')
      }
    }
    
    console.log('\n🎉 Manual grading test completed!')
    
  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Run the test
testManualGradingComplete()

