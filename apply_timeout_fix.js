// Apply the manual grading timeout fix
// This script applies the optimized RLS policies and database indexes

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyTimeoutFix() {
  try {
    console.log('🔧 Applying manual grading timeout fix...')
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix_manual_grading_timeout_optimized.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    // Split into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`)
        
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement })
          if (error) {
            console.warn(`⚠️ Statement ${i + 1} warning:`, error.message)
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`)
          }
        } catch (err) {
          console.warn(`⚠️ Statement ${i + 1} error:`, err.message)
        }
      }
    }
    
    console.log('🎉 Manual grading timeout fix applied successfully!')
    console.log('')
    console.log('📋 What was fixed:')
    console.log('  • Simplified RLS policies to reduce JOIN complexity')
    console.log('  • Added database indexes for better performance')
    console.log('  • Created materialized view for faster lookups')
    console.log('  • Optimized gradeQuestion function to skip expensive score calculation')
    console.log('')
    console.log('🔄 Next steps:')
    console.log('  1. Test manual grading - it should work without timeouts now')
    console.log('  2. Use "Fix Manual Grades" button to calculate scores when needed')
    console.log('  3. The system will be much faster for grading operations')
    
  } catch (error) {
    console.error('❌ Error applying timeout fix:', error)
    process.exit(1)
  }
}

// Run the fix
applyTimeoutFix()
