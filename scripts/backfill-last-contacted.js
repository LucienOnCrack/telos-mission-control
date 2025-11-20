#!/usr/bin/env node

/**
 * Backfill last_contacted_at for all contacts based on existing campaign data
 * Run with: node scripts/backfill-last-contacted.js
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function backfillLastContacted() {
  console.log('═'.repeat(80));
  console.log('🔄 BACKFILLING last_contacted_at FOR ALL CONTACTS');
  console.log('═'.repeat(80));
  console.log('');

  try {
    // Get all contacts
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, phone_number, name');

    if (contactsError) {
      throw contactsError;
    }

    console.log(`📊 Found ${contacts.length} total contacts\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const contact of contacts) {
      const contactInfo = `${contact.phone_number}${contact.name ? ` (${contact.name})` : ''}`;
      
      // Find most recent successful contact via SMS (delivered)
      const { data: smsRecipients, error: smsError } = await supabase
        .from('campaign_recipients')
        .select('delivered_at')
        .eq('contact_id', contact.id)
        .eq('status', 'delivered')
        .not('delivered_at', 'is', null)
        .order('delivered_at', { ascending: false })
        .limit(1);

      if (smsError) {
        console.error(`❌ Error fetching SMS data for ${contactInfo}:`, smsError);
        continue;
      }

      // Find most recent successful contact via voice (answered call with 3+ seconds)
      const { data: callLogs, error: callError } = await supabase
        .from('call_logs')
        .select('answered_at')
        .eq('contact_id', contact.id)
        .eq('answered', true)
        .not('answered_at', 'is', null)
        .order('answered_at', { ascending: false })
        .limit(1);

      if (callError) {
        console.error(`❌ Error fetching call data for ${contactInfo}:`, callError);
        continue;
      }

      // Determine the most recent contact timestamp
      let lastContactedAt = null;

      const smsTimestamp = smsRecipients?.[0]?.delivered_at;
      const callTimestamp = callLogs?.[0]?.answered_at;

      if (smsTimestamp && callTimestamp) {
        // Both exist - use the most recent
        lastContactedAt = new Date(smsTimestamp) > new Date(callTimestamp) 
          ? smsTimestamp 
          : callTimestamp;
      } else if (smsTimestamp) {
        lastContactedAt = smsTimestamp;
      } else if (callTimestamp) {
        lastContactedAt = callTimestamp;
      }

      if (lastContactedAt) {
        // Update contact
        const { error: updateError } = await supabase
          .from('contacts')
          .update({ last_contacted_at: lastContactedAt })
          .eq('id', contact.id);

        if (updateError) {
          console.error(`❌ Error updating ${contactInfo}:`, updateError);
          continue;
        }

        console.log(`✅ ${contactInfo}`);
        console.log(`   Last contacted: ${new Date(lastContactedAt).toLocaleString()}`);
        updatedCount++;
      } else {
        console.log(`⏭️  ${contactInfo} - Never contacted`);
        skippedCount++;
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('✅ BACKFILL COMPLETE');
    console.log(`   Updated: ${updatedCount} contacts`);
    console.log(`   Skipped: ${skippedCount} contacts (never contacted)`);
    console.log(`   Total: ${contacts.length} contacts`);
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('\n' + '═'.repeat(80));
    console.error('❌ ERROR:');
    console.error(error);
    console.error('═'.repeat(80));
    process.exit(1);
  }
}

backfillLastContacted();

