import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/campaigns/[id] - Get campaign details with recipients
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // Fetch recipients with contact details
    const { data: recipients, error: recipientsError } = await supabaseAdmin
      .from("campaign_recipients")
      .select(`
        *,
        contact:contacts(*)
      `)
      .eq("campaign_id", id)
      .order("created_at", { ascending: true })

    if (recipientsError) {
      console.error("Error fetching recipients:", recipientsError)
    }

    // Fetch call logs if voice campaign
    let callLogs = []
    if (campaign.type === "voice") {
      const { data: logs, error: logsError } = await supabaseAdmin
        .from("call_logs")
        .select(`
          *,
          contact:contacts(*)
        `)
        .eq("campaign_id", id)

      if (logsError) {
        console.error("Error fetching call logs:", logsError)
      } else {
        callLogs = logs || []
      }
    }

    return NextResponse.json({
      campaign: {
        ...campaign,
        recipients: recipients || [],
        call_logs: callLogs,
      },
    })
  } catch (error: any) {
    console.error("Error in GET /api/campaigns/[id]:", error)
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
  }
}

