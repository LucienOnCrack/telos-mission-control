import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { formatPhoneNumber, validatePhoneNumber } from "@/lib/twilio"

// GET /api/contacts - List all contacts
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication when ready
    // const user = await requirePayingUser(request)

    const { data: contacts, error } = await supabaseAdmin
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching contacts:", error)
      return NextResponse.json(
        { error: "Failed to fetch contacts" },
        { status: 500 }
      )
    }

    return NextResponse.json({ contacts })
  } catch (error) {
    console.error("Error in GET /api/contacts:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/contacts - Create a new contact
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication when ready
    // const user = await requirePayingUser(request)

    const body = await request.json()
    const { phone_number, name } = body

    if (!phone_number) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      )
    }

    // Format and validate phone number
    const formattedPhone = formatPhoneNumber(phone_number)
    if (!validatePhoneNumber(formattedPhone)) {
      return NextResponse.json(
        { error: "Invalid phone number format. Use E.164 format (e.g., +12345678901)" },
        { status: 400 }
      )
    }

    // Check if contact already exists
    const { data: existingContact } = await supabaseAdmin
      .from("contacts")
      .select("id")
      .eq("phone_number", formattedPhone)
      .single()

    if (existingContact) {
      return NextResponse.json(
        { error: "Contact with this phone number already exists" },
        { status: 409 }
      )
    }

    // Create contact
    const { data: contact, error } = await supabaseAdmin
      .from("contacts")
      .insert({
        phone_number: formattedPhone,
        name: name || null,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating contact:", error)
      return NextResponse.json(
        { error: "Failed to create contact" },
        { status: 500 }
      )
    }

    return NextResponse.json({ contact }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/contacts:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/contacts?id=xxx - Delete a contact
export async function DELETE(request: NextRequest) {
  try {
    // TODO: Add authentication when ready
    // const user = await requirePayingUser(request)

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Contact ID is required" },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("contacts")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting contact:", error)
      return NextResponse.json(
        { error: "Failed to delete contact" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/contacts:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

