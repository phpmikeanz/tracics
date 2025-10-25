/**
 * Check App Database Connection
 * This script will help identify which database your app is actually using
 */

const { createClient } = require('@supabase/supabase-js');

async function checkAppDatabase() {
  try {
    console.log('🔍 CHECKING APP DATABASE CONNECTION');
    console.log('===================================');
    console.log('This will help identify which database your app is using');
    console.log('');
    
    // Check environment variables
    console.log('📊 ENVIRONMENT VARIABLES:');
    console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'}`);
    console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'}`);
    console.log('');
    
    // Initialize Supabase client with environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hdogujyfbjvvewwotman.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhkb2d1anlmYmp2dmV3d290bWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDYyNTksImV4cCI6MjA3Mjg4MjI1OX0.dJBQAU0eHSr1hThSC1eZPpIJwzlqRm7LUfB-p4qepAo";
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('📊 CONNECTION DETAILS:');
    console.log(`   URL: ${supabaseUrl}`);
    console.log(`   Key: ${supabaseKey.substring(0, 20)}...`);
    console.log('');
    
    // Test connection
    console.log('1️⃣ TESTING CONNECTION...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.log('❌ CONNECTION FAILED:', connectionError.message);
      return;
    } else {
      console.log('✅ Connection successful');
    }
    
    // Check what's actually in this database
    console.log('\n2️⃣ CHECKING DATABASE CONTENTS...');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .limit(5);
    
    if (profilesError) {
      console.log('❌ Error fetching profiles:', profilesError.message);
    } else {
      console.log(`👤 Profiles (${profiles?.length || 0}):`);
      profiles?.forEach((p, index) => {
        console.log(`   ${index + 1}. ${p.full_name} (${p.email}) - ${p.role}`);
      });
    }
    
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, title, course_code, instructor_id')
      .limit(5);
    
    if (coursesError) {
      console.log('❌ Error fetching courses:', coursesError.message);
    } else {
      console.log(`📚 Courses (${courses?.length || 0}):`);
      courses?.forEach((c, index) => {
        console.log(`   ${index + 1}. ${c.title} (${c.course_code}) - Instructor: ${c.instructor_id}`);
      });
    }
    
    const { data: quizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select('id, title, status, course_id')
      .limit(5);
    
    if (quizzesError) {
      console.log('❌ Error fetching quizzes:', quizzesError.message);
    } else {
      console.log(`📝 Quizzes (${quizzes?.length || 0}):`);
      quizzes?.forEach((q, index) => {
        console.log(`   ${index + 1}. ${q.title} (${q.status}) - Course: ${q.course_id}`);
      });
    }
    
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, quiz_id, question, type, points')
      .limit(5);
    
    if (questionsError) {
      console.log('❌ Error fetching questions:', questionsError.message);
    } else {
      console.log(`❓ Quiz Questions (${questions?.length || 0}):`);
      questions?.forEach((q, index) => {
        console.log(`   ${index + 1}. ${q.question} (${q.type}) - Quiz: ${q.quiz_id}`);
      });
    }
    
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('id, student_id, course_id, status')
      .limit(5);
    
    if (enrollmentsError) {
      console.log('❌ Error fetching enrollments:', enrollmentsError.message);
    } else {
      console.log(`👥 Enrollments (${enrollments?.length || 0}):`);
      enrollments?.forEach((e, index) => {
        console.log(`   ${index + 1}. Student: ${e.student_id}, Course: ${e.course_id}, Status: ${e.status}`);
      });
    }
    
    console.log('\n📋 SUMMARY:');
    console.log('===========');
    console.log(`👤 Profiles: ${profiles?.length || 0}`);
    console.log(`📚 Courses: ${courses?.length || 0}`);
    console.log(`📝 Quizzes: ${quizzes?.length || 0}`);
    console.log(`❓ Questions: ${questions?.length || 0}`);
    console.log(`👥 Enrollments: ${enrollments?.length || 0}`);
    
    console.log('\n🎯 DIAGNOSIS:');
    console.log('==============');
    
    if (quizzes?.length === 0) {
      console.log('❌ NO QUIZZES IN THIS DATABASE');
      console.log('💡 Your quizzes are not in this Supabase project');
      console.log('🔧 Check if you\'re using the correct Supabase project');
      console.log('🔧 Check your .env file for NEXT_PUBLIC_SUPABASE_URL');
    } else if (questions?.length === 0) {
      console.log('❌ NO QUIZ QUESTIONS IN THIS DATABASE');
      console.log('💡 Your quiz questions are not in this Supabase project');
      console.log('🔧 Check if questions were actually saved');
    } else if (enrollments?.length === 0) {
      console.log('❌ NO ENROLLMENTS IN THIS DATABASE');
      console.log('💡 Students are not enrolled in any courses');
      console.log('🔧 Enroll students in courses first');
    } else {
      console.log('✅ DATA FOUND IN THIS DATABASE');
      console.log('💡 The issue might be with RLS policies or student access');
    }
    
    console.log('\n🔧 NEXT STEPS:');
    console.log('==============');
    console.log('1. Check your Supabase Dashboard - is this the right project?');
    console.log('2. Check your .env file - is the URL correct?');
    console.log('3. If this is the wrong database, update your .env file');
    console.log('4. If this is the right database, create quizzes and enrollments');
    
  } catch (error) {
    console.error('\n❌ CHECK FAILED:', error.message);
    throw error;
  }
}

// Run the check
console.log('Starting app database check...\n');

checkAppDatabase()
  .then(() => {
    console.log('\n✅ App database check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error.message);
    process.exit(1);
  });



