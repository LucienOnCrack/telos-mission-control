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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Trash2, Plus, Upload } from "lucide-react"
import { Contact } from "@/lib/supabase"

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/contacts")
      
      if (!response.ok) {
        const data = await response.json()
        console.error("❌ Failed to fetch contacts:", data)
        alert(`Error fetching contacts:\n${data.error || 'Unknown error'}\n\nPlease check the console for details.`)
        return
      }
      
      const data = await response.json()
      if (data.contacts) {
        setContacts(data.contacts)
      }
    } catch (error: any) {
      console.error("❌ CRITICAL ERROR fetching contacts:", error)
      alert(`Critical error fetching contacts:\n${error.message || error}\n\nPlease check your network connection and try again.`)
    } finally {
      setLoading(false)
    }
  }

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    console.log(`📞 Adding contact: ${phoneNumber}${name ? ` (${name})` : ''}`)

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          name: name || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log(`✅ Contact added successfully:`, data.contact)
        alert(`✅ Success!\n\nContact added: ${phoneNumber}${name ? ` (${name})` : ''}`)
        setContacts([...contacts, data.contact])
        setDialogOpen(false)
        setPhoneNumber("")
        setName("")
      } else {
        console.error(`❌ Failed to add contact:`, data)
        alert(`❌ Error adding contact:\n\n${data.error || 'Unknown error'}\n\nDetails:\n- Phone: ${phoneNumber}\n- Status: ${response.status}\n\nPlease check the phone number format (must be E.164 format like +12345678901)`)
      }
    } catch (error: any) {
      console.error("❌ CRITICAL ERROR adding contact:", error)
      alert(`❌ Critical error adding contact:\n\n${error.message || error}\n\nPhone: ${phoneNumber}\n\nPlease check your network connection and try again.`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteContact = async (id: string) => {
    const contact = contacts.find((c) => c.id === id)
    const contactInfo = contact ? `${contact.phone_number}${contact.name ? ` (${contact.name})` : ''}` : id
    
    if (!confirm(`⚠️ Are you sure you want to delete this contact?\n\n${contactInfo}\n\nThis action cannot be undone.`)) {
      return
    }

    console.log(`🗑️ Deleting contact: ${contactInfo}`)

    try {
      const response = await fetch(`/api/contacts?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        console.log(`✅ Contact deleted: ${contactInfo}`)
        alert(`✅ Contact deleted successfully:\n\n${contactInfo}`)
        setContacts(contacts.filter((c) => c.id !== id))
      } else {
        const data = await response.json()
        console.error(`❌ Failed to delete contact:`, data)
        alert(`❌ Error deleting contact:\n\n${data.error || 'Unknown error'}\n\nContact: ${contactInfo}\nStatus: ${response.status}`)
      }
    } catch (error: any) {
      console.error("❌ CRITICAL ERROR deleting contact:", error)
      alert(`❌ Critical error deleting contact:\n\n${error.message || error}\n\nContact: ${contactInfo}`)
    }
  }

  const handleImportCSV = () => {
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

      const newContacts: { phone_number: string; name?: string }[] = []

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        if (!line) continue

        const values = line.split(",").map((s: string) => s.trim())
        const phone = values[phoneIndex]
        const name = nameIndex >= 0 ? values[nameIndex] : undefined

        if (phone) {
          // Ensure phone has + prefix (will be added by formatPhoneNumber if missing)
          newContacts.push({ 
            phone_number: phone.startsWith('+') ? phone : `+${phone}`, 
            name: name || undefined 
          })
        }
      }

      if (newContacts.length === 0) {
        alert("❌ No valid contacts found in CSV\n\nMake sure the phone column has values")
        return
      }

      console.log(`📥 Importing ${newContacts.length} contacts...`)

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
          alert(`✅ Successfully imported ${data.count} contacts!${data.errors ? `\n\n⚠️ ${data.errors.length} errors` : ''}`)
          fetchContacts()
        } else {
          console.error(`❌ Import failed:`, data)
          alert(`❌ Import failed:\n\n${data.error || 'Unknown error'}${data.errors ? `\n\nErrors: ${data.errors.length}` : ''}`)
        }
      } catch (error) {
        console.error("❌ Error importing contacts:", error)
        alert("❌ Failed to import contacts - network error")
      }
    }
    input.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your contact list for messaging campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleImportCSV} variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddContact}>
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                  <DialogDescription>
                    Add a new contact to your messaging list. Phone number must
                    be in E.164 format (e.g., +12345678901).
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      placeholder="+12345678901"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name (Optional)</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
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
                    {submitting ? "Adding..." : "Add Contact"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Loading contacts...
                </TableCell>
              </TableRow>
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  No contacts found. Add your first contact to get started.
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">
                    {contact.name || "-"}
                  </TableCell>
                  <TableCell>{contact.phone_number}</TableCell>
                  <TableCell>
                    {new Date(contact.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteContact(contact.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

