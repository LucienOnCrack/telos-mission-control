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
    const validContactsMap = new Map<string, { phone_number: string; name: string | null; group_id: string | null }>()
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

      // Deduplicate by phone number (keep the last occurrence)
      validContactsMap.set(formattedPhone, {
        phone_number: formattedPhone,
        name: contact.name || null,
        group_id: contact.group_id || null,
      })
    }

    const validContacts = Array.from(validContactsMap.values())

    if (validContacts.length === 0) {
      return NextResponse.json(
        { error: "No valid contacts to import", errors },
        { status: 400 }
      )
    }

    console.log(`📥 Checking ${validContacts.length} unique contacts (from ${contacts.length} total)...`)

    // Check which phone numbers already exist
    const phoneNumbers = validContacts.map(c => c.phone_number)
    const { data: existingContacts } = await supabaseAdmin
      .from("contacts")
      .select("phone_number")
      .in("phone_number", phoneNumbers)

    const existingPhones = new Set(existingContacts?.map(c => c.phone_number) || [])

    // Filter out existing contacts
    const newContacts = validContacts.filter(c => !existingPhones.has(c.phone_number))
    
    // Add existing contacts to errors array
    const skippedContacts = validContacts.filter(c => existingPhones.has(c.phone_number))
    skippedContacts.forEach(contact => {
      errors.push({ 
        phone_number: contact.phone_number, 
        error: "Phone number already exists in database - skipped" 
      })
      console.log(`⏭️ Skipping existing contact: ${contact.phone_number}`)
    })

    if (newContacts.length === 0) {
      console.log(`ℹ️ No new contacts to import - all ${validContacts.length} contacts already exist`)
      return NextResponse.json({
        count: 0,
        contacts: [],
        errors,
        message: `All ${validContacts.length} contacts already exist in database`
      })
    }

    console.log(`📥 Importing ${newContacts.length} new contacts (${skippedContacts.length} skipped as already existing)...`)

    // Insert only new contacts
    const { data: insertedContacts, error } = await supabaseAdmin
      .from("contacts")
      .insert(newContacts)
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

    console.log(`✅ Successfully imported ${insertedContacts?.length || 0} new contacts`)

    return NextResponse.json({
      count: insertedContacts?.length || 0,
      contacts: insertedContacts,
      skipped: skippedContacts.length,
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

