// Test manual grading with simplified approach
// This tests if the issue is with the complex RLS policies

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSimpleGradeInsertion() {
  try {
    console.log('🧪 Testing simple grade insertion...')
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user?.id) {
      console.error('❌ User not authenticated:', userError)
      return false
    }
    
    console.log('✅ User authenticated:', user.id)
    
    // Check user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.error('❌ Error fetching profile:', profileError)
      return false
    }
    
    console.log('✅ User profile:', profile)
    
    if (profile.role !== 'faculty') {
      console.error('❌ User is not faculty:', profile.role)
      return false
    }
    
    // Get a sample quiz attempt and question
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select(`
        id,
        quiz_id,
        student_id,
        quizzes(title, course_id, courses(title))
      `)
      .eq('status', 'submitted')
      .limit(1)
      .single()
    
    if (attemptError || !attempt) {
      console.error('❌ No quiz attempts found:', attemptError)
      return false
    }
    
    console.log('✅ Found quiz attempt:', attempt)
    
    // Get a manual grading question
    const { data: question, error: questionError } = await supabase
      .from('quiz_questions')
      .select('id, type, points')
      .eq('quiz_id', attempt.quiz_id)
      .in('type', ['short_answer', 'essay'])
      .limit(1)
      .single()
    
    if (questionError || !question) {
      console.error('❌ No manual grading questions found:', questionError)
      return false
    }
    
    console.log('✅ Found question:', question)
    
    // Test simple grade insertion
    const testGradeData = {
      attempt_id: attempt.id,
      question_id: question.id,
      points_awarded: 5,
      feedback: 'Test feedback - simple approach',
      graded_by: user.id,
      graded_at: new Date().toISOString()
    }
    
    console.log('🧪 Testing grade insertion with data:', testGradeData)
    
    const { data: gradeResult, error: gradeError } = await supabase
      .from('quiz_question_grades')
      .insert(testGradeData)
      .select()
    
    if (gradeError) {
      console.error('❌ Grade insertion failed:', gradeError)
      console.error('Error details:', {
        message: gradeError.message,
        details: gradeError.details,
        hint: gradeError.hint,
        code: gradeError.code
      })
      return false
    }
    
    console.log('✅ Grade insertion successful:', gradeResult)
    
    // Clean up test data
    const { error: deleteError } = await supabase
      .from('quiz_question_grades')
      .delete()
      .eq('id', gradeResult[0].id)
    
    if (deleteError) {
      console.warn('⚠️ Error cleaning up test data:', deleteError)
    } else {
      console.log('✅ Test data cleaned up successfully')
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

// Run the test
testSimpleGradeInsertion()
  .then(success => {
    if (success) {
      console.log('🎉 Manual grading test PASSED!')
    } else {
      console.log('💥 Manual grading test FAILED!')
    }
  })
  .catch(error => {
    console.error('💥 Test script error:', error)
  })

