import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// GET /api/campaigns - List all campaigns
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication when ready
    // const user = await requirePayingUser(request)

    const { data: campaigns, error } = await supabaseAdmin
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching campaigns:", error)
      return NextResponse.json(
        { error: "Failed to fetch campaigns" },
        { status: 500 }
      )
    }

    return NextResponse.json({ campaigns })
  } catch (error) {
    console.error("Error in GET /api/campaigns:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/campaigns - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication when ready
    // const user = await requirePayingUser(request)

    const body = await request.json()
    const { type, message, audio_url, contact_ids, scheduled_for } = body

    // Validation
    if (!type || !["sms", "voice", "whatsapp"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid campaign type" },
        { status: 400 }
      )
    }

    if (type !== "voice" && !message) {
      return NextResponse.json(
        { error: "Message is required for SMS and WhatsApp campaigns" },
        { status: 400 }
      )
    }

    if (type === "voice" && !audio_url) {
      return NextResponse.json(
        { error: "Audio URL is required for voice campaigns" },
        { status: 400 }
      )
    }

    if (!contact_ids || !Array.isArray(contact_ids) || contact_ids.length === 0) {
      return NextResponse.json(
        { error: "At least one contact is required" },
        { status: 400 }
      )
    }

    // Determine initial status
    const status = scheduled_for ? "scheduled" : "draft"

    // Create campaign
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("campaigns")
      .insert({
        type,
        message: type !== "voice" ? message : null,
        audio_url: type === "voice" ? audio_url : null,
        status,
        scheduled_for: scheduled_for || null,
      })
      .select()
      .single()

    if (campaignError) {
      console.error("Error creating campaign:", campaignError)
      return NextResponse.json(
        { error: "Failed to create campaign" },
        { status: 500 }
      )
    }

    // Create campaign recipients
    const recipients = contact_ids.map((contact_id: string) => ({
      campaign_id: campaign.id,
      contact_id,
      status: "pending",
    }))

    const { error: recipientsError } = await supabaseAdmin
      .from("campaign_recipients")
      .insert(recipients)

    if (recipientsError) {
      console.error("Error creating campaign recipients:", recipientsError)
      // Rollback campaign creation
      await supabaseAdmin.from("campaigns").delete().eq("id", campaign.id)
      return NextResponse.json(
        { error: "Failed to create campaign recipients" },
        { status: 500 }
      )
    }

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/campaigns:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

