// Recalculate all quiz attempt scores to fix any incorrect totals
// This script will update all quiz attempts with correct auto + manual scores

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function recalculateAllScores() {
  try {
    console.log('🔄 Starting score recalculation for all quiz attempts...')
    
    // Get all quiz attempts
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('id, quiz_id, answers, score, status')
      .order('created_at', { ascending: false })

    if (attemptsError) {
      console.error('❌ Error fetching attempts:', attemptsError)
      return
    }

    console.log(`📊 Found ${attempts.length} quiz attempts to process`)

    let updated = 0
    let errors = 0

    for (const attempt of attempts) {
      try {
        console.log(`\n🔄 Processing attempt ${attempt.id}...`)
        
        // Get quiz questions
        const { data: questions, error: questionsError } = await supabase
          .from('quiz_questions')
          .select('id, type, points, correct_answer')
          .eq('quiz_id', attempt.quiz_id)

        if (questionsError) {
          console.error(`❌ Error fetching questions for attempt ${attempt.id}:`, questionsError)
          errors++
          continue
        }

        // Get manual grades
        const { data: manualGrades, error: gradesError } = await supabase
          .from('quiz_question_grades')
          .select('question_id, points_awarded')
          .eq('attempt_id', attempt.id)

        if (gradesError) {
          console.error(`❌ Error fetching grades for attempt ${attempt.id}:`, gradesError)
          errors++
          continue
        }

        // Calculate total score
        let totalScore = 0
        let autoScore = 0
        let manualScore = 0

        questions.forEach(question => {
          const studentAnswer = attempt.answers[question.id]
          
          if (question.type === 'multiple_choice' || question.type === 'true_false') {
            // Auto-grade
            if (studentAnswer === question.correct_answer) {
              autoScore += question.points
              totalScore += question.points
            }
          } else if (question.type === 'short_answer' || question.type === 'essay') {
            // Manual grade
            const manualGrade = manualGrades?.find(g => g.question_id === question.id)
            if (manualGrade) {
              manualScore += manualGrade.points_awarded
              totalScore += manualGrade.points_awarded
            }
          }
        })

        console.log(`  📊 Auto: ${autoScore}, Manual: ${manualScore}, Total: ${totalScore}`)
        console.log(`  📊 Previous score: ${attempt.score}`)

        // Update if score is different
        if (totalScore !== attempt.score) {
          const { error: updateError } = await supabase
            .from('quiz_attempts')
            .update({ 
              score: totalScore,
              status: 'graded'
            })
            .eq('id', attempt.id)

          if (updateError) {
            console.error(`❌ Error updating attempt ${attempt.id}:`, updateError)
            errors++
          } else {
            console.log(`✅ Updated attempt ${attempt.id}: ${attempt.score} → ${totalScore}`)
            updated++
          }
        } else {
          console.log(`✅ Attempt ${attempt.id} already has correct score`)
        }

      } catch (error) {
        console.error(`❌ Error processing attempt ${attempt.id}:`, error)
        errors++
      }
    }

    console.log('\n🎉 Score recalculation complete!')
    console.log(`✅ Updated: ${updated} attempts`)
    console.log(`❌ Errors: ${errors} attempts`)
    console.log(`📊 Total processed: ${attempts.length} attempts`)

  } catch (error) {
    console.error('❌ Error in score recalculation:', error)
  }
}

// Run the recalculation
recalculateAllScores()
