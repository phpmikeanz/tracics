const { createClient } = require('@supabase/supabase-js');

// Test script to verify quiz submission fix
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hdogujyfbjvvewwotman.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQuizSubmissionFix() {
  try {
    console.log('🧪 Testing quiz submission fix...');
    
    // Test 1: Check if we can create a notification directly
    console.log('\n1. Testing direct notification creation...');
    
    const { data: testUser } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();
    
    if (!testUser) {
      console.log('❌ No test user found');
      return;
    }
    
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: testUser.id,
        title: 'Test Quiz Notification',
        message: 'Testing notification creation after RLS fix',
        type: 'quiz',
        read: false
      })
      .select()
      .single();
    
    if (notificationError) {
      console.log('❌ Notification creation failed:', notificationError.message);
    } else {
      console.log('✅ Notification created successfully:', notification.id);
      
      // Clean up
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notification.id);
    }
    
    // Test 2: Check RLS policies
    console.log('\n2. Checking RLS policies...');
    
    const { data: policies, error: policiesError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE tablename = 'notifications'
          ORDER BY policyname;
        `
      });
    
    if (policiesError) {
      console.log('❌ Could not check policies:', policiesError.message);
    } else {
      console.log('✅ RLS policies found:', policies?.length || 0);
      policies?.forEach(policy => {
        console.log(`   - ${policy.policyname}: ${policy.cmd} (${policy.permissive ? 'permissive' : 'restrictive'})`);
      });
    }
    
    // Test 3: Check if quiz_attempts table has the trigger
    console.log('\n3. Checking quiz trigger...');
    
    const { data: triggers, error: triggersError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            trigger_name,
            event_manipulation,
            action_timing,
            action_statement
          FROM information_schema.triggers 
          WHERE trigger_name = 'trigger_notify_quiz_attempt';
        `
      });
    
    if (triggersError) {
      console.log('❌ Could not check triggers:', triggersError.message);
    } else {
      console.log('✅ Quiz trigger found:', triggers?.length || 0);
      triggers?.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name}: ${trigger.action_timing} ${trigger.event_manipulation}`);
      });
    }
    
    console.log('\n🎉 Quiz submission fix test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testQuizSubmissionFix();

