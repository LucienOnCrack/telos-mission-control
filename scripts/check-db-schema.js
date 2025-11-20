const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  console.log('Checking database schema...\n');
  
  // Check campaign_recipients columns
  const { data: recipients, error: recError } = await supabase
    .from('campaign_recipients')
    .select('*')
    .limit(1);
  
  console.log('campaign_recipients columns:');
  if (recipients && recipients[0]) {
    console.log(Object.keys(recipients[0]).join(', '));
  } else {
    console.log('No data found or error:', recError?.message);
  }
  
  // Check call_logs columns
  const { data: logs, error: logError } = await supabase
    .from('call_logs')
    .select('*')
    .limit(1);
  
  console.log('\ncall_logs columns:');
  if (logs && logs[0]) {
    console.log(Object.keys(logs[0]).join(', '));
  } else {
    console.log('No data found or error:', logError?.message);
  }
}

checkSchema().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});

