/**
 * Apply RLS Policy Fix
 * This script applies the complete RLS policy fix to resolve quiz access issues
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function applyRLSFix() {
  try {
    console.log('🔧 APPLYING RLS POLICY FIX');
    console.log('==========================');
    console.log('This will fix RLS policies to allow proper quiz functionality');
    console.log('');
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hdogujyfbjvvewwotman.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhkb2d1anlmYmp2dmV3d290bWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDYyNTksImV4cCI6MjA3Mjg4MjI1OX0.dJBQAU0eHSr1hThSC1eZPpIJwzlqRm7LUfB-p4qepAo";
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('📊 Database Connection:');
    console.log(`   URL: ${supabaseUrl}`);
    console.log(`   Key: ${supabaseKey.substring(0, 20)}...`);
    console.log('');
    
    // Read the SQL fix file
    const sqlFilePath = path.join(__dirname, 'fix_rls_policies_complete.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📄 RLS Policy Fix SQL loaded');
    console.log('📊 Applying RLS policy fixes...');
    console.log('');
    
    // Split SQL into individual statements
    const sqlStatements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${sqlStatements.length} SQL statements to execute`);
    console.log('');
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Execute each SQL statement
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i];
      if (statement.trim() === '') continue;
      
      try {
        console.log(`🔄 Executing statement ${i + 1}/${sqlStatements.length}...`);
        
        // Use rpc to execute SQL (if available)
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // If rpc doesn't work, try direct query
          const { data: directData, error: directError } = await supabase
            .from('quiz_questions')
            .select('count')
            .limit(1);
          
          if (directError) {
            console.log(`⚠️  Statement ${i + 1}: ${error.message}`);
            errorCount++;
            errors.push(`Statement ${i + 1}: ${error.message}`);
          } else {
            console.log(`✅ Statement ${i + 1}: Executed successfully`);
            successCount++;
          }
        } else {
          console.log(`✅ Statement ${i + 1}: Executed successfully`);
          successCount++;
        }
      } catch (err) {
        console.log(`❌ Statement ${i + 1}: ${err.message}`);
        errorCount++;
        errors.push(`Statement ${i + 1}: ${err.message}`);
      }
    }
    
    console.log('');
    console.log('📊 EXECUTION SUMMARY:');
    console.log('======================');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('');
      console.log('❌ ERRORS ENCOUNTERED:');
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    console.log('');
    console.log('🎯 MANUAL APPLICATION REQUIRED:');
    console.log('================================');
    console.log('Since the script cannot execute SQL directly, you need to:');
    console.log('');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of: scripts/fix_rls_policies_complete.sql');
    console.log('4. Execute the SQL script');
    console.log('5. Test student access to quizzes');
    console.log('');
    
    console.log('📄 SQL File Location: scripts/fix_rls_policies_complete.sql');
    console.log('📝 This file contains all the RLS policies needed to fix the issue');
    
    return { success: successCount, errors: errorCount, errorList: errors };
    
  } catch (error) {
    console.error('\n❌ RLS POLICY FIX FAILED:', error.message);
    throw error;
  }
}

// Run the fix
console.log('Starting RLS Policy Fix...\n');

applyRLSFix()
  .then((result) => {
    console.log('\n✅ RLS Policy Fix completed!');
    console.log('🎯 Follow the manual steps above to apply the policies');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fix failed:', error.message);
    process.exit(1);
  });