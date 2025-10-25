/**
 * Simple Quiz Debug - Check what's in the database
 */

const { createClient } = require('@supabase/supabase-js');

async function simpleQuizDebug() {
  try {
    console.log('🔍 SIMPLE QUIZ DEBUG');
    console.log('====================');
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hdogujyfbjvvewwotman.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhkb2d1anlmYmp2dmV3d290bWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDYyNTksImV4cCI6MjA3Mjg4MjI1OX0.dJBQAU0eHSr1hThSC1eZPpIJwzlqRm7LUfB-p4qepAo";
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('📊 Checking database connection...');
    
    // Test 1: Check all quizzes
    console.log('\n1️⃣ ALL QUIZZES:');
    const { data: allQuizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select('id, title, status, course_id')
      .limit(10);
    
    if (quizzesError) {
      console.log('❌ Error fetching quizzes:', quizzesError.message);
    } else {
      console.log(`✅ Found ${allQuizzes?.length || 0} quizzes`);
      if (allQuizzes && allQuizzes.length > 0) {
        allQuizzes.forEach((q, index) => {
          console.log(`   ${index + 1}. ${q.title} (${q.status}) - ID: ${q.id}`);
        });
      }
    }
    
    // Test 2: Check for the specific quiz ID
    console.log('\n2️⃣ SPECIFIC QUIZ CHECK:');
    const targetQuizId = '6902ea3f-ebe9-418d-ba4c-8a1c3eb5b8c1';
    const { data: specificQuiz, error: specificError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', targetQuizId);
    
    if (specificError) {
      console.log('❌ Error fetching specific quiz:', specificError.message);
    } else {
      console.log(`✅ Specific quiz found: ${specificQuiz?.length || 0} results`);
      if (specificQuiz && specificQuiz.length > 0) {
        const quiz = specificQuiz[0];
        console.log(`   Title: ${quiz.title}`);
        console.log(`   Status: ${quiz.status}`);
        console.log(`   Course ID: ${quiz.course_id}`);
      } else {
        console.log('❌ Quiz with ID 6902ea3f-ebe9-418d-ba4c-8a1c3eb5b8c1 NOT FOUND');
        console.log('💡 This means the quiz ID in your app is incorrect or the quiz was deleted');
      }
    }
    
    // Test 3: Check all quiz questions
    console.log('\n3️⃣ ALL QUIZ QUESTIONS:');
    const { data: allQuestions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, quiz_id, question, type, points')
      .limit(10);
    
    if (questionsError) {
      console.log('❌ Error fetching questions:', questionsError.message);
    } else {
      console.log(`✅ Found ${allQuestions?.length || 0} quiz questions`);
      if (allQuestions && allQuestions.length > 0) {
        allQuestions.forEach((q, index) => {
          console.log(`   ${index + 1}. ${q.question} (${q.type}) - Quiz ID: ${q.quiz_id}`);
        });
      }
    }
    
    // Test 4: Check questions for the specific quiz
    console.log('\n4️⃣ QUESTIONS FOR SPECIFIC QUIZ:');
    const { data: quizQuestions, error: quizQuestionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', targetQuizId);
    
    if (quizQuestionsError) {
      console.log('❌ Error fetching quiz questions:', quizQuestionsError.message);
    } else {
      console.log(`✅ Found ${quizQuestions?.length || 0} questions for quiz ${targetQuizId}`);
      if (quizQuestions && quizQuestions.length > 0) {
        quizQuestions.forEach((q, index) => {
          console.log(`   ${index + 1}. ${q.question} (${q.type}) - ${q.points} points`);
        });
      } else {
        console.log('❌ NO QUESTIONS FOUND for this quiz ID');
        console.log('💡 This is why students see "No Questions Available"');
      }
    }
    
    // Test 5: Check enrollments
    console.log('\n5️⃣ ENROLLMENTS:');
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('id, student_id, course_id, status')
      .limit(10);
    
    if (enrollmentsError) {
      console.log('❌ Error fetching enrollments:', enrollmentsError.message);
    } else {
      console.log(`✅ Found ${enrollments?.length || 0} enrollments`);
      if (enrollments && enrollments.length > 0) {
        enrollments.forEach((e, index) => {
          console.log(`   ${index + 1}. Student: ${e.student_id}, Course: ${e.course_id}, Status: ${e.status}`);
        });
      }
    }
    
    // Test 6: Check courses
    console.log('\n6️⃣ COURSES:');
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, title, course_code, instructor_id')
      .limit(10);
    
    if (coursesError) {
      console.log('❌ Error fetching courses:', coursesError.message);
    } else {
      console.log(`✅ Found ${courses?.length || 0} courses`);
      if (courses && courses.length > 0) {
        courses.forEach((c, index) => {
          console.log(`   ${index + 1}. ${c.title} (${c.course_code}) - Instructor: ${c.instructor_id}`);
        });
      }
    }
    
    console.log('\n📋 SUMMARY:');
    console.log('============');
    console.log(`Quizzes: ${allQuizzes?.length || 0}`);
    console.log(`Quiz Questions: ${allQuestions?.length || 0}`);
    console.log(`Enrollments: ${enrollments?.length || 0}`);
    console.log(`Courses: ${courses?.length || 0}`);
    console.log(`Questions for target quiz: ${quizQuestions?.length || 0}`);
    
    if ((quizQuestions?.length || 0) === 0) {
      console.log('\n🎯 MAIN ISSUE IDENTIFIED:');
      console.log('========================');
      console.log('❌ The quiz has NO QUESTIONS in the database');
      console.log('💡 Even though you say you added questions, they are not in the database');
      console.log('');
      console.log('🔧 SOLUTIONS:');
      console.log('1. Check your admin panel - are questions actually saved?');
      console.log('2. Check browser console for errors when adding questions');
      console.log('3. Try adding questions again');
      console.log('4. Check if there are any database errors in Supabase logs');
    }
    
  } catch (error) {
    console.error('\n❌ DEBUG FAILED:', error.message);
    throw error;
  }
}

// Run the debug
console.log('Starting simple quiz debug...\n');

simpleQuizDebug()
  .then(() => {
    console.log('\n✅ Debug completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Debug failed:', error.message);
    process.exit(1);
  });
