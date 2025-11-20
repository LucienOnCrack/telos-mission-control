"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft } from "lucide-react"
import { ContactGroup } from "@/lib/supabase"
import Link from "next/link"
import { useParams } from "next/navigation"

export default function GroupDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const [group, setGroup] = useState<ContactGroup | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGroup = async () => {
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
    }

    if (id) {
      fetchGroup()
    }
  }, [id])

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

