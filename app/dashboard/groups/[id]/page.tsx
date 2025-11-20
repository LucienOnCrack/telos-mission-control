"use client"

import { useState, useEffect, useCallback } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, UserPlus, Upload } from "lucide-react"
import { ContactGroup, Contact } from "@/lib/supabase"
import Link from "next/link"
import { useParams } from "next/navigation"

export default function GroupDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const [group, setGroup] = useState<ContactGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([])
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [csvDialogOpen, setCsvDialogOpen] = useState(false)
  const [addExistingToGroup, setAddExistingToGroup] = useState(false)

  const fetchGroup = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/contact-groups/${id}`)

      if (!response.ok) {
        const data = await response.json()
        console.error("❌ Failed to fetch group:", data)
        alert(`Error fetching group:\n${data.error || 'Unknown error'}`)
        return
      }

      const data = await response.json()
      if (data.group) {
        setGroup(data.group)
      }
    } catch (error: any) {
      console.error("❌ CRITICAL ERROR fetching group:", error)
      alert(`Critical error fetching group:\n${error.message || error}`)
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchAvailableContacts = async () => {
    try {
      const response = await fetch("/api/contacts")
      if (!response.ok) return
      
      const data = await response.json()
      if (data.contacts) {
        // Filter out contacts already in this group
        const notInGroup = data.contacts.filter((c: Contact) => c.group_id !== id)
        setAvailableContacts(notInGroup)
      }
    } catch (error) {
      console.error("❌ Error fetching contacts:", error)
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
    if (selectedContacts.length === availableContacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(availableContacts.map((c) => c.id))
    }
  }

  const handleAddContactsToGroup = async () => {
    if (selectedContacts.length === 0) {
      alert("⚠️ Please select at least one contact to add")
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`/api/contact-groups/${id}/add-contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contact_ids: selectedContacts }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(`✅ Successfully added ${selectedContacts.length} contacts to the group!`)
        setDialogOpen(false)
        setSelectedContacts([])
        fetchGroup() // Refresh group data
      } else {
        alert(`❌ Error adding contacts:\n\n${data.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error("❌ Error adding contacts:", error)
      alert(`❌ Failed to add contacts:\n\n${error.message || error}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelectCSVFile = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".csv"
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file) return

      // Close the dialog while processing
      setCsvDialogOpen(false)

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

      const newContacts: { phone_number: string; name?: string }[] = []

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        if (!line) continue

        const values = line.split(",").map((s: string) => s.trim())
        const phone = values[phoneIndex]
        const name = nameIndex >= 0 ? values[nameIndex] : undefined

        if (phone) {
          // Handle phone numbers with or without + prefix
          // Remove any spaces or special characters except + and digits
          let cleanedPhone = phone.replace(/[^\d+]/g, '')
          // Ensure it starts with +
          if (!cleanedPhone.startsWith('+')) {
            cleanedPhone = '+' + cleanedPhone
          }
          newContacts.push({ 
            phone_number: cleanedPhone,
            name: name || undefined 
          })
        }
      }

      if (newContacts.length === 0) {
        alert("❌ No valid contacts found in CSV\n\nMake sure the phone column has values")
        return
      }

      console.log(`📥 Importing ${newContacts.length} contacts to group...`)
      console.log(`   Add existing contacts to group: ${addExistingToGroup}`)

      try {
        const response = await fetch(`/api/contact-groups/${id}/import-csv`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            contacts: newContacts,
            add_existing_to_group: addExistingToGroup
          }),
        })

        const data = await response.json()

        if (response.ok) {
          console.log(`✅ Import successful:`, data)
          
          let message = `✅ Import complete!\n\n`
          message += `📥 New contacts created: ${data.inserted}\n`
          
          if (addExistingToGroup) {
            message += `🔄 Existing contacts added to group: ${data.updated}\n`
          }
          
          if (data.skipped > 0) {
            if (addExistingToGroup) {
              message += `⏭️ Already in group: ${data.skipped}\n`
            } else {
              message += `⏭️ Skipped (already exist): ${data.skipped}\n`
            }
          }
          
          message += `\nTotal processed: ${data.count}`
          
          alert(message)
          fetchGroup() // Refresh group data
        } else {
          console.error(`❌ Import failed:`, data)
          alert(`❌ Import failed:\n\n${data.error || 'Unknown error'}${data.details ? `\n\nDetails: ${data.details}` : ''}`)
        }
      } catch (error: any) {
        console.error("❌ Error importing CSV:", error)
        alert("❌ Failed to import CSV - network error")
      }
    }
    input.click()
  }

  useEffect(() => {
    if (id) {
      fetchGroup()
    }
  }, [id, fetchGroup])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          Loading group...
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Group not found</p>
          <Button asChild>
            <Link href="/dashboard/groups">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Groups
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/groups">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{group.name}</h1>
          {group.description && (
            <p className="text-muted-foreground">{group.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            {group.contact_count || 0} contacts in this group
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import CSV to Group</DialogTitle>
                <DialogDescription>
                  Upload a CSV file with phone numbers to add contacts to &quot;{group.name}&quot;
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">CSV Format</Label>
                  <p className="text-sm text-muted-foreground">
                    Your CSV should have a header row with at least a <code className="bg-muted px-1 py-0.5 rounded">phone_number</code> or <code className="bg-muted px-1 py-0.5 rounded">phone</code> column.
                    Phone numbers can include the + prefix or not - it will be added automatically.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Example:
                  </p>
                  <pre className="text-xs bg-muted p-2 rounded">
phone_number,name{"\n"}4915150568742,John{"\n"}+1234567890,Jane
                  </pre>
                </div>
                <div className="space-y-3 border-t pt-4">
                  <Label className="text-sm font-medium">
                    If contact already exists in database:
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <input
                        type="radio"
                        id="skip-existing"
                        name="existing-option"
                        checked={!addExistingToGroup}
                        onChange={() => setAddExistingToGroup(false)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <label htmlFor="skip-existing" className="text-sm font-medium cursor-pointer">
                          Skip (don&apos;t add to group)
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Only create new contacts and add them to the group
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <input
                        type="radio"
                        id="add-existing"
                        name="existing-option"
                        checked={addExistingToGroup}
                        onChange={() => setAddExistingToGroup(true)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <label htmlFor="add-existing" className="text-sm font-medium cursor-pointer">
                          Add to group
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Add existing contacts to this group (never creates duplicates)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCsvDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSelectCSVFile}>
                  <Upload className="mr-2 h-4 w-4" />
                  Choose CSV File to Import
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={fetchAvailableContacts}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Contacts
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Contacts to Group</DialogTitle>
              <DialogDescription>
                Select existing contacts to add to &quot;{group.name}&quot;
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {selectedContacts.length} of {availableContacts.length} contacts selected
                </p>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedContacts.length === availableContacts.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>
              <div className="border rounded-md p-4 max-h-96 overflow-y-auto">
                {availableContacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No available contacts. All contacts are either already in this group or you have no contacts.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availableContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={contact.id}
                          checked={selectedContacts.includes(contact.id)}
                          onCheckedChange={() => handleToggleContact(contact.id)}
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddContactsToGroup}
                disabled={submitting || selectedContacts.length === 0}
              >
                {submitting ? "Adding..." : `Add ${selectedContacts.length} Contact${selectedContacts.length !== 1 ? 's' : ''}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phone Number</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!group.contacts || group.contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No contacts in this group yet. Import a CSV to add contacts.
                </TableCell>
              </TableRow>
            ) : (
              group.contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-mono">{contact.phone_number}</TableCell>
                  <TableCell>{contact.name || "-"}</TableCell>
                  <TableCell>{new Date(contact.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

