/**
 * QUIZ SCORE SYNCHRONIZATION FIX
 * 
 * This script fixes the issue where:
 * - Faculty grades are saved to quiz_question_grades.points_awarded
 * - But quiz_attempts.score and status are not updated
 * - Students still see "Pending Grading" instead of their results
 * 
 * Run this script whenever you have quiz attempts stuck in "completed" status
 * that should be "graded" with proper scores.
 */

const { createClient } = require('@supabase/supabase-js');

async function calculateTotalScore(supabase, attemptId) {
  console.log(`🔢 Calculating total score for attempt ${attemptId}...`);
  
  // Get the attempt and quiz info
  const { data: attempt, error: attemptError } = await supabase
    .from('quiz_attempts')
    .select('quiz_id, answers')
    .eq('id', attemptId)
    .single();

  if (attemptError) throw attemptError;

  // Get all questions for the quiz
  const { data: questions, error: questionsError } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('quiz_id', attempt.quiz_id);

  if (questionsError) throw questionsError;

  // Get manual grades
  const { data: grades, error: gradesError } = await supabase
    .from('quiz_question_grades')
    .select('*')
    .eq('attempt_id', attemptId);

  if (gradesError) throw gradesError;

  let autoScore = 0;   // Points from multiple choice and true/false
  let manualScore = 0; // Points from essay and short answer
  
  console.log(`   📝 Found ${questions?.length || 0} questions`);
  console.log(`   🎯 Found ${grades?.length || 0} manual grades`);

  questions?.forEach(question => {
    const studentAnswer = attempt.answers[question.id];
    
    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      // Auto-grade multiple choice and true/false
      if (studentAnswer === question.correct_answer) {
        autoScore += question.points;
        console.log(`   ✅ AUTO: Question ${question.id} = ${question.points} points (correct)`);
      } else {
        console.log(`   ❌ AUTO: Question ${question.id} = 0 points (incorrect)`);
      }
    } else if (question.type === 'short_answer' || question.type === 'essay') {
      // Use manual grade if available
      const grade = grades?.find(g => g.question_id === question.id);
      if (grade) {
        manualScore += grade.points_awarded;
        console.log(`   📝 MANUAL: Question ${question.id} = ${grade.points_awarded} points (graded by faculty)`);
      } else {
        console.log(`   ⏳ MANUAL: Question ${question.id} = 0 points (not yet graded)`);
      }
    }
  });

  const totalScore = autoScore + manualScore;
  console.log(`   📊 TOTAL: ${autoScore} (auto) + ${manualScore} (manual) = ${totalScore} points`);
  
  return totalScore;
}

