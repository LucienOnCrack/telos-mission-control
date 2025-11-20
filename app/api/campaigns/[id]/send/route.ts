import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { sendSMS, initiateVoiceCall } from "@/lib/twilio"

// POST /api/campaigns/[id]/send - Send campaign to all recipients
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add authentication when ready
    // const user = await requirePayingUser(request)

    const { id } = params

    // Fetch campaign
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      )
    }

    // Check if campaign can be sent
    if (campaign.status === "sending") {
      return NextResponse.json(
        { error: "Campaign is already being sent" },
        { status: 400 }
      )
    }

    if (campaign.status === "completed") {
      return NextResponse.json(
        { error: "Campaign has already been completed" },
        { status: 400 }
      )
    }

    // Update campaign status to sending
    await supabaseAdmin
      .from("campaigns")
      .update({
        status: "sending",
        sent_at: new Date().toISOString(),
      })
      .eq("id", id)

    // Fetch recipients with contact details
    const { data: recipients, error: recipientsError } = await supabaseAdmin
      .from("campaign_recipients")
      .select(`
        *,
        contact:contacts(*)
      `)
      .eq("campaign_id", id)
      .eq("status", "pending")

    if (recipientsError || !recipients || recipients.length === 0) {
      await supabaseAdmin
        .from("campaigns")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", id)

      return NextResponse.json({
        message: "No pending recipients to send to",
      })
    }

    // Send messages/calls asynchronously
    // In a production environment, you'd want to use a job queue
    sendCampaignMessages(campaign, recipients)

    return NextResponse.json({
      message: "Campaign is being sent",
      recipientCount: recipients.length,
    })
  } catch (error) {
    console.error("Error in POST /api/campaigns/[id]/send:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Send campaign messages in the background with comprehensive error logging
async function sendCampaignMessages(campaign: any, recipients: any[]) {
  const startTime = new Date()
  const errors: any[] = []
  const BATCH_SIZE = 20 // Twilio recommended limit
  const BATCH_DELAY_MS = 100 // 100ms between batches

  console.log('═'.repeat(80))
  console.log(`🚀 STARTING CAMPAIGN: ${campaign.id}`)
  console.log(`📊 Type: ${campaign.type}`)
  console.log(`👥 Recipients: ${recipients.length}`)
  console.log(`⏰ Started: ${startTime.toISOString()}`)
  console.log(`🔥 MODE: BATCHED PARALLEL (${BATCH_SIZE} calls per batch, ${BATCH_DELAY_MS}ms delay)`)
  console.log('═'.repeat(80))

  // Split recipients into batches
  const batches: any[][] = []
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    batches.push(recipients.slice(i, i + BATCH_SIZE))
  }
  
  console.log(`📦 Split into ${batches.length} batches of up to ${BATCH_SIZE} recipients`)

  // Process each batch sequentially, but recipients within batch in parallel
  const allResults: any[] = []
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    const batchNumber = batchIndex + 1
    
    console.log(`\n🔄 Processing batch ${batchNumber}/${batches.length} (${batch.length} recipients)`)
    
    const batchResults = await Promise.allSettled(
      batch.map(async (recipient, i) => {
        const overallIndex = batchIndex * BATCH_SIZE + i
        const phoneNumber = recipient.contact.phone_number
        const recipientNumber = overallIndex + 1
        
        console.log(`📞 [${recipientNumber}/${recipients.length}] Processing: ${phoneNumber}`)
      
      try {
      if (campaign.type === "sms") {
        console.log(`📱 Sending SMS to ${phoneNumber}...`)
        
        const result = await sendSMS(
          phoneNumber,
          campaign.message
        )

        if (!result.success) {
          // Mark as failed with detailed error
          console.error(`❌ SMS FAILED for ${phoneNumber}:`, result.error)
          
          const errorDetails = {
            phone: phoneNumber,
            error: result.error,
            details: result.errorDetails,
            timestamp: new Date().toISOString(),
          }
          errors.push(errorDetails)
          
          await supabaseAdmin
            .from("campaign_recipients")
            .update({
              status: "failed",
              failed_at: new Date().toISOString(),
              error_message: `${result.error}${result.errorDetails ? ` (Code: ${result.errorDetails.code})` : ''}`,
            })
            .eq("id", recipient.id)
          
          console.log(`❌ [${recipientNumber}/${recipients.length}] FAILED: ${phoneNumber}`)
          return { success: false, phone: phoneNumber, error: result.error }
        } else {
          // Mark as sent
          console.log(`✅ SMS sent to ${phoneNumber} (SID: ${result.data?.sid})`)
          
          await supabaseAdmin
            .from("campaign_recipients")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              twilio_message_sid: result.data?.sid,
            })
            .eq("id", recipient.id)
          
          console.log(`✅ [${recipientNumber}/${recipients.length}] SUCCESS: ${phoneNumber}`)
          return { success: true, phone: phoneNumber }
        }
        
      } else if (campaign.type === "voice") {
        console.log(`📞 Calling ${phoneNumber}...`)
        console.log(`🎵 Audio URL: ${campaign.audio_url}`)
        
        // Validate audio URL before calling
        if (!campaign.audio_url) {
          const errorMsg = 'No audio URL provided for voice campaign'
          console.error(`❌ ${errorMsg}`)
          errors.push({
            phone: phoneNumber,
            error: errorMsg,
            timestamp: new Date().toISOString(),
          })
          
          await supabaseAdmin
            .from("campaign_recipients")
            .update({
              status: "failed",
              failed_at: new Date().toISOString(),
              error_message: errorMsg,
            })
            .eq("id", recipient.id)
          
          return { success: false, phone: phoneNumber, error: errorMsg }
        }
        
        const result = await initiateVoiceCall(
          phoneNumber,
          campaign.audio_url,
          `${process.env.NEXT_PUBLIC_APP_URL || 'https://telos-mission-control.vercel.app'}/api/twilio/webhook`
        )

        if (!result.success) {
          // Mark as failed with detailed error
          console.error(`❌ CALL FAILED for ${phoneNumber}:`, result.error)
          
          const errorDetails = {
            phone: phoneNumber,
            error: result.error,
            details: result.errorDetails,
            audioUrl: campaign.audio_url,
            timestamp: new Date().toISOString(),
          }
          errors.push(errorDetails)
          
          await supabaseAdmin
            .from("campaign_recipients")
            .update({
              status: "failed",
              failed_at: new Date().toISOString(),
              error_message: `${result.error}${result.errorDetails ? ` (Code: ${result.errorDetails.code})` : ''}`,
            })
            .eq("id", recipient.id)
          
          console.log(`❌ [${recipientNumber}/${recipients.length}] FAILED: ${phoneNumber}`)
          return { success: false, phone: phoneNumber, error: result.error }
        } else {
          // Mark as sent and create call log
          console.log(`✅ Call initiated to ${phoneNumber} (CallSid: ${result.callSid})`)
          
          await supabaseAdmin
            .from("campaign_recipients")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("id", recipient.id)

          // Create call log entry
          if (result.callSid) {
            const { error: callLogError } = await supabaseAdmin.from("call_logs").insert({
              campaign_id: campaign.id,
              contact_id: recipient.contact_id,
              twilio_call_sid: result.callSid,
              call_status: 'initiated',
              answered: false,
              duration_seconds: 0,
            })
            
            if (callLogError) {
              console.error(`⚠️ Failed to create call log:`, callLogError)
            } else {
              console.log(`📝 Call log created for ${phoneNumber}`)
            }
          }

          console.log(`✅ [${recipientNumber}/${recipients.length}] SUCCESS: ${phoneNumber}`)
          return { success: true, phone: phoneNumber }
        }
        
      } else if (campaign.type === "whatsapp") {
        // WhatsApp support (future implementation)
        const errorMsg = 'WhatsApp is not yet supported'
        console.error(`❌ ${errorMsg}`)
        
        await supabaseAdmin
          .from("campaign_recipients")
          .update({
            status: "failed",
            failed_at: new Date().toISOString(),
            error_message: errorMsg,
          })
          .eq("id", recipient.id)
        
        return { success: false, phone: phoneNumber, error: errorMsg }
      }

      
      return { success: true, phone: phoneNumber }
    } catch (error: any) {
      console.error('═'.repeat(80))
      console.error(`❌ CRITICAL ERROR processing ${phoneNumber}:`)
      console.error(error)
      console.error('═'.repeat(80))
      
      errors.push({
        phone: phoneNumber,
        error: error.message || String(error),
        stack: error.stack,
        timestamp: new Date().toISOString(),
      })
      
      await supabaseAdmin
        .from("campaign_recipients")
        .update({
          status: "failed",
          failed_at: new Date().toISOString(),
          error_message: error.message || String(error),
        })
        .eq("id", recipient.id)
      
        return { success: false, phone: phoneNumber, error }
      }
      })
    )
    
    allResults.push(...batchResults)
    
    console.log(`✅ Batch ${batchNumber}/${batches.length} completed`)
    
    // Add delay between batches (except after last batch)
    if (batchIndex < batches.length - 1) {
      console.log(`⏸️  Waiting ${BATCH_DELAY_MS}ms before next batch...`)
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS))
    }
  }

  // Count results from all batches
  const successCount = allResults.filter(r => r.status === 'fulfilled' && r.value?.success).length
  const failCount = allResults.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value?.success)).length

  // Update campaign status to completed
  const finalStatus = failCount === recipients.length ? "failed" : "completed"
  await supabaseAdmin
    .from("campaigns")
    .update({
      status: finalStatus,
      completed_at: new Date().toISOString(),
    })
    .eq("id", campaign.id)

  const endTime = new Date()
  const durationSeconds = ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(2)
  
  console.log('\n' + '═'.repeat(80))
  console.log(`🏁 CAMPAIGN COMPLETED: ${campaign.id}`)
  console.log(`⏰ Started: ${startTime.toISOString()}`)
  console.log(`⏰ Finished: ${endTime.toISOString()}`)
  console.log(`⚡ Duration: ${durationSeconds}s`)
  console.log(`📦 Batches: ${batches.length} (${BATCH_SIZE} per batch)`)
  console.log(`✅ Successful: ${successCount}/${recipients.length}`)
  console.log(`❌ Failed: ${failCount}/${recipients.length}`)
  console.log(`📊 Success Rate: ${((successCount / recipients.length) * 100).toFixed(2)}%`)
  
  if (errors.length > 0) {
    console.log(`\n❌ ERRORS SUMMARY (${errors.length}):`)
    errors.forEach((err, idx) => {
      console.log(`  ${idx + 1}. ${err.phone}: ${err.error}`)
    })
  }
  
  console.log('═'.repeat(80))
}

