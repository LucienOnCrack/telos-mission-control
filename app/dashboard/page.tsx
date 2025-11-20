"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Phone, AlertCircle, CheckCircle, Clock, Users, TrendingUp, PhoneCall } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts"

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
  chartData: Array<{
    date: string
    totalCalls: number
    successful: number
    failed: number
    answered: number
    pending: number
  }>
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAnalytics() {
      try {
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "delivered":
      case "sent":
        return "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
      case "failed":
        return "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
      case "sending":
      case "pending":
        return "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
      case "scheduled":
        return "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
      default:
        return "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Analytics Dashboard</h1>
        <p className="text-slate-600 mt-1">
          Monitor your campaign performance and call metrics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              Total Calls Sent
            </CardTitle>
            <Phone className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">{analytics.overview.totalCallsSent.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">
              Across {analytics.overview.totalCampaigns} campaigns
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              Success Rate
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">{analytics.overview.successRate}%</div>
            <p className="text-xs text-slate-500 mt-1">
              {analytics.recipientStatus.sent + analytics.recipientStatus.delivered} successful
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              Error Rate
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">{analytics.overview.errorRate}%</div>
            <p className="text-xs text-slate-500 mt-1">
              {analytics.recipientStatus.failed} failed calls
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              Answer Rate
            </CardTitle>
            <PhoneCall className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">{analytics.overview.answerRate}%</div>
            <p className="text-xs text-slate-500 mt-1">
              {analytics.callStats.answeredCalls} calls answered
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Large Graph */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900">Call Performance Trends</CardTitle>
          <CardDescription className="text-slate-600">
            30-day overview of call volume, success rate, and pickup rate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={analytics.chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSuccessful" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#334155" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#334155" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAnswered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#475569" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#475569" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="circle"
                />
                <Area 
                  type="monotone" 
                  dataKey="totalCalls" 
                  stroke="#64748b" 
                  fillOpacity={1}
                  fill="url(#colorTotal)" 
                  name="Total Calls"
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="successful" 
                  stroke="#334155" 
                  fillOpacity={1}
                  fill="url(#colorSuccessful)" 
                  name="Successful"
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="answered" 
                  stroke="#475569" 
                  fillOpacity={1}
                  fill="url(#colorAnswered)" 
                  name="Answered"
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="failed" 
                  stroke="#94a3b8" 
                  fillOpacity={1}
                  fill="url(#colorFailed)" 
                  name="Failed"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              Total Contacts
            </CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">{analytics.overview.totalContacts.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">
              In your database
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              Avg Call Duration
            </CardTitle>
            <Clock className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">{formatDuration(analytics.overview.averageCallDuration)}</div>
            <p className="text-xs text-slate-500 mt-1">
              Total: {formatDuration(analytics.callStats.totalDuration)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              Active Campaigns
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">
              {analytics.campaignStatus.sending + analytics.campaignStatus.scheduled}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {analytics.campaignStatus.sending} sending, {analytics.campaignStatus.scheduled} scheduled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Campaign Status</CardTitle>
            <CardDescription className="text-slate-600">Current state of all campaigns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                <span className="text-sm text-slate-700">Completed</span>
              </div>
              <span className="font-semibold text-slate-900">{analytics.campaignStatus.completed}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                <span className="text-sm text-slate-700">Sending</span>
              </div>
              <span className="font-semibold text-slate-900">{analytics.campaignStatus.sending}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                <span className="text-sm text-slate-700">Scheduled</span>
              </div>
              <span className="font-semibold text-slate-900">{analytics.campaignStatus.scheduled}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                <span className="text-sm text-slate-700">Draft</span>
              </div>
              <span className="font-semibold text-slate-900">{analytics.campaignStatus.draft}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                <span className="text-sm text-slate-700">Failed</span>
              </div>
              <span className="font-semibold text-slate-900">{analytics.campaignStatus.failed}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Call Status</CardTitle>
            <CardDescription className="text-slate-600">Delivery status breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                <span className="text-sm text-slate-700">Delivered</span>
              </div>
              <span className="font-semibold text-slate-900">{analytics.recipientStatus.delivered}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                <span className="text-sm text-slate-700">Sent</span>
              </div>
              <span className="font-semibold text-slate-900">{analytics.recipientStatus.sent}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                <span className="text-sm text-slate-700">Pending</span>
              </div>
              <span className="font-semibold text-slate-900">{analytics.recipientStatus.pending}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                <span className="text-sm text-slate-700">Failed</span>
              </div>
              <span className="font-semibold text-slate-900">{analytics.recipientStatus.failed}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Recent Campaigns</CardTitle>
            <CardDescription className="text-slate-600">Last 5 campaigns created</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.recentCampaigns.length > 0 ? (
              <div className="space-y-2">
                {analytics.recentCampaigns.map((campaign) => (
                  <Link 
                    key={campaign.id} 
                    href={`/dashboard/campaigns/${campaign.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="font-medium text-sm text-slate-900 capitalize">{campaign.type} Campaign</p>
                        <p className="text-xs text-slate-500">
                          {new Date(campaign.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-slate-400">
                No campaigns yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Recent Activity</CardTitle>
            <CardDescription className="text-slate-600">Latest call attempts</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.recentActivity.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {analytics.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="font-medium text-sm text-slate-900">
                          {activity.contact?.name || activity.contact?.phone_number || "Unknown"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(activity.status)}>{activity.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-slate-400">
                No activity yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
