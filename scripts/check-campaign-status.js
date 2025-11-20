const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCampaign() {
  const campaignId = 'f7881b5c-c50e-42c1-8a3b-e2aa91e84a18';
  
  console.log(`Checking campaign: ${campaignId}\n`);
  
  // Get campaign recipients
  const { data: recipients, error: recError } = await supabase
    .from('campaign_recipients')
    .select('*, contact:contacts(*)')
    .eq('campaign_id', campaignId);
  
  console.log('Campaign Recipients:');
  recipients?.forEach(r => {
    console.log(`  - ${r.contact?.name || r.contact?.phone_number}`);
    console.log(`    Status: ${r.status}`);
    console.log(`    Delivered At: ${r.delivered_at || 'null'}`);
    console.log(`    Sent At: ${r.sent_at || 'null'}`);
    console.log('');
  });
  
  // Get call logs
  const { data: logs, error: logError } = await supabase
    .from('call_logs')
    .select('*, contact:contacts(*)')
    .eq('campaign_id', campaignId);
  
  console.log('\nCall Logs:');
  logs?.forEach(l => {
    console.log(`  - ${l.contact?.name || l.contact?.phone_number}`);
    console.log(`    Call Status: ${l.call_status}`);
    console.log(`    Answered: ${l.answered}`);
    console.log(`    Duration: ${l.duration_seconds}s`);
    console.log(`    Twilio SID: ${l.twilio_call_sid}`);
    console.log('');
  });
}

checkCampaign().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});

