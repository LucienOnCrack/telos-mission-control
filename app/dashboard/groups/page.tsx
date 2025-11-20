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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Trash2, Plus, Upload, Users } from "lucide-react"
import { ContactGroup } from "@/lib/supabase"
import Link from "next/link"

export default function GroupsPage() {
  const [groups, setGroups] = useState<ContactGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [selectedGroupForImport, setSelectedGroupForImport] = useState<string | null>(null)

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/contact-groups")
      
      if (!response.ok) {
        const data = await response.json()
        console.error("❌ Failed to fetch groups:", data)
        alert(`Error fetching groups:\n${data.error || 'Unknown error'}`)
        return
      }
      
      const data = await response.json()
      if (data.groups) {
        setGroups(data.groups)
      }
    } catch (error: any) {
      console.error("❌ CRITICAL ERROR fetching groups:", error)
      alert(`Critical error fetching groups:\n${error.message || error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    console.log(`📁 Creating group: ${name}`)

    try {
      const response = await fetch("/api/contact-groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description: description || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log(`✅ Group created successfully:`, data.group)
        alert(`✅ Success!\n\nGroup created: ${name}`)
        setGroups([...groups, { ...data.group, contact_count: 0 }])
        setDialogOpen(false)
        setName("")
        setDescription("")
      } else {
        console.error(`❌ Failed to create group:`, data)
        alert(`❌ Error creating group:\n\n${data.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error("❌ CRITICAL ERROR creating group:", error)
      alert(`❌ Critical error creating group:\n\n${error.message || error}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteGroup = async (id: string) => {
    const group = groups.find((g) => g.id === id)
    const groupInfo = group ? group.name : id
    
    if (!confirm(`⚠️ Are you sure you want to delete this group?\n\n${groupInfo}\n\nContacts in this group will not be deleted, but they will no longer be in a group.`)) {
      return
    }

    console.log(`🗑️ Deleting group: ${groupInfo}`)

    try {
      const response = await fetch(`/api/contact-groups?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        console.log(`✅ Group deleted: ${groupInfo}`)
        alert(`✅ Group deleted successfully:\n\n${groupInfo}`)
        setGroups(groups.filter((g) => g.id !== id))
      } else {
        const data = await response.json()
        console.error(`❌ Failed to delete group:`, data)
        alert(`❌ Error deleting group:\n\n${data.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error("❌ CRITICAL ERROR deleting group:", error)
      alert(`❌ Critical error deleting group:\n\n${error.message || error}`)
    }
  }

  const handleImportCSVToGroup = (groupId: string) => {
    setSelectedGroupForImport(groupId)
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".csv"
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file) return

      const text = await file.text()
      const lines = text.split("\n").map((line: string) => line.trim()).filter((line: string) => line)
      
      if (lines.length < 2) {
        alert("CSV must have a header row and at least one data row")
        return
      }

      // Parse header row to find phone column
      const headers = lines[0].split(",").map((h: string) => h.trim().toLowerCase())
      const phoneIndex = headers.findIndex((h: string) => 
        h === 'phone' || h === 'phone_number' || h === 'phonenumber'
      )
      const nameIndex = headers.findIndex((h: string) => h === 'name')

      if (phoneIndex === -1) {
        alert(`❌ CSV must have a 'phone' or 'phone_number' column\n\nFound columns: ${headers.join(', ')}`)
        return
      }

      console.log(`📊 CSV Structure:`)
      console.log(`   Headers: ${headers.join(', ')}`)
      console.log(`   Phone column: ${phoneIndex} (${headers[phoneIndex]})`)
      console.log(`   Name column: ${nameIndex >= 0 ? `${nameIndex} (${headers[nameIndex]})` : 'not found'}`)

      const newContacts: { phone_number: string; name?: string; group_id: string }[] = []

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        if (!line) continue

        const values = line.split(",").map((s: string) => s.trim())
        const phone = values[phoneIndex]
        const name = nameIndex >= 0 ? values[nameIndex] : undefined

        if (phone) {
          newContacts.push({ 
            phone_number: phone.startsWith('+') ? phone : `+${phone}`, 
            name: name || undefined,
            group_id: groupId
          })
        }
      }

      if (newContacts.length === 0) {
        alert("❌ No valid contacts found in CSV")
        return
      }

      console.log(`📥 Importing ${newContacts.length} contacts to group...`)

      try {
        const response = await fetch("/api/contacts/bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ contacts: newContacts }),
        })

        const data = await response.json()

        if (response.ok) {
          console.log(`✅ Successfully imported ${data.count} contacts`)
          
          let message = `✅ Successfully imported ${data.count} new contacts to this group!`
          
          if (data.skipped > 0) {
            message += `\n\n⏭️ Skipped ${data.skipped} contacts (already exist in database)`
          }
          
          if (data.message) {
            message = `ℹ️ ${data.message}`
          }
          
          alert(message)
          fetchGroups() // Refresh to update contact counts
        } else {
          console.error(`❌ Import failed:`, data)
          alert(`❌ Import failed:\n\n${data.error || 'Unknown error'}${data.details ? `\n\nDetails: ${data.details}` : ''}`)
        }
      } catch (error) {
        console.error("❌ Error importing contacts:", error)
        alert("❌ Failed to import contacts - network error")
      } finally {
        setSelectedGroupForImport(null)
      }
    }
    input.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contact Groups</h1>
          <p className="text-muted-foreground">
            Organize your contacts into groups for easier campaign targeting
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Contact Group</DialogTitle>
              <DialogDescription>
                Create a new group to organize your contacts
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateGroup}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Group Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Finland Customers"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="e.g. All customers from Finland region"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Group"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading groups...
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first contact group to get started
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{group.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteGroup(group.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardTitle>
                {group.description && (
                  <CardDescription>{group.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{group.contact_count || 0} contacts</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleImportCSVToGroup(group.id)}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Import CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      asChild
                    >
                      <Link href={`/dashboard/groups/${group.id}`}>
                        View
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

