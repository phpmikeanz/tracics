// Test script to verify quiz notification fix
const { createClient } = require('@supabase/supabase-js');

async function testQuizNotificationFix() {
  // Use the service role key for testing
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    console.log('Testing quiz notification fix...\n');

    // 1. Check if we can access notifications table
    console.log('1. Checking notifications table access...');
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('id, user_id, title, type')
      .limit(5);
    
    if (notifError) {
      console.error('❌ Error accessing notifications:', notifError.message);
      return;
    }
    console.log('✅ Notifications table accessible');

    // 2. Check RLS policies
    console.log('\n2. Checking RLS policies...');
    const { data: policies, error: policyError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT policyname, cmd, with_check
        FROM pg_policies 
        WHERE tablename = 'notifications'
        ORDER BY policyname;
      `
    });
    
    if (policyError) {
      console.error('❌ Error checking policies:', policyError.message);
    } else {
      console.log('✅ RLS policies found:');
      policies.forEach(policy => {
        console.log(`   - ${policy.policyname} (${policy.cmd})`);
      });
    }

    // 3. Check if trigger exists
    console.log('\n3. Checking quiz notification trigger...');
    const { data: triggers, error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT trigger_name, event_manipulation, action_timing
        FROM information_schema.triggers 
        WHERE trigger_name = 'trigger_notify_quiz_attempt';
      `
    });
    
    if (triggerError) {
      console.error('❌ Error checking triggers:', triggerError.message);
    } else if (triggers && triggers.length > 0) {
      console.log('✅ Quiz notification trigger exists');
    } else {
      console.log('❌ Quiz notification trigger not found');
    }

    // 4. Test notification creation
    console.log('\n4. Testing notification creation...');
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (users && users.length > 0) {
      const testUserId = users[0].id;
      
      const { data: testNotif, error: testError } = await supabase
        .from('notifications')
        .insert({
          user_id: testUserId,
          title: 'Test Notification',
          message: 'Testing RLS fix',
          type: 'test',
          read: false
        })
        .select()
        .single();

      if (testError) {
        console.error('❌ Error creating test notification:', testError.message);
      } else {
        console.log('✅ Test notification created successfully');
        
        // Clean up
        await supabase
          .from('notifications')
          .delete()
          .eq('id', testNotif.id);
        console.log('✅ Test notification cleaned up');
      }
    } else {
      console.log('⚠️  No users found for testing');
    }

    console.log('\n🎉 Quiz notification fix test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testQuizNotificationFix();
