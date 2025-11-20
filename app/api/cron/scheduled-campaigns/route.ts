import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * Cron job to check and send scheduled campaigns
 * This endpoint should be called periodically (e.g., every minute)
 * 
 * Setup with Vercel Cron:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/scheduled-campaigns",
 *     "schedule": "* * * * *"
 *   }]
 * }
 * 
 * Or use an external cron service to call this endpoint
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date().toISOString()

    // Find scheduled campaigns that are due to be sent
    const { data: campaigns, error } = await supabaseAdmin
      .from("campaigns")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_for", now)
      .order("scheduled_for", { ascending: true })

    if (error) {
      console.error("Error fetching scheduled campaigns:", error)
      return NextResponse.json(
        { error: "Failed to fetch scheduled campaigns" },
        { status: 500 }
      )
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({
        message: "No campaigns due to be sent",
        count: 0,
      })
    }

    // Trigger send for each due campaign
    const results = []
    for (const campaign of campaigns) {
      try {
        // Call the send endpoint for this campaign
        const sendResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/campaigns/${campaign.id}/send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        )

        if (sendResponse.ok) {
          results.push({
            campaign_id: campaign.id,
            status: "triggered",
          })
        } else {
          const errorData = await sendResponse.json()
          results.push({
            campaign_id: campaign.id,
            status: "failed",
            error: errorData.error,
          })
        }
      } catch (error) {
        console.error(`Error triggering campaign ${campaign.id}:`, error)
        results.push({
          campaign_id: campaign.id,
          status: "failed",
          error: String(error),
        })
      }
    }

    return NextResponse.json({
      message: `Processed ${campaigns.length} scheduled campaigns`,
      count: campaigns.length,
      results,
    })
  } catch (error) {
    console.error("Error in scheduled campaigns cron:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}

