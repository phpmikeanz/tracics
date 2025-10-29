// Debug manual grading database updates
// This script will test if manual grading can update quiz_attempts

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugManualGrading() {
  try {
    console.log('🔍 Debugging manual grading database updates...')
    
    // 1. Check if we can read quiz_attempts
    console.log('\n1. Testing quiz_attempts read access...')
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('id, score, status, student_id, quiz_id')
      .limit(5)
    
    if (attemptsError) {
      console.error('❌ Cannot read quiz_attempts:', attemptsError)
    } else {
      console.log('✅ Can read quiz_attempts:', attempts.length, 'attempts found')
      console.log('Sample attempts:', attempts)
    }
    
    // 2. Check if we can read quiz_question_grades
    console.log('\n2. Testing quiz_question_grades read access...')
    const { data: grades, error: gradesError } = await supabase
      .from('quiz_question_grades')
      .select('*')
      .limit(5)
    
    if (gradesError) {
      console.error('❌ Cannot read quiz_question_grades:', gradesError)
    } else {
      console.log('✅ Can read quiz_question_grades:', grades.length, 'grades found')
      console.log('Sample grades:', grades)
    }
    
    // 3. Test updating a quiz attempt score
    if (attempts && attempts.length > 0) {
      const testAttempt = attempts[0]
      console.log(`\n3. Testing quiz_attempts update for attempt ${testAttempt.id}...`)
      
      const { data: updateResult, error: updateError } = await supabase
        .from('quiz_attempts')
        .update({ 
          score: testAttempt.score + 1, // Add 1 to test
          status: 'graded'
        })
        .eq('id', testAttempt.id)
        .select('id, score, status')
      
      if (updateError) {
        console.error('❌ Cannot update quiz_attempts:', updateError)
        console.error('Error details:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        })
      } else {
        console.log('✅ Successfully updated quiz_attempts:', updateResult)
        
        // Revert the change
        await supabase
          .from('quiz_attempts')
          .update({ 
            score: testAttempt.score,
            status: testAttempt.status
          })
          .eq('id', testAttempt.id)
        console.log('🔄 Reverted test change')
      }
    }
    
    // 4. Check RLS policies
    console.log('\n4. Checking RLS policies...')
    const { data: policies, error: policiesError } = await supabase
      .rpc('exec_sql', { 
        sql: `SELECT policyname, cmd, permissive FROM pg_policies WHERE tablename = 'quiz_attempts' ORDER BY policyname;` 
      })
    
    if (policiesError) {
      console.error('❌ Cannot check RLS policies:', policiesError)
    } else {
      console.log('✅ RLS policies for quiz_attempts:', policies)
    }
    
    // 5. Test the complete manual grading flow
    if (attempts && attempts.length > 0 && grades && grades.length > 0) {
      const testAttempt = attempts[0]
      const testGrade = grades[0]
      
      console.log(`\n5. Testing complete manual grading flow...`)
      console.log(`Test attempt: ${testAttempt.id}`)
      console.log(`Test grade: ${testGrade.id}`)
      
      // Simulate the gradeQuestion function
      try {
        // Get quiz questions
        const { data: questions, error: questionsError } = await supabase
          .from('quiz_questions')
          .select('id, type, points, correct_answer')
          .eq('quiz_id', testAttempt.quiz_id)
        
        if (questionsError) {
          console.error('❌ Cannot fetch questions:', questionsError)
        } else {
          console.log('✅ Fetched questions:', questions.length)
          
          // Calculate total score
          let totalScore = 0
          questions.forEach(question => {
            if (question.type === 'multiple_choice' || question.type === 'true_false') {
              // For testing, just add points
              totalScore += question.points
            } else if (question.type === 'short_answer' || question.type === 'essay') {
              // Add manual grade points
              const manualGrade = grades.find(g => g.question_id === question.id)
              if (manualGrade) {
                totalScore += manualGrade.points_awarded
              }
            }
          })
          
          console.log('📊 Calculated total score:', totalScore)
          
          // Try to update quiz attempt
          const { data: updateResult, error: updateError } = await supabase
            .from('quiz_attempts')
            .update({ 
              score: totalScore,
              status: 'graded'
            })
            .eq('id', testAttempt.id)
            .select('id, score, status')
          
          if (updateError) {
            console.error('❌ Manual grading update failed:', updateError)
          } else {
            console.log('✅ Manual grading update successful:', updateResult)
          }
        }
      } catch (error) {
        console.error('❌ Error in manual grading flow:', error)
      }
    }
    
  } catch (error) {
    console.error('❌ Error in debug script:', error)
  }
}

// Run the debug
debugManualGrading()