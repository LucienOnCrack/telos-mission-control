import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
// import { requirePayingUser } from "@/lib/auth" // TODO: Uncomment when auth is ready

export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication when ready
    // const user = await requirePayingUser(request)

    // Get total campaigns
    const { count: totalCampaigns } = await supabaseAdmin
      .from("campaigns")
      .select("*", { count: "exact", head: true })

    // Get campaign status breakdown
    const { data: campaignsByStatus } = await supabaseAdmin
      .from("campaigns")
      .select("status")
    
    const statusCounts = {
      draft: 0,
      scheduled: 0,
      sending: 0,
      completed: 0,
      failed: 0,
    }
    
    campaignsByStatus?.forEach((campaign) => {
      statusCounts[campaign.status as keyof typeof statusCounts]++
    })

    // Get total calls/messages sent (from campaign_recipients)
    const { count: totalCallsSent } = await supabaseAdmin
      .from("campaign_recipients")
      .select("*", { count: "exact", head: true })

    // Get recipient status breakdown
    const { data: recipientsByStatus } = await supabaseAdmin
      .from("campaign_recipients")
      .select("status")
    
    const recipientStatusCounts = {
      pending: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
    }
    
    recipientsByStatus?.forEach((recipient) => {
      recipientStatusCounts[recipient.status as keyof typeof recipientStatusCounts]++
    })

    // Calculate error rate
    const totalProcessed = recipientStatusCounts.sent + recipientStatusCounts.delivered + recipientStatusCounts.failed
    const errorRate = totalProcessed > 0 
      ? ((recipientStatusCounts.failed / totalProcessed) * 100).toFixed(2)
      : "0.00"

    // Calculate success rate
    const successRate = totalProcessed > 0
      ? (((recipientStatusCounts.sent + recipientStatusCounts.delivered) / totalProcessed) * 100).toFixed(2)
      : "0.00"

    // Get total call logs
    const { count: totalCallLogs } = await supabaseAdmin
      .from("call_logs")
      .select("*", { count: "exact", head: true })

    // Get answered calls
    const { count: answeredCalls } = await supabaseAdmin
      .from("call_logs")
      .select("*", { count: "exact", head: true })
      .eq("answered", true)

    // Calculate answer rate
    const answerRate = totalCallLogs && totalCallLogs > 0
      ? ((answeredCalls || 0) / totalCallLogs * 100).toFixed(2)
      : "0.00"

    // Get total call duration
    const { data: callDurations } = await supabaseAdmin
      .from("call_logs")
      .select("duration_seconds")
    
    const totalDuration = callDurations?.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) || 0
    const averageDuration = totalCallLogs && totalCallLogs > 0
      ? Math.round(totalDuration / totalCallLogs)
      : 0

    // Get total contacts
    const { count: totalContacts } = await supabaseAdmin
      .from("contacts")
      .select("*", { count: "exact", head: true })

    // Get recent campaigns (last 5)
    const { data: recentCampaigns } = await supabaseAdmin
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)

    // Get recent activity (last 10 campaign recipients with contact info)
    const { data: recentActivity } = await supabaseAdmin
      .from("campaign_recipients")
      .select(`
        *,
        contact:contacts(name, phone_number),
        campaign:campaigns(type, status)
      `)
      .order("created_at", { ascending: false })
      .limit(10)

    return NextResponse.json({
      overview: {
        totalCampaigns: totalCampaigns || 0,
        totalCallsSent: totalCallsSent || 0,
        totalContacts: totalContacts || 0,
        errorRate: parseFloat(errorRate),
        successRate: parseFloat(successRate),
        answerRate: parseFloat(answerRate),
        averageCallDuration: averageDuration,
      },
      campaignStatus: statusCounts,
      recipientStatus: recipientStatusCounts,
      callStats: {
        totalCalls: totalCallLogs || 0,
        answeredCalls: answeredCalls || 0,
        totalDuration,
        averageDuration,
      },
      recentCampaigns,
      recentActivity,
    })
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}

