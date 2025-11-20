import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * Telnyx Webhook Handler
 * Receives webhooks from Telnyx for:
 * - SMS delivery status updates
 * - Voice call events (answered, completed, etc.)
 * 
 * Configure this URL in your Telnyx dashboard:
 * https://your-domain.com/api/telnyx/webhook
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log("Received Telnyx webhook:", JSON.stringify(body, null, 2))

    const { data: eventData, event_type } = body

    if (!event_type || !eventData) {
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      )
    }

    // Handle different event types
    switch (event_type) {
      // SMS Events
      case "message.sent":
        await handleMessageSent(eventData)
        break

      case "message.delivered":
        await handleMessageDelivered(eventData)
        break

      case "message.sending_failed":
      case "message.delivery_failed":
        await handleMessageFailed(eventData)
        break

      // Voice Call Events
      case "call.initiated":
        await handleCallInitiated(eventData)
        break

      case "call.answered":
        await handleCallAnswered(eventData)
        break

      case "call.hangup":
        await handleCallHangup(eventData)
        break

      case "call.playback.ended":
        // Audio playback completed, hang up the call
        await handlePlaybackEnded(eventData)
        break

      default:
        console.log(`Unhandled event type: ${event_type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing Telnyx webhook:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// SMS Event Handlers

async function handleMessageSent(data: any) {
  const messageId = data.id
  
  // Update recipient status to sent
  const { error } = await supabaseAdmin
    .from("campaign_recipients")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("telnyx_message_id", messageId)

  if (error) {
    console.error("Error updating message sent status:", error)
  }
}

async function handleMessageDelivered(data: any) {
  const messageId = data.id

  // Update recipient status to delivered
  const { error } = await supabaseAdmin
    .from("campaign_recipients")
    .update({
      status: "delivered",
      delivered_at: new Date().toISOString(),
    })
    .eq("telnyx_message_id", messageId)

  if (error) {
    console.error("Error updating message delivered status:", error)
  }
}

async function handleMessageFailed(data: any) {
  const messageId = data.id
  const errorMessage = data.errors?.[0]?.detail || "Message delivery failed"

  // Update recipient status to failed
  const { error } = await supabaseAdmin
    .from("campaign_recipients")
    .update({
      status: "failed",
      failed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq("telnyx_message_id", messageId)

  if (error) {
    console.error("Error updating message failed status:", error)
  }
}

// Voice Call Event Handlers

async function handleCallInitiated(data: any) {
  const callControlId = data.call_control_id

  console.log(`Call initiated: ${callControlId}`)
  // Call log is created when campaign is sent
}

async function handleCallAnswered(data: any) {
  const callControlId = data.call_control_id

  // Update call log to mark as answered
  const { error } = await supabaseAdmin
    .from("call_logs")
    .update({
      answered: true,
      answered_at: new Date().toISOString(),
      call_status: "answered",
    })
    .eq("telnyx_call_id", callControlId)

  if (error) {
    console.error("Error updating call answered status:", error)
  }

  // Update campaign recipient status
  const { data: callLog } = await supabaseAdmin
    .from("call_logs")
    .select("campaign_id, contact_id")
    .eq("telnyx_call_id", callControlId)
    .single()

  if (callLog) {
    await supabaseAdmin
      .from("campaign_recipients")
      .update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
      })
      .eq("campaign_id", callLog.campaign_id)
      .eq("contact_id", callLog.contact_id)
  }
}

async function handleCallHangup(data: any) {
  const callControlId = data.call_control_id
  const duration = data.call_duration_secs || 0
  const hangupCause = data.hangup_cause

  // Update call log with duration and end time
  const { error } = await supabaseAdmin
    .from("call_logs")
    .update({
      duration_seconds: duration,
      ended_at: new Date().toISOString(),
      call_status: hangupCause || "completed",
    })
    .eq("telnyx_call_id", callControlId)

  if (error) {
    console.error("Error updating call hangup status:", error)
  }

  // If call was not answered, mark recipient as failed
  const { data: callLog } = await supabaseAdmin
    .from("call_logs")
    .select("campaign_id, contact_id, answered")
    .eq("telnyx_call_id", callControlId)
    .single()

  if (callLog && !callLog.answered) {
    await supabaseAdmin
      .from("campaign_recipients")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        error_message: "Call not answered",
      })
      .eq("campaign_id", callLog.campaign_id)
      .eq("contact_id", callLog.contact_id)
  }
}

async function handlePlaybackEnded(data: any) {
  const callControlId = data.call_control_id

  console.log(`Playback ended for call: ${callControlId}`)
  
  // Optionally, hang up the call after playback
  // This would require importing and using the hangupCall function from lib/telnyx
  // For now, we'll let Telnyx handle it based on call settings
}

// Allow GET for verification
export async function GET() {
  return NextResponse.json({
    message: "Telnyx webhook endpoint is active",
  })
}



