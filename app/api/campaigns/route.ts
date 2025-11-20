import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// GET /api/campaigns - List all campaigns
export async function GET(request: NextRequest) {
  try {
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
  } catch (error: any) {
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
    const body = await request.json()
    const { type, message, audio_url, contact_ids, group_ids, scheduled_for } = body

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

    // Must have either contact_ids or group_ids
    if ((!contact_ids || !Array.isArray(contact_ids) || contact_ids.length === 0) &&
        (!group_ids || !Array.isArray(group_ids) || group_ids.length === 0)) {
      return NextResponse.json(
        { error: "At least one contact or group is required" },
        { status: 400 }
      )
    }

    // Get all contact IDs (either from contact_ids or from groups)
    let finalContactIds: string[] = []

    if (group_ids && group_ids.length > 0) {
      // Fetch all contacts from the selected groups
      const { data: groupContacts, error: groupContactsError } = await supabaseAdmin
        .from("contacts")
        .select("id")
        .in("group_id", group_ids)

      if (groupContactsError) {
        console.error("Error fetching group contacts:", groupContactsError)
        return NextResponse.json(
          { error: "Failed to fetch contacts from groups" },
          { status: 500 }
        )
      }

      finalContactIds = groupContacts?.map(c => c.id) || []

      if (finalContactIds.length === 0) {
        return NextResponse.json(
          { error: "No contacts found in selected groups" },
          { status: 400 }
        )
      }
    } else if (contact_ids && contact_ids.length > 0) {
      finalContactIds = contact_ids
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
    const recipients = finalContactIds.map((contact_id: string) => ({
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
  } catch (error: any) {
    console.error("Error in POST /api/campaigns:", error)
    if (error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 403 })
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

