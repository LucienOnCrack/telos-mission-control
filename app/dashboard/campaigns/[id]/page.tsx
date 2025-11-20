"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Phone, MessageSquare, Clock, CheckCircle2, XCircle, Send } from "lucide-react"
import { Campaign, CampaignRecipient, CallLog } from "@/lib/supabase"

interface CampaignDetails extends Campaign {
  recipients?: CampaignRecipient[]
  call_logs?: CallLog[]
}

export default function CampaignDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<CampaignDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (campaignId) {
      fetchCampaignDetails()
      // Poll for updates every 5 seconds if campaign is sending
      const interval = setInterval(() => {
        if (campaign?.status === "sending") {
          fetchCampaignDetails()
        }
      }, 5000)

      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, campaign?.status])

  const fetchCampaignDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/campaigns/${campaignId}`)
      const data = await response.json()
      if (data.campaign) {
        setCampaign(data.campaign)
      }
    } catch (error) {
      console.error("Error fetching campaign details:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendNow = async () => {
    if (!confirm("Are you sure you want to send this campaign now?")) {
      return
    }

    setSending(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/send`, {
        method: "POST",
      })

      if (response.ok) {
        fetchCampaignDetails()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to send campaign")
      }
    } catch (error) {
      console.error("Error sending campaign:", error)
      alert("Failed to send campaign")
    } finally {
      setSending(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }
    > = {
      pending: { variant: "secondary", icon: Clock },
      sent: { variant: "default", icon: Send },
      delivered: { variant: "default", icon: CheckCircle2 },
      failed: { variant: "destructive", icon: XCircle },
    }

    const config = variants[status] || { variant: "outline", icon: Clock }
    const Icon = config.icon

    return (
      <Badge variant={config.variant}>
        <Icon className="mr-1 h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p>Loading campaign details...</p>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="mb-4">Campaign not found</p>
        <Button onClick={() => router.push("/dashboard/campaigns")}>
          Back to Campaigns
        </Button>
      </div>
    )
  }

  const recipients = campaign.recipients || []
  const callLogs = campaign.call_logs || []

  const stats = {
    total: recipients.length,
    sent: recipients.filter((r) => r.status === "sent" || r.status === "delivered").length,
    delivered: recipients.filter((r) => r.status === "delivered").length,
    failed: recipients.filter((r) => r.status === "failed").length,
    pending: recipients.filter((r) => r.status === "pending").length,
  }

  const voiceStats = campaign.type === "voice"
    ? {
        answered: callLogs.filter((l) => l.answered).length,
        unanswered: callLogs.filter((l) => !l.answered).length,
        avgDuration:
          callLogs.length > 0
            ? Math.round(
                callLogs.reduce((sum, l) => sum + l.duration_seconds, 0) /
                  callLogs.length
              )
            : 0,
      }
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/campaigns")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Campaign Details</h1>
            <p className="text-muted-foreground">
              {campaign.type === "voice" ? (
                <Phone className="inline mr-2 h-4 w-4" />
              ) : (
                <MessageSquare className="inline mr-2 h-4 w-4" />
              )}
              {campaign.type.toUpperCase()} Campaign
            </p>
          </div>
        </div>
        {(campaign.status === "draft" || campaign.status === "scheduled") && (
          <Button onClick={handleSendNow} disabled={sending}>
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Sending..." : "Send Now"}
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.delivered}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {voiceStats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Calls Answered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {voiceStats.answered}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Calls Unanswered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">
                {voiceStats.unanswered}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Avg Call Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.floor(voiceStats.avgDuration / 60)}:
                {(voiceStats.avgDuration % 60).toString().padStart(2, "0")}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Campaign Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">
                {new Date(campaign.created_at).toLocaleString()}
              </p>
            </div>
            {campaign.scheduled_for && (
              <div>
                <p className="text-sm text-muted-foreground">Scheduled For</p>
                <p className="font-medium">
                  {new Date(campaign.scheduled_for).toLocaleString()}
                </p>
              </div>
            )}
            {campaign.sent_at && (
              <div>
                <p className="text-sm text-muted-foreground">Sent At</p>
                <p className="font-medium">
                  {new Date(campaign.sent_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
          {campaign.message && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Message</p>
              <div className="bg-muted p-4 rounded-md">
                <p className="whitespace-pre-wrap">{campaign.message}</p>
              </div>
            </div>
          )}
          {campaign.audio_url && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Audio URL</p>
              <div className="bg-muted p-4 rounded-md">
                <a
                  href={campaign.audio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {campaign.audio_url}
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recipients</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent At</TableHead>
                {campaign.type === "voice" && (
                  <>
                    <TableHead>Answered</TableHead>
                    <TableHead>Duration</TableHead>
                  </>
                )}
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No recipients found
                  </TableCell>
                </TableRow>
              ) : (
                recipients.map((recipient) => {
                  const callLog = callLogs.find(
                    (log) => log.contact_id === recipient.contact_id
                  )
                  return (
                    <TableRow key={recipient.id}>
                      <TableCell>
                        {recipient.contact?.name || "-"}
                      </TableCell>
                      <TableCell>
                        {recipient.contact?.phone_number || "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(recipient.status)}</TableCell>
                      <TableCell>
                        {recipient.sent_at
                          ? new Date(recipient.sent_at).toLocaleString()
                          : "-"}
                      </TableCell>
                      {campaign.type === "voice" && (
                        <>
                          <TableCell>
                            {callLog ? (
                              callLog.answered ? (
                                <Badge variant="default">
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Yes
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <XCircle className="mr-1 h-3 w-3" />
                                  No
                                </Badge>
                              )
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {callLog && callLog.duration_seconds > 0
                              ? `${Math.floor(callLog.duration_seconds / 60)}:${(
                                  callLog.duration_seconds % 60
                                )
                                  .toString()
                                  .padStart(2, "0")}`
                              : "-"}
                          </TableCell>
                        </>
                      )}
                      <TableCell className="text-red-600 text-sm">
                        {recipient.error_message || "-"}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

