/**
 * Comprehensive Database Check
 * This script will thoroughly check your database to identify the exact issue
 */

const { createClient } = require('@supabase/supabase-js');

async function comprehensiveDatabaseCheck() {
  try {
    console.log('🔍 COMPREHENSIVE DATABASE CHECK');
    console.log('================================');
    console.log('This will help identify why students cannot see quiz questions');
    console.log('');
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hdogujyfbjvvewwotman.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhkb2d1anlmYmp2dmV3d290bWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDYyNTksImV4cCI6MjA3Mjg4MjI1OX0.dJBQAU0eHSr1hThSC1eZPpIJwzlqRm7LUfB-p4qepAo";
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('📊 Database Connection Info:');
    console.log(`   URL: ${supabaseUrl}`);
    console.log(`   Key: ${supabaseKey.substring(0, 20)}...`);
    console.log('');
    
    // Test 1: Check if we can connect to database at all
    console.log('1️⃣ TESTING DATABASE CONNECTION...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.log('❌ DATABASE CONNECTION FAILED:', connectionError.message);
      console.log('💡 This means your app cannot connect to the database');
      console.log('🔧 Check your Supabase URL and API key');
      return;
    } else {
      console.log('✅ Database connection successful');
    }
    
    // Test 2: Check all tables systematically
    console.log('\n2️⃣ CHECKING ALL TABLES...');
    
    const tables = [
      { name: 'profiles', description: 'User profiles' },
      { name: 'courses', description: 'Courses' },
      { name: 'enrollments', description: 'Student enrollments' },
      { name: 'quizzes', description: 'Quizzes' },
      { name: 'quiz_questions', description: 'Quiz questions' },
      { name: 'quiz_attempts', description: 'Quiz attempts' }
    ];
    
    const tableResults = {};
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table.name)
          .select('*', { count: 'exact' })
          .limit(1);
        
        if (error) {
          console.log(`❌ ${table.name}: ${error.message}`);
          tableResults[table.name] = { count: 0, error: error.message };
        } else {
          const { count } = await supabase
            .from(table.name)
            .select('*', { count: 'exact', head: true });
          
          console.log(`✅ ${table.name}: ${count || 0} records`);
          tableResults[table.name] = { count: count || 0, error: null };
        }
      } catch (err) {
        console.log(`❌ ${table.name}: ${err.message}`);
        tableResults[table.name] = { count: 0, error: err.message };
      }
    }
    
    // Test 3: Check specific quiz data if it exists
    console.log('\n3️⃣ CHECKING QUIZ DATA SPECIFICALLY...');
    
    if (tableResults.quizzes?.count > 0) {
      const { data: quizzes, error: quizzesError } = await supabase
        .from('quizzes')
        .select(`
          id,
          title,
          status,
          course_id,
          created_at,
          courses!inner(
            id,
            title,
            course_code
          )
        `)
        .limit(5);
      
      if (quizzesError) {
        console.log('❌ Error fetching quiz details:', quizzesError.message);
      } else {
        console.log(`📝 Quiz details:`);
        quizzes?.forEach((q, index) => {
          console.log(`   ${index + 1}. ${q.title} (${q.status}) in ${q.courses.title}`);
          console.log(`      ID: ${q.id}`);
          console.log(`      Course: ${q.courses.course_code}`);
          console.log(`      Created: ${q.created_at}`);
        });
      }
    }
    
    if (tableResults.quiz_questions?.count > 0) {
      const { data: questions, error: questionsError } = await supabase
        .from('quiz_questions')
        .select(`
          id,
          quiz_id,
          question,
          type,
          points,
          quizzes!inner(
            id,
            title,
            status
          )
        `)
        .limit(5);
      
      if (questionsError) {
        console.log('❌ Error fetching question details:', questionsError.message);
      } else {
        console.log(`❓ Question details:`);
        questions?.forEach((q, index) => {
          console.log(`   ${index + 1}. ${q.question} (${q.type}) in ${q.quizzes.title}`);
          console.log(`      Quiz ID: ${q.quiz_id}`);
          console.log(`      Points: ${q.points}`);
        });
      }
    }
    
    if (tableResults.enrollments?.count > 0) {
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          id,
          student_id,
          course_id,
          status,
          created_at,
          profiles!inner(
            id,
            full_name,
            email,
            role
          ),
          courses!inner(
            id,
            title,
            course_code
          )
        `)
        .limit(5);
      
      if (enrollmentsError) {
        console.log('❌ Error fetching enrollment details:', enrollmentsError.message);
      } else {
        console.log(`👥 Enrollment details:`);
        enrollments?.forEach((e, index) => {
          console.log(`   ${index + 1}. ${e.profiles.full_name} (${e.profiles.role}) in ${e.courses.title}`);
          console.log(`      Status: ${e.status}`);
          console.log(`      Student ID: ${e.student_id}`);
        });
      }
    }
    
    // Test 4: Check RLS policies
    console.log('\n4️⃣ CHECKING RLS POLICIES...');
    
    try {
      const { data: policies, error: policiesError } = await supabase
        .rpc('get_table_policies', { table_name: 'quiz_questions' });
      
      if (policiesError) {
        console.log('⚠️ Could not check RLS policies (normal for anon key)');
        console.log('💡 RLS policies can only be checked with service role key');
      } else {
        console.log(`🔒 Found ${policies?.length || 0} RLS policies on quiz_questions`);
      }
    } catch (err) {
      console.log('⚠️ RLS policy check not available with current key');
    }
    
    // Test 5: Simulate student access
    console.log('\n5️⃣ SIMULATING STUDENT ACCESS...');
    
    const { data: studentAccess, error: studentAccessError } = await supabase
      .from('quiz_questions')
      .select(`
        id,
        quiz_id,
        question,
        type,
        points,
        quizzes!inner(
          id,
          title,
          status,
          course_id,
          courses!inner(
            id,
            title,
            course_code
          )
        )
      `)
      .eq('quizzes.status', 'published');
    
    if (studentAccessError) {
      console.log('❌ Student access blocked:', studentAccessError.message);
      console.log('💡 This confirms RLS policy is blocking student access');
    } else {
      console.log(`✅ Student access simulation: ${studentAccess?.length || 0} questions accessible`);
    }
    
    // Summary
    console.log('\n📋 DIAGNOSIS SUMMARY:');
    console.log('======================');
    console.log(`👤 Profiles: ${tableResults.profiles?.count || 0}`);
    console.log(`📚 Courses: ${tableResults.courses?.count || 0}`);
    console.log(`👥 Enrollments: ${tableResults.enrollments?.count || 0}`);
    console.log(`📝 Quizzes: ${tableResults.quizzes?.count || 0}`);
    console.log(`❓ Quiz Questions: ${tableResults.quiz_questions?.count || 0}`);
    console.log(`📊 Quiz Attempts: ${tableResults.quiz_attempts?.count || 0}`);
    console.log(`🔍 Student Access: ${studentAccess?.length || 0} questions`);
    
    // Final diagnosis
    console.log('\n🎯 FINAL DIAGNOSIS:');
    console.log('===================');
    
    if (tableResults.quizzes?.count === 0) {
      console.log('❌ NO QUIZZES FOUND');
      console.log('💡 Your quizzes are not in this database');
      console.log('🔧 Check if you\'re using the correct Supabase project');
    } else if (tableResults.quiz_questions?.count === 0) {
      console.log('❌ NO QUIZ QUESTIONS FOUND');
      console.log('💡 Your quiz questions are not in this database');
      console.log('🔧 Check if questions were actually saved');
    } else if (tableResults.enrollments?.count === 0) {
      console.log('❌ NO ENROLLMENTS FOUND');
      console.log('💡 Students are not enrolled in any courses');
      console.log('🔧 Enroll students in courses first');
    } else if ((studentAccess?.length || 0) === 0) {
      console.log('❌ STUDENT ACCESS BLOCKED');
      console.log('💡 RLS policies are preventing students from seeing questions');
      console.log('🔧 Fix RLS policies on quiz_questions table');
    } else {
      console.log('✅ ALL CHECKS PASSED');
      console.log('💡 Student access should be working');
    }
    
    return tableResults;
    
  } catch (error) {
    console.error('\n❌ COMPREHENSIVE CHECK FAILED:', error.message);
    throw error;
  }
}

// Run the check
console.log('Starting comprehensive database check...\n');

comprehensiveDatabaseCheck()
  .then((results) => {
    console.log('\n✅ Comprehensive check completed!');
    console.log('🎯 Check the diagnosis above to identify the exact issue');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error.message);
    process.exit(1);
  });



