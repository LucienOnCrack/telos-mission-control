const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStuckCalls() {
  console.log('Checking for stuck "sent" calls...\n');
  
  // Get all recipients with "sent" status that are older than 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  
  const { data: stuckRecipients, error } = await supabase
    .from('campaign_recipients')
    .select('*, contact:contacts(*), campaign:campaigns(*)')
    .eq('status', 'sent')
    .lt('sent_at', fiveMinutesAgo);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${stuckRecipients?.length || 0} calls stuck on "sent"\n`);
  
  for (const recipient of stuckRecipients || []) {
    console.log(`📞 ${recipient.contact?.name || recipient.contact?.phone_number}`);
    console.log(`   Campaign: ${recipient.campaign_id}`);
    console.log(`   Sent At: ${recipient.sent_at}`);
    
    // Check if there's a call log for this
    const { data: callLog } = await supabase
      .from('call_logs')
      .select('*')
      .eq('campaign_id', recipient.campaign_id)
      .eq('contact_id', recipient.contact_id)
      .single();
    
    if (callLog) {
      console.log(`   ✅ Has call log:`);
      console.log(`      Status: ${callLog.call_status}`);
      console.log(`      Answered: ${callLog.answered}`);
      console.log(`      Duration: ${callLog.duration_seconds}s`);
      console.log(`      Twilio SID: ${callLog.twilio_call_sid}`);
    } else {
      console.log(`   ❌ NO CALL LOG FOUND - webhook never created it`);
    }
    console.log('');
  }
}

checkStuckCalls().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});

