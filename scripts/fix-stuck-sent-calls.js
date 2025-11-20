const { createClient } = require('@supabase/supabase-js');
const twilio = require('twilio');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function fixStuckCalls() {
  console.log('🔧 Fixing stuck "sent" calls by checking Twilio status...\n');
  
  // Get all recipients with "sent" status
  const { data: stuckRecipients, error } = await supabase
    .from('campaign_recipients')
    .select('*, contact:contacts(*)')
    .eq('status', 'sent');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${stuckRecipients?.length || 0} calls stuck on "sent"\n`);
  
  for (const recipient of stuckRecipients || []) {
    console.log(`📞 ${recipient.contact?.name || recipient.contact?.phone_number}`);
    
    // Get call log to find Twilio SID
    const { data: callLog } = await supabase
      .from('call_logs')
      .select('*')
      .eq('campaign_id', recipient.campaign_id)
      .eq('contact_id', recipient.contact_id)
      .single();
    
    if (!callLog || !callLog.twilio_call_sid) {
      console.log(`   ⚠️  No call log or Twilio SID - skipping`);
      continue;
    }
    
    try {
      // Fetch actual status from Twilio
      const call = await twilioClient.calls(callLog.twilio_call_sid).fetch();
      
      console.log(`   Twilio Status: ${call.status}`);
      console.log(`   Duration: ${call.duration}s`);
      
      // Update based on Twilio's actual status
      if (call.status === 'completed') {
        const wasAnswered = parseInt(call.duration) >= 3;
        const newStatus = wasAnswered ? 'delivered' : 'failed';
        
        // Update call log
        await supabase
          .from('call_logs')
          .update({
            call_status: 'completed',
            duration_seconds: parseInt(call.duration),
            answered: wasAnswered,
            answered_at: wasAnswered ? call.startTime : null,
            ended_at: call.endTime
          })
          .eq('id', callLog.id);
        
        // Update recipient
        const recipientUpdate = { status: newStatus };
        if (wasAnswered) {
          recipientUpdate.delivered_at = call.endTime;
        } else {
          recipientUpdate.failed_at = call.endTime;
          recipientUpdate.error_message = 'Call completed but not answered';
        }
        
        await supabase
          .from('campaign_recipients')
          .update(recipientUpdate)
          .eq('id', recipient.id);
        
        console.log(`   ✅ Fixed: ${newStatus} (${call.duration}s)`);
      } else if (['busy', 'failed', 'no-answer', 'canceled'].includes(call.status)) {
        // Update to failed
        await supabase
          .from('call_logs')
          .update({
            call_status: call.status,
            answered: false,
            duration_seconds: 0,
            ended_at: call.endTime || new Date().toISOString()
          })
          .eq('id', callLog.id);
        
        await supabase
          .from('campaign_recipients')
          .update({
            status: 'failed',
            failed_at: call.endTime || new Date().toISOString(),
            error_message: `Call ${call.status}`
          })
          .eq('id', recipient.id);
        
        console.log(`   ✅ Fixed: failed (${call.status})`);
      } else {
        console.log(`   ⏳ Still in progress: ${call.status}`);
      }
    } catch (twilioError) {
      console.log(`   ❌ Error fetching from Twilio:`, twilioError.message);
    }
    console.log('');
  }
  
  console.log('✅ Done fixing stuck calls!');
}

fixStuckCalls().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});

