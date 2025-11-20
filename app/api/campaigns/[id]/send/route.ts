import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { sendSMS, initiateVoiceCall } from "@/lib/telnyx"
import { requirePayingUser, checkRateLimit, getRateLimitIdentifier } from "@/lib/auth"

// POST /api/campaigns/[id]/send - Send campaign to all recipients
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authenticated paying user
    const user = await requirePayingUser(request)

    // Rate limiting (stricter for send operations)
    const rateLimitId = getRateLimitIdentifier(request, user.id)
    const rateLimit = checkRateLimit(rateLimitId, 10, 60000)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      )
    }
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

// Send campaign messages in the background
async function sendCampaignMessages(campaign: any, recipients: any[]) {
  let successCount = 0
  let failCount = 0

  for (const recipient of recipients) {
    try {
      if (campaign.type === "sms") {
        // Send SMS
        const result = await sendSMS(
          recipient.contact.phone_number,
          campaign.message
        )

        if (result.errors) {
          // Mark as failed
          await supabaseAdmin
            .from("campaign_recipients")
            .update({
              status: "failed",
              failed_at: new Date().toISOString(),
              error_message: result.errors[0]?.message || "Failed to send SMS",
            })
            .eq("id", recipient.id)
          failCount++
        } else {
          // Mark as sent
          await supabaseAdmin
            .from("campaign_recipients")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              telnyx_message_id: result.data?.data?.id,
            })
            .eq("id", recipient.id)
          successCount++
        }
      } else if (campaign.type === "voice") {
        // Initiate voice call
        const result = await initiateVoiceCall(
          recipient.contact.phone_number,
          campaign.audio_url
        )

        if (result.errors) {
          // Mark as failed
          await supabaseAdmin
            .from("campaign_recipients")
            .update({
              status: "failed",
              failed_at: new Date().toISOString(),
              error_message:
                result.errors[0]?.message || "Failed to initiate call",
            })
            .eq("id", recipient.id)
          failCount++
        } else {
          // Mark as sent and create call log
          await supabaseAdmin
            .from("campaign_recipients")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("id", recipient.id)

          // Create call log entry
          if (result.data?.data?.call_control_id) {
            await supabaseAdmin.from("call_logs").insert({
              campaign_id: campaign.id,
              contact_id: recipient.contact_id,
              telnyx_call_id: result.data.data.call_control_id,
              answered: false,
              duration_seconds: 0,
            })
          }

          successCount++
        }
      } else if (campaign.type === "whatsapp") {
        // WhatsApp support (future implementation)
        await supabaseAdmin
          .from("campaign_recipients")
          .update({
            status: "failed",
            failed_at: new Date().toISOString(),
            error_message: "WhatsApp is not yet supported",
          })
          .eq("id", recipient.id)
        failCount++
      }

      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (error) {
      console.error(`Error sending to recipient ${recipient.id}:`, error)
      await supabaseAdmin
        .from("campaign_recipients")
        .update({
          status: "failed",
          failed_at: new Date().toISOString(),
          error_message: String(error),
        })
        .eq("id", recipient.id)
      failCount++
    }
  }

  // Update campaign status to completed
  const finalStatus = failCount === recipients.length ? "failed" : "completed"
  await supabaseAdmin
    .from("campaigns")
    .update({
      status: finalStatus,
      completed_at: new Date().toISOString(),
    })
    .eq("id", campaign.id)

  console.log(
    `Campaign ${campaign.id} completed: ${successCount} sent, ${failCount} failed`
  )
}

