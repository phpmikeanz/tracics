const { createClient } = require('@supabase/supabase-js');

async function checkPolicies() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
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
    
    if (error) {
      console.error('Error checking policies:', error);
    } else {
      console.log('Current notification policies:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

checkPolicies();
