const { createClient } = require('@supabase/supabase-js');

// Simple test to verify quiz submission fix
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hdogujyfbjvvewwotman.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQuizFix() {
  try {
    console.log('🧪 Testing quiz submission fix...');
    
    // Test 1: Check RLS status
    console.log('\n1. Checking RLS status on notifications table...');
    
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            schemaname,
            tablename,
            rowsecurity as rls_enabled
          FROM pg_tables 
          WHERE tablename = 'notifications' 
          AND schemaname = 'public';
        `
      });
    
    if (rlsError) {
      console.log('❌ Could not check RLS status:', rlsError.message);
    } else {
      console.log('✅ RLS status:', rlsStatus);
      if (rlsStatus && rlsStatus.length > 0) {
        console.log(`   RLS Enabled: ${rlsStatus[0].rls_enabled}`);
      }
    }
    
    // Test 2: Try to create a notification
    console.log('\n2. Testing notification creation...');
    
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
        message: 'Testing notification creation after final fix',
        type: 'quiz',
        read: false
      })
      .select()
      .single();
    
    if (notificationError) {
      console.log('❌ Notification creation failed:', notificationError.message);
      console.log('   Error code:', notificationError.code);
    } else {
      console.log('✅ Notification created successfully:', notification.id);
      
      // Clean up
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notification.id);
      console.log('   Test notification cleaned up');
    }
    
    // Test 3: Check if trigger exists
    console.log('\n3. Checking quiz trigger...');
    
    const { data: triggers, error: triggersError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            trigger_name,
            event_manipulation,
            action_timing
          FROM information_schema.triggers 
          WHERE trigger_name = 'trigger_notify_quiz_attempt';
        `
      });
    
    if (triggersError) {
      console.log('❌ Could not check triggers:', triggersError.message);
    } else {
      console.log('✅ Quiz trigger found:', triggers?.length || 0);
      if (triggers && triggers.length > 0) {
        console.log(`   Trigger: ${triggers[0].trigger_name} (${triggers[0].action_timing} ${triggers[0].event_manipulation})`);
      }
    }
    
    console.log('\n🎉 Quiz fix test completed!');
    console.log('If notification creation succeeded, quiz submissions should work now.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testQuizFix();

