import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

/**
 * Fix Campaign Recipient Status
 * Syncs campaign_recipients status with actual call_logs data
 * GET /api/admin/fix-campaign-status?campaignId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')

    if (!campaignId) {
      return NextResponse.json({ error: "campaignId is required" }, { status: 400 })
    }

    console.log('═'.repeat(80))
    console.log(`🔧 FIXING CAMPAIGN STATUS: ${campaignId}`)
    console.log('═'.repeat(80))

    // 1. Get all call logs for this campaign
    const { data: callLogs, error: callLogsError } = await supabaseAdmin
      .from('call_logs')
      .select('*, contact:contacts(*)')
      .eq('campaign_id', campaignId)

    if (callLogsError) {
      console.error('❌ Error fetching call logs:', callLogsError)
      return NextResponse.json({ error: "Failed to fetch call logs", details: callLogsError }, { status: 500 })
    }

    console.log(`\n📊 Found ${callLogs?.length || 0} call logs`)

    if (!callLogs || callLogs.length === 0) {
      return NextResponse.json({ 
        message: "No call logs found for this campaign",
        updated: 0,
        alreadyCorrect: 0
      })
    }

    // 2. For each call log, update the recipient status
    let updatedCount = 0
    let alreadyCorrect = 0
    const updates: any[] = []

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
      const { data: recipient, error: recipientError } = await supabaseAdmin
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

      const { error: updateError } = await supabaseAdmin
        .from('campaign_recipients')
        .update(updateData)
        .eq('campaign_id', campaignId)
        .eq('contact_id', contactId)

      if (updateError) {
        console.error(`   ❌ Error updating:`, updateError)
        updates.push({
          phone: phoneNumber,
          success: false,
          error: updateError.message
        })
      } else {
        console.log(`   ✅ Updated: ${recipient.status} → ${newStatus}`)
        updatedCount++
        updates.push({
          phone: phoneNumber,
          oldStatus: recipient.status,
          newStatus,
          success: true
        })
      }
    }

    console.log('\n' + '═'.repeat(80))
    console.log(`✅ COMPLETE`)
    console.log(`   Updated: ${updatedCount}`)
    console.log(`   Already Correct: ${alreadyCorrect}`)
    console.log(`   Total: ${callLogs.length}`)
    console.log('═'.repeat(80))

    return NextResponse.json({
      success: true,
      campaignId,
      updated: updatedCount,
      alreadyCorrect,
      total: callLogs.length,
      updates
    })

  } catch (error: any) {
    console.error("Error in fix-campaign-status:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}

