"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Phone, AlertCircle, CheckCircle, Clock, Users, TrendingUp, PhoneCall } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface AnalyticsData {
  overview: {
    totalCampaigns: number
    totalCallsSent: number
    totalContacts: number
    errorRate: number
    successRate: number
    answerRate: number
    averageCallDuration: number
  }
  campaignStatus: {
    draft: number
    scheduled: number
    sending: number
    completed: number
    failed: number
  }
  recipientStatus: {
    pending: number
    sent: number
    delivered: number
    failed: number
  }
  callStats: {
    totalCalls: number
    answeredCalls: number
    totalDuration: number
    averageDuration: number
  }
  recentCampaigns: Array<{
    id: string
    type: string
    status: string
    created_at: string
  }>
  recentActivity: Array<{
    id: string
    status: string
    created_at: string
    contact: {
      name: string
      phone_number: string
    }
    campaign: {
      type: string
      status: string
    }
  }>
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        // TODO: Add authentication headers when auth is implemented
        const response = await fetch("/api/analytics")

        if (!response.ok) {
          throw new Error("Failed to fetch analytics")
        }

        const data = await response.json()
        setAnalytics(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Failed to load analytics data. Please try again.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!analytics) {
    return null
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "delivered":
      case "sent":
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20"
      case "failed":
        return "bg-red-500/10 text-red-500 hover:bg-red-500/20"
      case "sending":
      case "pending":
        return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
      case "scheduled":
        return "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20"
      default:
        return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Mission Control Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Real-time analytics and campaign performance
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Calls Sent
              </CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.overview.totalCallsSent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {analytics.overview.totalCampaigns} campaigns
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Success Rate
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{analytics.overview.successRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.recipientStatus.sent + analytics.recipientStatus.delivered} successful
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Error Rate
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{analytics.overview.errorRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.recipientStatus.failed} failed calls
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Answer Rate
              </CardTitle>
              <PhoneCall className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{analytics.overview.answerRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.callStats.answeredCalls} calls answered
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Contacts
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.overview.totalContacts.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                In your database
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Call Duration
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(analytics.overview.averageCallDuration)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total: {formatDuration(analytics.callStats.totalDuration)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Campaigns
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.campaignStatus.sending + analytics.campaignStatus.scheduled}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.campaignStatus.sending} sending, {analytics.campaignStatus.scheduled} scheduled
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Status Breakdown */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Status Breakdown</CardTitle>
              <CardDescription>Current state of all campaigns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor("completed")}>Completed</Badge>
                </div>
                <span className="font-semibold">{analytics.campaignStatus.completed}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor("sending")}>Sending</Badge>
                </div>
                <span className="font-semibold">{analytics.campaignStatus.sending}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor("scheduled")}>Scheduled</Badge>
                </div>
                <span className="font-semibold">{analytics.campaignStatus.scheduled}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor("draft")}>Draft</Badge>
                </div>
                <span className="font-semibold">{analytics.campaignStatus.draft}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor("failed")}>Failed</Badge>
                </div>
                <span className="font-semibold">{analytics.campaignStatus.failed}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recipient Status Breakdown</CardTitle>
              <CardDescription>Call delivery status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor("delivered")}>Delivered</Badge>
                </div>
                <span className="font-semibold">{analytics.recipientStatus.delivered}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor("sent")}>Sent</Badge>
                </div>
                <span className="font-semibold">{analytics.recipientStatus.sent}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor("pending")}>Pending</Badge>
                </div>
                <span className="font-semibold">{analytics.recipientStatus.pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor("failed")}>Failed</Badge>
                </div>
                <span className="font-semibold">{analytics.recipientStatus.failed}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Campaigns</CardTitle>
              <CardDescription>Last 5 campaigns created</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.recentCampaigns.length > 0 ? (
                <div className="space-y-3">
                  {analytics.recentCampaigns.map((campaign) => (
                    <Link 
                      key={campaign.id} 
                      href={`/dashboard/campaigns/${campaign.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm capitalize">{campaign.type} Campaign</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(campaign.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  No campaigns yet
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest call attempts</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.recentActivity.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {analytics.recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">
                            {activity.contact?.name || activity.contact?.phone_number || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(activity.status)}>{activity.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  No activity yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Navigate to key areas</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Link href="/dashboard/campaigns">
              <button className="w-full p-4 text-left rounded-lg border hover:bg-muted transition-colors">
                <h3 className="font-semibold mb-1">View Campaigns</h3>
                <p className="text-sm text-muted-foreground">Manage your campaigns</p>
              </button>
            </Link>
            <Link href="/dashboard/contacts">
              <button className="w-full p-4 text-left rounded-lg border hover:bg-muted transition-colors">
                <h3 className="font-semibold mb-1">View Contacts</h3>
                <p className="text-sm text-muted-foreground">Manage your contact list</p>
              </button>
            </Link>
            <Link href="/dashboard/audio">
              <button className="w-full p-4 text-left rounded-lg border hover:bg-muted transition-colors">
                <h3 className="font-semibold mb-1">Audio Files</h3>
                <p className="text-sm text-muted-foreground">Manage audio recordings</p>
              </button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
