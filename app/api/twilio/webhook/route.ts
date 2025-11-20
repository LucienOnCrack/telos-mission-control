import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * Twilio Webhook Handler
 * Receives webhooks from Twilio for:
 * - Voice call status updates (initiated, ringing, answered, completed)
 * - SMS delivery status updates
 * 
 * Configure this URL in your Twilio Console:
 * https://your-domain.com/api/twilio/webhook
 */
export async function POST(request: NextRequest) {
  const context = 'Twilio Webhook Handler'
  const timestamp = new Date().toISOString()
  
  try {
    // Parse form-urlencoded data from Twilio
    const formData = await request.formData()
    const data: any = {}
    formData.forEach((value, key) => {
      data[key] = value
    })
    
    console.log('═'.repeat(80))
    console.log(`📞 TWILIO WEBHOOK RECEIVED`)
    console.log(`⏰ Timestamp: ${timestamp}`)
    console.log(`📋 Data:`, JSON.stringify(data, null, 2))
    console.log('═'.repeat(80))

    const callSid = data.CallSid || data.MessageSid
    const callStatus = data.CallStatus || data.MessageStatus
    const to = data.To || data.To
    const from = data.From || data.From
    
    if (!callSid) {
      console.error('❌ ERROR: No CallSid or MessageSid in webhook data')
      return NextResponse.json(
        { error: "Missing CallSid or MessageSid" },
        { status: 400 }
      )
    }

    console.log(`🔍 Processing webhook for SID: ${callSid}`)
    console.log(`📊 Status: ${callStatus}`)
    console.log(`📞 To: ${to}`)
    console.log(`📱 From: ${from}`)

    // Handle voice call events
    if (data.CallSid) {
      await handleVoiceCallEvent(data)
    }
    
    // Handle SMS events
    if (data.MessageSid) {
      await handleSMSEvent(data)
    }

    return NextResponse.json({ received: true, status: 'processed' })
  } catch (error) {
    console.error('═'.repeat(80))
    console.error(`❌ ERROR IN: ${context}`)
    console.error(`⏰ Timestamp: ${timestamp}`)
    console.error(`📝 Error:`, error)
    console.error('═'.repeat(80))
    
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * Handle Voice Call Events
 */
async function handleVoiceCallEvent(data: any) {
  const callSid = data.CallSid
  const callStatus = data.CallStatus // initiated, ringing, in-progress, completed, busy, failed, no-answer, canceled
  const callDuration = data.CallDuration ? parseInt(data.CallDuration) : 0
  const answeredBy = data.AnsweredBy // human, machine_start, machine_end_beep, machine_end_silence, fax, unknown
  const to = data.To
  const from = data.From
  
  console.log(`🔄 Processing voice call event: ${callStatus}`)
  if (answeredBy) {
    console.log(`🤖 Answered by: ${answeredBy}`)
  }
  
  // If answered by a machine/voicemail, mark as failed immediately
  if (answeredBy && answeredBy.startsWith('machine')) {
    console.log(`📞 Voicemail detected for ${to} - marking as failed`)
    await updateCallLog(callSid, {
      call_status: 'machine-detected',
      answered: false,
      duration_seconds: 0,
      ended_at: new Date().toISOString(),
    })
    await updateRecipientStatus(callSid, 'failed', 'Voicemail detected')
    return // Don't process further
  }

  try {
    // Find the call log entry
    console.log(`🔍 Searching for call log with CallSid: ${callSid}`)
    const { data: callLog, error: fetchError } = await supabaseAdmin
      .from("call_logs")
      .select("*")
      .eq("twilio_call_sid", callSid)
      .single()

    console.log(`📊 Call log query result:`, {
      found: !!callLog,
      error: fetchError,
      callLogId: callLog?.id
    })

    if (fetchError || !callLog) {
      console.warn(`⚠️ No call log found for CallSid: ${callSid}`)
      console.warn(`   Error:`, fetchError)
      console.warn(`   This might be the first event. Creating call log...`)
      console.warn(`   Searching for recipient with phone: ${to}`)
      
      // Try to find the campaign by phone number
      const { data: recipient, error: recipientError } = await supabaseAdmin
        .from("campaign_recipients")
        .select("*, campaign:campaigns(*), contact:contacts(*)")
        .eq("contact.phone_number", to)
        .in("status", ["pending", "sent"])  // Include both pending and sent
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      console.log(`📋 Recipient search result:`, {
        found: !!recipient,
        error: recipientError,
        recipientId: recipient?.id,
        contactPhone: recipient?.contact?.phone_number
      })

      if (recipient) {
        // Create call log
        const { error: insertError } = await supabaseAdmin
          .from("call_logs")
          .insert({
            campaign_id: recipient.campaign_id,
            contact_id: recipient.contact_id,
            twilio_call_sid: callSid,
            call_status: callStatus,
            answered: false,
            duration_seconds: 0,
          })

        if (insertError) {
          console.error(`❌ Failed to create call log:`, insertError)
        } else {
          console.log(`✅ Created call log for CallSid: ${callSid}`)
        }
      }
    }

    // Update call status based on event
    switch (callStatus) {
      case 'initiated':
        console.log(`📤 Call initiated to ${to}`)
        await updateCallLog(callSid, {
          call_status: 'initiated',
        })
        break

      case 'ringing':
        console.log(`📞 Call ringing to ${to}`)
        await updateCallLog(callSid, {
          call_status: 'ringing',
        })
        break

      case 'in-progress':
      case 'answered':
        // Don't mark as answered yet - wait for completed event to check duration
        // in-progress can fire even for calls that are immediately declined
        console.log(`📞 Call in-progress with ${to}`)
        await updateCallLog(callSid, {
          call_status: 'in-progress',
        })
        break

      case 'completed':
        console.log(`🏁 Call completed to ${to}`)
        console.log(`   Duration: ${callDuration} seconds`)
        
        // ONLY mark as answered if duration is at least 3 seconds
        // Declined calls will have 0-2 seconds, answered calls will have 3+ seconds
        const wasAnswered = callDuration >= 3
        
        console.log(`   Was Answered: ${wasAnswered} (threshold: 3 seconds)`)
        
        await updateCallLog(callSid, {
          call_status: 'completed',
          duration_seconds: callDuration,
          answered: wasAnswered,
          answered_at: wasAnswered ? new Date().toISOString() : null,
          ended_at: new Date().toISOString(),
        })
        
        if (wasAnswered) {
          await updateRecipientStatus(callSid, 'delivered')
        } else {
          await updateRecipientStatus(callSid, 'failed', 'Call declined or not answered')
        }
        break

      case 'busy':
      case 'failed':
      case 'no-answer':
      case 'canceled':
        // These statuses DEFINITIVELY mean the call was NOT answered
        console.log(`❌ Call ${callStatus} for ${to}`)
        await updateCallLog(callSid, {
          call_status: callStatus,
          answered: false,
          duration_seconds: 0,
          ended_at: new Date().toISOString(),
        })
        
        await updateRecipientStatus(callSid, 'failed', `Call ${callStatus}`)
        break

      default:
        console.log(`ℹ️ Unhandled call status: ${callStatus}`)
    }

    console.log(`✅ Successfully processed voice call event: ${callStatus}`)
  } catch (error) {
    console.error(`❌ Error handling voice call event:`, error)
    throw error
  }
}

/**
 * Handle SMS Events
 */
async function handleSMSEvent(data: any) {
  const messageSid = data.MessageSid
  const messageStatus = data.MessageStatus // queued, sending, sent, delivered, undelivered, failed
  const to = data.To
  
  console.log(`🔄 Processing SMS event: ${messageStatus}`)

  try {
    switch (messageStatus) {
      case 'sent':
        console.log(`📤 SMS sent to ${to}`)
        await updateRecipientByMessageSid(messageSid, {
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        break

      case 'delivered':
        console.log(`✅ SMS delivered to ${to}`)
        await updateRecipientByMessageSid(messageSid, {
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        })
        break

      case 'undelivered':
      case 'failed':
        console.log(`❌ SMS ${messageStatus} for ${to}`)
        await updateRecipientByMessageSid(messageSid, {
          status: 'failed',
          failed_at: new Date().toISOString(),
          error_message: `SMS ${messageStatus}`,
        })
        break

      default:
        console.log(`ℹ️ SMS status: ${messageStatus}`)
    }

    console.log(`✅ Successfully processed SMS event: ${messageStatus}`)
  } catch (error) {
    console.error(`❌ Error handling SMS event:`, error)
    throw error
  }
}

/**
 * Update call log
 */
async function updateCallLog(callSid: string, updates: any) {
  console.log(`📝 Updating call log for ${callSid}:`, updates)
  
  const { error } = await supabaseAdmin
    .from("call_logs")
    .update(updates)
    .eq("twilio_call_sid", callSid)

  if (error) {
    console.error(`❌ Failed to update call log:`, error)
    throw error
  }
  
  console.log(`✅ Call log updated successfully`)
}

/**
 * Update recipient status based on call
 */
async function updateRecipientStatus(callSid: string, status: string, errorMessage?: string) {
  console.log(`📝 Updating recipient status for CallSid ${callSid}: ${status}`)
  
  // First find the call log to get campaign and contact IDs
  const { data: callLog, error: fetchError } = await supabaseAdmin
    .from("call_logs")
    .select("campaign_id, contact_id")
    .eq("twilio_call_sid", callSid)
    .single()

  if (fetchError || !callLog) {
    console.warn(`⚠️ Could not find call log for CallSid: ${callSid}`)
    return
  }

  const updates: any = {
    status,
  }

  if (status === 'delivered') {
    updates.delivered_at = new Date().toISOString()
  } else if (status === 'failed') {
    updates.failed_at = new Date().toISOString()
    if (errorMessage) {
      updates.error_message = errorMessage
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from("campaign_recipients")
    .update(updates)
    .eq("campaign_id", callLog.campaign_id)
    .eq("contact_id", callLog.contact_id)

  if (updateError) {
    console.error(`❌ Failed to update recipient status:`, updateError)
    throw updateError
  }
  
  console.log(`✅ Recipient status updated successfully`)
}

/**
 * Update recipient by message SID
 */
async function updateRecipientByMessageSid(messageSid: string, updates: any) {
  console.log(`📝 Updating recipient for MessageSid ${messageSid}:`, updates)
  
  const { error } = await supabaseAdmin
    .from("campaign_recipients")
    .update(updates)
    .eq("twilio_message_sid", messageSid)

  if (error) {
    console.error(`❌ Failed to update recipient:`, error)
    throw error
  }
  
  console.log(`✅ Recipient updated successfully`)
}

// Allow GET for verification
export async function GET() {
  return NextResponse.json({
    message: "Twilio webhook endpoint is active",
    timestamp: new Date().toISOString(),
  })
}

