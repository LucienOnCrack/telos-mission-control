/**
 * Fix Campaign Recipient Status
 * Syncs campaign_recipients status with actual call_logs data
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixCampaignStatus(campaignId: string) {
  console.log('═'.repeat(80))
  console.log(`🔧 FIXING CAMPAIGN STATUS: ${campaignId}`)
  console.log('═'.repeat(80))

  // 1. Get all call logs for this campaign
  const { data: callLogs, error: callLogsError } = await supabase
    .from('call_logs')
    .select('*, contact:contacts(*)')
    .eq('campaign_id', campaignId)

  if (callLogsError) {
    console.error('❌ Error fetching call logs:', callLogsError)
    return
  }

  console.log(`\n📊 Found ${callLogs?.length || 0} call logs`)

  if (!callLogs || callLogs.length === 0) {
    console.log('⚠️ No call logs found for this campaign')
    return
  }

  // 2. For each call log, update the recipient status
  let updatedCount = 0
  let alreadyCorrect = 0

  for (const callLog of callLogs) {
    const contactId = callLog.contact_id
    const phoneNumber = callLog.contact?.phone_number || 'Unknown'

    // Determine correct status based on call log
    let newStatus = 'sent'
    let deliveredAt = null
    let failedAt = null
    let errorMessage = null

    if (callLog.answered) {
      newStatus = 'delivered'
      deliveredAt = callLog.answered_at || new Date().toISOString()
    } else if (callLog.call_status === 'completed' && callLog.duration_seconds > 0) {
      newStatus = 'delivered'
      deliveredAt = callLog.ended_at || new Date().toISOString()
    } else if (['failed', 'busy', 'no-answer', 'canceled'].includes(callLog.call_status)) {
      newStatus = 'failed'
      failedAt = callLog.ended_at || new Date().toISOString()
      errorMessage = `Call ${callLog.call_status}`
    }

    // Get current recipient status
    const { data: recipient, error: recipientError } = await supabase
      .from('campaign_recipients')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('contact_id', contactId)
      .single()

    if (recipientError || !recipient) {
      console.error(`❌ Error fetching recipient for ${phoneNumber}:`, recipientError)
      continue
    }

    console.log(`\n📞 ${phoneNumber}`)
    console.log(`   Current Status: ${recipient.status}`)
    console.log(`   Call Status: ${callLog.call_status}`)
    console.log(`   Answered: ${callLog.answered ? 'Yes' : 'No'}`)
    console.log(`   Duration: ${callLog.duration_seconds}s`)

    // Check if update is needed
    if (recipient.status === newStatus && recipient.status !== 'pending') {
      console.log(`   ✅ Already correct (${newStatus})`)
      alreadyCorrect++
      continue
    }

    // Update recipient status
    const updateData: any = {
      status: newStatus,
    }

    if (newStatus === 'sent' && !recipient.sent_at) {
      updateData.sent_at = callLog.created_at || new Date().toISOString()
    }

    if (newStatus === 'delivered') {
      updateData.delivered_at = deliveredAt
    }

    if (newStatus === 'failed') {
      updateData.failed_at = failedAt
      updateData.error_message = errorMessage
    }

    const { error: updateError } = await supabase
      .from('campaign_recipients')
      .update(updateData)
      .eq('campaign_id', campaignId)
      .eq('contact_id', contactId)

    if (updateError) {
      console.error(`   ❌ Error updating:`, updateError)
    } else {
      console.log(`   ✅ Updated: ${recipient.status} → ${newStatus}`)
      updatedCount++
    }
  }

  console.log('\n' + '═'.repeat(80))
  console.log(`✅ COMPLETE`)
  console.log(`   Updated: ${updatedCount}`)
  console.log(`   Already Correct: ${alreadyCorrect}`)
  console.log(`   Total: ${callLogs.length}`)
  console.log('═'.repeat(80))
}

// Run for the specific campaign
const campaignId = process.argv[2] || 'b3774715-1aa8-413c-a3e8-2fc5dc35cb68'
fixCampaignStatus(campaignId)

