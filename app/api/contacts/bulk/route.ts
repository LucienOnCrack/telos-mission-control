import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { formatPhoneNumber, validatePhoneNumber } from "@/lib/twilio"

// POST /api/contacts/bulk - Bulk import contacts
export async function POST(request: NextRequest) {
  try {
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
      // Accept both 'phone' and 'phone_number' field names
      const phoneNumber = contact.phone_number || contact.phone
      
      if (!phoneNumber) {
        errors.push({ contact, error: "Missing phone number" })
        continue
      }

      const formattedPhone = formatPhoneNumber(phoneNumber)
      if (!validatePhoneNumber(formattedPhone)) {
        errors.push({ contact, error: `Invalid phone number format: ${phoneNumber}` })
        continue
      }

      validContacts.push({
        phone_number: formattedPhone,
        name: contact.name || null,
        group_id: contact.group_id || null,
      })
    }

    if (validContacts.length === 0) {
      return NextResponse.json(
        { error: "No valid contacts to import", errors },
        { status: 400 }
      )
    }

    console.log(`📥 Importing ${validContacts.length} contacts...`)

    // Insert or update contacts (upsert will update group_id if contact already exists)
    const { data: insertedContacts, error } = await supabaseAdmin
      .from("contacts")
      .upsert(validContacts, { 
        onConflict: "phone_number",
        ignoreDuplicates: false 
      })
      .select()

    if (error) {
      console.error("❌ Error bulk creating contacts:", error)
      console.error("   Message:", error.message)
      console.error("   Details:", error.details)
      console.error("   Hint:", error.hint)
      return NextResponse.json(
        { error: "Failed to import contacts", details: error.message, hint: error.hint },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully imported ${insertedContacts?.length || 0} contacts`)

    return NextResponse.json({
      count: insertedContacts?.length || 0,
      contacts: insertedContacts,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error("Error in POST /api/contacts/bulk:", error)
    if (error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 403 })
    }
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}

