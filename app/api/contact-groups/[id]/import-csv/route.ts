import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { formatPhoneNumber, validatePhoneNumber } from "@/lib/twilio"

// POST /api/contact-groups/[id]/import-csv - Import contacts from CSV to a group
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add authentication when ready
    // const user = await requirePayingUser(request)

    const { id: groupId } = params
    const body = await request.json()
    const { contacts, add_existing_to_group } = body

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

    // Verify the group exists
    const { data: group, error: groupError } = await supabaseAdmin
      .from("contact_groups")
      .select("id, name")
      .eq("id", groupId)
      .single()

    if (groupError || !group) {
      console.error("❌ Group not found:", groupError)
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      )
    }

    console.log(`📥 Importing ${contacts.length} contacts to group "${group.name}" (${groupId})...`)
    console.log(`   Add existing contacts to group: ${add_existing_to_group ? 'YES' : 'NO'}`)

    // Validate and format all contacts
    const validContactsMap = new Map<string, { phone_number: string; name: string | null; group_id: string }>()
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
        group_id: groupId,
      })
    }

    const validContacts = Array.from(validContactsMap.values())

    if (validContacts.length === 0) {
      return NextResponse.json(
        { error: "No valid contacts to import", errors },
        { status: 400 }
      )
    }

    console.log(`📊 Validated ${validContacts.length} unique contacts (from ${contacts.length} total)...`)

    // Check which phone numbers already exist
    const phoneNumbers = validContacts.map(c => c.phone_number)
    const { data: existingContacts } = await supabaseAdmin
      .from("contacts")
      .select("id, phone_number, group_id")
      .in("phone_number", phoneNumbers)

    const existingContactsMap = new Map(
      existingContacts?.map(c => [c.phone_number, c]) || []
    )

    // Separate contacts into new and existing
    const newContacts = validContacts.filter(c => !existingContactsMap.has(c.phone_number))
    const existingContactsList = validContacts.filter(c => existingContactsMap.has(c.phone_number))
    
    let insertedCount = 0
    let updatedCount = 0
    let skippedCount = 0
    let insertedContacts: any[] = []
    let updatedContacts: any[] = []

    // Handle new contacts - always insert with group_id
    if (newContacts.length > 0) {
      console.log(`📥 Inserting ${newContacts.length} new contacts to group...`)
      
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("contacts")
        .insert(newContacts)
        .select()

      if (insertError) {
        console.error("❌ Error inserting new contacts:", insertError)
        return NextResponse.json(
          { error: "Failed to insert new contacts", details: insertError.message },
          { status: 500 }
        )
      }

      insertedContacts = inserted || []
      insertedCount = insertedContacts.length
      console.log(`✅ Inserted ${insertedCount} new contacts to group`)
    }

    // Handle existing contacts based on add_existing_to_group flag
    if (existingContactsList.length > 0) {
      if (add_existing_to_group) {
        // Add existing contacts to the group (update their group_id)
        console.log(`🔄 Adding ${existingContactsList.length} existing contacts to group...`)
        
        const contactIdsToUpdate = existingContactsList
          .map(c => existingContactsMap.get(c.phone_number))
          .filter(c => c && c.group_id !== groupId) // Only update if not already in this group
          .map(c => c!.id)

        if (contactIdsToUpdate.length > 0) {
          const { data: updated, error: updateError } = await supabaseAdmin
            .from("contacts")
            .update({ group_id: groupId })
            .in("id", contactIdsToUpdate)
            .select()

          if (updateError) {
            console.error("❌ Error updating existing contacts:", updateError)
            return NextResponse.json(
              { error: "Failed to update existing contacts", details: updateError.message },
              { status: 500 }
            )
          }

          updatedContacts = updated || []
          updatedCount = updatedContacts.length
          console.log(`✅ Added ${updatedCount} existing contacts to group`)
        }

        // Count contacts that were already in this group
        const alreadyInGroup = existingContactsList.length - contactIdsToUpdate.length
        if (alreadyInGroup > 0) {
          console.log(`ℹ️ ${alreadyInGroup} contacts were already in this group`)
          skippedCount = alreadyInGroup
          existingContactsList
            .filter(c => {
              const existing = existingContactsMap.get(c.phone_number)
              return existing && existing.group_id === groupId
            })
            .forEach(contact => {
              errors.push({ 
                phone_number: contact.phone_number, 
                error: "Contact already in this group - skipped" 
              })
            })
        }
      } else {
        // Don't add existing contacts to group
        console.log(`⏭️ Skipping ${existingContactsList.length} existing contacts`)
        skippedCount = existingContactsList.length
        existingContactsList.forEach(contact => {
          errors.push({ 
            phone_number: contact.phone_number, 
            error: "Phone number already exists in database - skipped (not added to group)" 
          })
        })
      }
    }

    const totalProcessed = insertedCount + updatedCount

    console.log(`✅ Import complete:`)
    console.log(`   - New contacts created: ${insertedCount}`)
    console.log(`   - Existing contacts added to group: ${updatedCount}`)
    console.log(`   - Skipped: ${skippedCount}`)

    return NextResponse.json({
      count: totalProcessed,
      inserted: insertedCount,
      updated: updatedCount,
      skipped: skippedCount,
      contacts: [...insertedContacts, ...updatedContacts],
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error("Error in POST /api/contact-groups/[id]/import-csv:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}

