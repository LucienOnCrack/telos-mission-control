"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Send } from "lucide-react"
import { Campaign, Contact, CampaignType } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function CampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [campaignType, setCampaignType] = useState<CampaignType>("sms")
  const [message, setMessage] = useState("")
  const [audioUrl, setAudioUrl] = useState("")
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [scheduleType, setScheduleType] = useState<"immediate" | "scheduled">(
    "immediate"
  )
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")

  useEffect(() => {
    fetchCampaigns()
    fetchContacts()
  }, [])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/campaigns")
      const data = await response.json()
      if (data.campaigns) {
        setCampaigns(data.campaigns)
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchContacts = async () => {
    try {
      const response = await fetch("/api/contacts")
      const data = await response.json()
      if (data.contacts) {
        setContacts(data.contacts)
      }
    } catch (error) {
      console.error("Error fetching contacts:", error)
    }
  }

  const handleToggleContact = (contactId: string) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    )
  }

  const handleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(contacts.map((c) => c.id))
    }
  }

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedContacts.length === 0) {
      alert("Please select at least one contact")
      return
    }

    if (campaignType !== "voice" && !message.trim()) {
      alert("Please enter a message")
      return
    }

    if (campaignType === "voice" && !audioUrl.trim()) {
      alert("Please enter an audio URL for voice campaigns")
      return
    }

    setSubmitting(true)

    try {
      let scheduled_for = null
      if (scheduleType === "scheduled" && scheduledDate && scheduledTime) {
        scheduled_for = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      }

      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: campaignType,
          message: campaignType !== "voice" ? message : undefined,
          audio_url: campaignType === "voice" ? audioUrl : undefined,
          contact_ids: selectedContacts,
          scheduled_for,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setDialogOpen(false)
        resetForm()
        
        // If immediate, trigger send
        if (scheduleType === "immediate") {
          await fetch(`/api/campaigns/${data.campaign.id}/send`, {
            method: "POST",
          })
        }
        
        fetchCampaigns()
        router.push(`/dashboard/campaigns/${data.campaign.id}`)
      } else {
        alert(data.error || "Failed to create campaign")
      }
    } catch (error) {
      console.error("Error creating campaign:", error)
      alert("Failed to create campaign")
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setCampaignType("sms")
    setMessage("")
    setAudioUrl("")
    setSelectedContacts([])
    setScheduleType("immediate")
    setScheduledDate("")
    setScheduledTime("")
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      scheduled: "outline",
      sending: "default",
      completed: "default",
      failed: "destructive",
    }

    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Create and manage your messaging campaigns
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCreateCampaign}>
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
                <DialogDescription>
                  Create a new messaging or calling campaign
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Campaign Type</Label>
                  <Select
                    value={campaignType}
                    onValueChange={(value: CampaignType) =>
                      setCampaignType(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="voice">Voice Call</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp (Future)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {campaignType !== "voice" ? (
                  <div className="grid gap-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Enter your message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {message.length} characters
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="audioUrl">Audio URL</Label>
                    <Input
                      id="audioUrl"
                      placeholder="https://example.com/audio.mp3"
                      value={audioUrl}
                      onChange={(e) => setAudioUrl(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Provide a public URL to an MP3 or WAV file
                    </p>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label>Schedule</Label>
                  <Select
                    value={scheduleType}
                    onValueChange={(value: "immediate" | "scheduled") =>
                      setScheduleType(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Send Immediately</SelectItem>
                      <SelectItem value="scheduled">Schedule for Later</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {scheduleType === "scheduled" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Select Recipients ({selectedContacts.length})</Label>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      {selectedContacts.length === contacts.length
                        ? "Deselect All"
                        : "Select All"}
                    </Button>
                  </div>
                  <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                    {contacts.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No contacts available. Add contacts first.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {contacts.map((contact) => (
                          <div
                            key={contact.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={contact.id}
                              checked={selectedContacts.includes(contact.id)}
                              onCheckedChange={() =>
                                handleToggleContact(contact.id)
                              }
                            />
                            <label
                              htmlFor={contact.id}
                              className="text-sm cursor-pointer flex-1"
                            >
                              {contact.name || contact.phone_number}
                              {contact.name && (
                                <span className="text-muted-foreground ml-2">
                                  ({contact.phone_number})
                                </span>
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Campaign"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Message Preview</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Scheduled For</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Loading campaigns...
                </TableCell>
              </TableRow>
            ) : campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  No campaigns found. Create your first campaign to get started.
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((campaign) => (
                <TableRow
                  key={campaign.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}
                >
                  <TableCell>
                    <Badge variant="outline">
                      {campaign.type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {campaign.type === "voice"
                      ? campaign.audio_url || "Voice call"
                      : campaign.message || "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {campaign.scheduled_for
                      ? new Date(campaign.scheduled_for).toLocaleString()
                      : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}



