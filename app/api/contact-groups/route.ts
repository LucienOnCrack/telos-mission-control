import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// GET /api/contact-groups - List all contact groups
export async function GET(request: NextRequest) {
  try {
    // Get all groups with contact count
    const { data: groups, error } = await supabaseAdmin
      .from("contact_groups")
      .select(`
        *,
        contacts:contacts(count)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching contact groups:", error)
      return NextResponse.json(
        { error: "Failed to fetch contact groups" },
        { status: 500 }
      )
    }

    // Transform the data to include contact count
    const groupsWithCount = groups?.map(group => ({
      ...group,
      contact_count: group.contacts?.[0]?.count || 0,
      contacts: undefined // Remove the nested contacts object
    }))

    return NextResponse.json({ groups: groupsWithCount })
  } catch (error: any) {
    console.error("Error in GET /api/contact-groups:", error)
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
  }
}

// POST /api/contact-groups - Create a new contact group
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 }
      )
    }

    // Create the group
    const { data: group, error } = await supabaseAdmin
      .from("contact_groups")
      .insert({
        name: name.trim(),
        description: description || null,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating contact group:", error)
      return NextResponse.json(
        { error: "Failed to create contact group" },
        { status: 500 }
      )
    }

    return NextResponse.json({ group })
  } catch (error: any) {
    console.error("Error in POST /api/contact-groups:", error)
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
  }
}

// DELETE /api/contact-groups?id=xxx - Delete a contact group
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Group ID is required" },
        { status: 400 }
      )
    }

    // Delete the group (contacts will have their group_id set to NULL due to ON DELETE SET NULL)
    const { error } = await supabaseAdmin
      .from("contact_groups")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting contact group:", error)
      return NextResponse.json(
        { error: "Failed to delete contact group" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in DELETE /api/contact-groups:", error)
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
  }
}

