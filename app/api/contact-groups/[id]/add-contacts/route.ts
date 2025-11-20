import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// POST /api/contact-groups/[id]/add-contacts - Bulk add contacts to a group
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add authentication when ready
    // const user = await requirePayingUser(request)

    const { id: groupId } = params
    const body = await request.json()
    const { contact_ids } = body

    if (!contact_ids || !Array.isArray(contact_ids) || contact_ids.length === 0) {
      return NextResponse.json(
        { error: "Contact IDs array is required" },
        { status: 400 }
      )
    }

    console.log(`📥 Adding ${contact_ids.length} contacts to group ${groupId}...`)

    // Update all selected contacts to have this group_id
    const { data: updatedContacts, error } = await supabaseAdmin
      .from("contacts")
      .update({ group_id: groupId })
      .in("id", contact_ids)
      .select()

    if (error) {
      console.error("❌ Error adding contacts to group:", error)
      return NextResponse.json(
        { error: "Failed to add contacts to group", details: error.message },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully added ${updatedContacts?.length || 0} contacts to group`)

    return NextResponse.json({
      count: updatedContacts?.length || 0,
      contacts: updatedContacts,
    })
  } catch (error: any) {
    console.error("Error in POST /api/contact-groups/[id]/add-contacts:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}

