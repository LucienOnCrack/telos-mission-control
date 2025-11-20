import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { formatPhoneNumber, validatePhoneNumber } from "@/lib/twilio"

// POST /api/contacts/bulk - Bulk import contacts
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication when ready
    // const user = await requirePayingUser(request)

    const body = await request.json()
    const { contacts } = body

    if (!contacts || !Array.isArray(contacts)) {
      return NextResponse.json(
        { error: "Contacts array is required" },
        { status: 400 }
      )
    }

    if (contacts.length === 0) {
      return NextResponse.json(
        { error: "Contacts array cannot be empty" },
        { status: 400 }
      )
    }

    // Validate and format all contacts
    const validContacts = []
    const errors = []

    for (const contact of contacts) {
      if (!contact.phone_number) {
        errors.push({ contact, error: "Missing phone number" })
        continue
      }

      const formattedPhone = formatPhoneNumber(contact.phone_number)
      if (!validatePhoneNumber(formattedPhone)) {
        errors.push({ contact, error: "Invalid phone number format" })
        continue
      }

      validContacts.push({
        phone_number: formattedPhone,
        name: contact.name || null,
      })
    }

    if (validContacts.length === 0) {
      return NextResponse.json(
        { error: "No valid contacts to import", errors },
        { status: 400 }
      )
    }

    // Insert contacts (ignore duplicates)
    const { data: insertedContacts, error } = await supabaseAdmin
      .from("contacts")
      .upsert(validContacts, { onConflict: "phone_number", ignoreDuplicates: true })
      .select()

    if (error) {
      console.error("Error bulk creating contacts:", error)
      return NextResponse.json(
        { error: "Failed to import contacts" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      count: insertedContacts?.length || 0,
      contacts: insertedContacts,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Error in POST /api/contacts/bulk:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

