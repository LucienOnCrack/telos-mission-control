import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// GET /api/contact-groups/[id] - Get a specific group with its contacts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Get the group
    const { data: group, error: groupError } = await supabaseAdmin
      .from("contact_groups")
      .select("*")
      .eq("id", id)
      .single()

    if (groupError) {
      console.error("Error fetching contact group:", groupError)
      return NextResponse.json(
        { error: "Failed to fetch contact group" },
        { status: 500 }
      )
    }

    if (!group) {
      return NextResponse.json(
        { error: "Contact group not found" },
        { status: 404 }
      )
    }

    // Get all contacts in this group
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from("contacts")
      .select("*")
      .eq("group_id", id)
      .order("created_at", { ascending: false })

    if (contactsError) {
      console.error("Error fetching group contacts:", contactsError)
      return NextResponse.json(
        { error: "Failed to fetch group contacts" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      group: {
        ...group,
        contacts: contacts || [],
        contact_count: contacts?.length || 0,
      },
    })
  } catch (error: any) {
    console.error("Error in GET /api/contact-groups/[id]:", error)
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
  }
}

