const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugQuizQuestions() {
  console.log('=== DEBUGGING QUIZ QUESTIONS ACCESS ISSUE ===\n');

  try {
    // Check RLS policies
    console.log('1. Checking RLS policies for quiz_questions...');
    const { data: policies, error: policyError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual
        FROM pg_policies 
        WHERE tablename = 'quiz_questions'
        ORDER BY policyname;
      `
    });
    
    if (policyError) {
      console.error('Error checking policies:', policyError);
    } else {
      console.log('Current RLS policies:');
      console.log(JSON.stringify(policies, null, 2));
    }

    // Check total questions count
    console.log('\n2. Checking total question counts...');
    const { data: countData, error: countError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          COUNT(*) as total_questions,
          COUNT(DISTINCT quiz_id) as quizzes_with_questions
        FROM public.quiz_questions;
      `
    });
    
    if (countError) {
      console.error('Error checking question count:', countError);
    } else {
      console.log('Question counts:', countData);
    }

    // Check quizzes and their question counts
    console.log('\n3. Checking quizzes with question counts...');
    const { data: quizData, error: quizError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          q.id,
          q.title,
          q.status,
          q.course_id,
          COUNT(qq.id) as question_count
        FROM public.quizzes q
        LEFT JOIN public.quiz_questions qq ON q.id = qq.quiz_id
        GROUP BY q.id, q.title, q.status, q.course_id
        ORDER BY q.created_at DESC
        LIMIT 10;
      `
    });
    
    if (quizError) {
      console.error('Error checking quizzes:', quizError);
    } else {
      console.log('Quizzes with question counts:');
      console.log(JSON.stringify(quizData, null, 2));
    }

    // Check for questions with missing data
    console.log('\n4. Checking for questions with missing data...');
    const { data: invalidData, error: invalidError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          id,
          quiz_id,
          question,
          type,
          points,
          order_index,
          CASE 
            WHEN question IS NULL OR question = '' THEN 'Missing question text'
            WHEN type IS NULL OR type = '' THEN 'Missing type'
            WHEN points IS NULL THEN 'Missing points'
            ELSE 'Valid'
          END as validation_status
        FROM public.quiz_questions
        WHERE quiz_id IN (
          SELECT id FROM public.quizzes 
          WHERE status IN ('published', 'closed')
        )
        ORDER BY quiz_id, order_index
        LIMIT 20;
      `
    });
    
    if (invalidError) {
      console.error('Error checking invalid questions:', invalidError);
    } else {
      console.log('Question validation status:');
      console.log(JSON.stringify(invalidData, null, 2));
    }

    // Check enrollments
    console.log('\n5. Checking recent enrollments...');
    const { data: enrollData, error: enrollError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          e.*,
          c.title as course_title,
          p.full_name as student_name
        FROM public.enrollments e
        JOIN public.courses c ON e.course_id = c.id
        JOIN public.profiles p ON e.student_id = p.id
        WHERE e.status = 'approved'
        ORDER BY e.created_at DESC
        LIMIT 5;
      `
    });
    
    if (enrollError) {
      console.error('Error checking enrollments:', enrollError);
    } else {
      console.log('Recent enrollments:');
      console.log(JSON.stringify(enrollData, null, 2));
    }

  } catch (error) {
    console.error('Error in debug function:', error);
  }
}

debugQuizQuestions().catch(console.error);
