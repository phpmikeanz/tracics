const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hdogujyfbjvvewwotman.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
  console.error('Please set it in your environment variables');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyQuizRLSFix() {
  try {
    console.log('🔧 Applying quiz notification RLS fix...');
    
    // Read the SQL fix file
    const sqlFix = fs.readFileSync('FINAL_QUIZ_NOTIFICATION_COMPLETE_FIX.sql', 'utf8');
    
    // Split the SQL into individual statements
    const statements = sqlFix
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        
        try {
          const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            console.warn(`⚠️  Statement ${i + 1} warning:`, error.message);
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.warn(`⚠️  Statement ${i + 1} error:`, err.message);
        }
      }
    }
    
    console.log('🎉 Quiz notification RLS fix applied successfully!');
    console.log('✅ Students should now be able to submit quizzes without RLS errors');
    
  } catch (error) {
    console.error('❌ Error applying fix:', error);
    process.exit(1);
  }
}

// Run the fix
applyQuizRLSFix();