async function fixQuizScoreSynchronization() {
  try {
    console.log('🔧 QUIZ SCORE SYNCHRONIZATION FIX STARTING...');
    console.log('===============================================');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hdogujyfbjvvewwotman.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhkb2d1anlmYmp2dmV3d290bWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDYyNTksImV4cCI6MjA3Mjg4MjI1OX0.dJBQAU0eHSr1hThSC1eZPpIJwzlqRm7LUfB-p4qepAo";
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Step 1: Find all quiz attempts
    console.log('\n1️⃣ FINDING ALL QUIZ ATTEMPTS...');
    const { data: allAttempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .order('completed_at', { ascending: false });
    
    if (attemptsError) {
      throw new Error(`Failed to fetch quiz attempts: ${attemptsError.message}`);
    }
    
    console.log(`   📋 Found ${allAttempts?.length || 0} total quiz attempts`);
    
    if (!allAttempts || allAttempts.length === 0) {
      console.log('✅ No quiz attempts found. Nothing to fix.');
      return { fixed: 0, errors: [], details: [] };
    }
    
    // Step 2: Check each attempt for synchronization issues
    console.log('\n2️⃣ CHECKING FOR SYNCHRONIZATION ISSUES...');
    const problemAttempts = [];
    
    for (let i = 0; i < allAttempts.length; i++) {
      const attempt = allAttempts[i];
      console.log(`\n🔍 Checking attempt ${i + 1}/${allAttempts.length}: ${attempt.id}`);
      
      // Check if this attempt has manual grades
      const { data: manualGrades } = await supabase
        .from('quiz_question_grades')
        .select('*')
        .eq('attempt_id', attempt.id);
      
      const hasManualGrades = manualGrades && manualGrades.length > 0;
      console.log(`   📝 Manual grades: ${manualGrades?.length || 0}`);
      console.log(`   📊 Current score: ${attempt.score || 0}`);
      console.log(`   📝 Current status: ${attempt.status}`);
      
      if (hasManualGrades) {
        // Calculate what the score should be
        const expectedScore = await calculateTotalScore(supabase, attempt.id);
        
        const hasWrongStatus = attempt.status === 'completed';
        const hasWrongScore = attempt.score !== expectedScore;
        
        if (hasWrongStatus || hasWrongScore) {
          console.log(`   🚨 PROBLEM FOUND!`);
          if (hasWrongStatus) console.log(`      - Status should be "graded" but is "${attempt.status}"`);
          if (hasWrongScore) console.log(`      - Score should be ${expectedScore} but is ${attempt.score}`);
          
          problemAttempts.push({
            ...attempt,
            expectedScore,
            manualGradesCount: manualGrades.length,
            issue: hasWrongStatus ? 'wrong_status' : 'wrong_score'
          });
        } else {
          console.log(`   ✅ OK: Already properly synchronized`);
        }
      } else {
        console.log(`   ✅ OK: No manual grades (auto-graded only)`);
      }
    }
    
    console.log(`\n📋 SUMMARY: Found ${problemAttempts.length} quiz attempts that need fixing`);
    
    if (problemAttempts.length === 0) {
      console.log('🎉 ALL QUIZ SCORES ARE PROPERLY SYNCHRONIZED!');
      return { fixed: 0, errors: [], details: [] };
    }
    
    // Step 3: Fix each problem attempt
    console.log('\n3️⃣ FIXING SYNCHRONIZATION ISSUES...');
    let fixed = 0;
    const errors = [];
    const details = [];
    
    for (let i = 0; i < problemAttempts.length; i++) {
      const attempt = problemAttempts[i];
      console.log(`\n🔧 Fixing ${i + 1}/${problemAttempts.length}: Attempt ${attempt.id}`);
      console.log(`   📊 Old: score=${attempt.score}, status=${attempt.status}`);
      console.log(`   📊 New: score=${attempt.expectedScore}, status=graded`);
      
      try {
        const { data: updateResult, error: updateError } = await supabase
          .from('quiz_attempts')
          .update({
            score: attempt.expectedScore,
            status: 'graded'
          })
          .eq('id', attempt.id)
          .select('id, score, status');
        
        if (updateError) {
          console.log(`   ❌ FAILED: ${updateError.message}`);
          errors.push(`Attempt ${attempt.id}: ${updateError.message}`);
        } else if (!updateResult || updateResult.length === 0) {
          console.log(`   ❌ FAILED: No data returned from update`);
          errors.push(`Attempt ${attempt.id}: No data returned from update`);
        } else {
          const updated = updateResult[0];
          console.log(`   ✅ SUCCESS: score=${updated.score}, status=${updated.status}`);
          
          fixed++;
          details.push({
            attemptId: attempt.id,
            oldScore: attempt.score,
            newScore: attempt.expectedScore,
            oldStatus: attempt.status,
            newStatus: 'graded',
            manualGradesCount: attempt.manualGradesCount
          });
        }
      } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        errors.push(`Attempt ${attempt.id}: ${error.message}`);
      }
    }
    
    // Step 4: Final summary
    console.log('\n4️⃣ FINAL RESULTS');
    console.log('==================');
    console.log(`✅ Successfully fixed: ${fixed} attempts`);
    console.log(`❌ Errors encountered: ${errors.length}`);
    
    if (details.length > 0) {
      console.log('\n📝 DETAILED CHANGES:');
      details.forEach((detail, index) => {
        console.log(`   ${index + 1}. Attempt ${detail.attemptId}:`);
        console.log(`      Score: ${detail.oldScore} → ${detail.newScore}`);
        console.log(`      Status: ${detail.oldStatus} → ${detail.newStatus}`);
        console.log(`      Manual grades: ${detail.manualGradesCount}`);
      });
    }
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    if (fixed > 0) {
      console.log('\n🎉 SUCCESS! Quiz score synchronization complete!');
      console.log('   ✅ Manual grades from quiz_question_grades.points_awarded have been added to quiz_attempts.score');
      console.log('   ✅ Quiz attempt status updated from "completed" to "graded"');
      console.log('   ✅ Students can now see their quiz results (no more "Pending Grading")!');
    }
    
    return { fixed, errors, details };
    
  } catch (error) {
    console.error('\n🚨 SCRIPT FAILED:', error.message);
    throw error;
  }
}

// Run the fix
console.log('Starting Quiz Score Synchronization Fix...\n');

fixQuizScoreSynchronization()
  .then((result) => {
    console.log('\n✅ Script completed successfully!');
    if (result.fixed === 0 && result.errors.length === 0) {
      console.log('🎯 No issues found - all quiz scores are properly synchronized.');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });






























