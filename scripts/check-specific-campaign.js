const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Check the campaign from the screenshot with all the "sent" calls
const campaignId = '2a296d69-9e8b-4ea0-82bc-ec2e9f1f8ee4'; // The one with Faiz, Ella, Josh, etc

async function checkCampaign() {
  console.log(`Checking campaign: ${campaignId}\n`);
  
  // Get campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();
  
  console.log('Campaign:', {
    id: campaign?.id,
    type: campaign?.type,
    status: campaign?.status,
    created_at: campaign?.created_at,
    sent_at: campaign?.sent_at
  });
  console.log('');
  
  // Get all recipients
  const { data: recipients } = await supabase
    .from('campaign_recipients')
    .select('*, contact:contacts(*)')
    .eq('campaign_id', campaignId);
  
  console.log(`Recipients: ${recipients?.length || 0}`);
  console.log('');
  
  for (const r of recipients || []) {
    console.log(`${r.contact?.name} - ${r.status}`);
    
    // Check for call log
    const { data: log } = await supabase
      .from('call_logs')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('contact_id', r.contact_id)
      .single();
    
    if (log) {
      console.log(`  ✅ Call log exists: ${log.call_status}, SID: ${log.twilio_call_sid}`);
    } else {
      console.log(`  ❌ NO CALL LOG - webhook never received or call never made`);
    }
  }
}

checkCampaign().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});

