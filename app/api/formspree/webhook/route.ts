import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { formatPhoneNumber, validatePhoneNumber } from "@/lib/twilio"

/**
 * POST /api/formspree/webhook
 * 
 * Receives webhooks from Formspree when a new phone number is submitted.
 * - Adds the phone number to contacts
 * - Checks if the contact has ever been called
 * - Adds them to "not contacted yet" group if they haven't been called
 * 
 * Formspree webhook payload example:
 * {
 *   "email": "user@example.com",
 *   "phone": "+1234567890",
 *   "name": "John Doe",
 *   ... other fields
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Security: Check for webhook secret if configured
    const webhookSecret = process.env.FORMSPREE_WEBHOOK_SECRET
    if (webhookSecret) {
      const providedSecret = request.headers.get('X-Webhook-Secret') || 
                            request.nextUrl.searchParams.get('secret')
      
      if (providedSecret !== webhookSecret) {
        console.error("Unauthorized webhook request - invalid secret")
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      }
    }

    // Parse the webhook payload
    const body = await request.json()
    console.log("Received Formspree webhook:", JSON.stringify(body, null, 2))

    // Extract phone number - Formspree might send it as 'phone', 'phone_number', or custom field name
    const phoneNumber = body.phone || body.phone_number || body.phoneNumber || body.Phone
    
    if (!phoneNumber) {
      console.error("No phone number found in webhook payload")
      return NextResponse.json(
        { error: "Phone number is required", received: body },
        { status: 400 }
      )
    }

    // Extract optional name field
    const name = body.name || body.Name || null

    // Format and validate phone number
    let formattedPhone: string
    try {
      formattedPhone = formatPhoneNumber(phoneNumber)
      if (!validatePhoneNumber(formattedPhone)) {
        console.error("Invalid phone number format:", phoneNumber)
        return NextResponse.json(
          { error: "Invalid phone number format. Must be in E.164 format (e.g., +12345678901)" },
          { status: 400 }
        )
      }
    } catch (error) {
      console.error("Error formatting phone number:", error)
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 }
      )
    }

    // Check if contact already exists
    const { data: existingContact } = await supabaseAdmin
      .from("contacts")
      .select("id, phone_number, group_id")
      .eq("phone_number", formattedPhone)
      .single()

    let contactId: string
    let isNewContact = false

    if (existingContact) {
      console.log("Contact already exists:", existingContact.id)
      contactId = existingContact.id
      
      // If contact already has a group, we don't need to do anything
      if (existingContact.group_id) {
        console.log("Contact already has a group assigned")
        return NextResponse.json({
          message: "Contact already exists with group assigned",
          contact: existingContact,
          skipped: true
        })
      }
    } else {
      // Create new contact
      const { data: newContact, error: createError } = await supabaseAdmin
        .from("contacts")
        .insert({
          phone_number: formattedPhone,
          name: name || null,
        })
        .select()
        .single()

      if (createError) {
        console.error("Error creating contact:", createError)
        return NextResponse.json(
          { error: "Failed to create contact" },
          { status: 500 }
        )
      }

      console.log("Created new contact:", newContact.id)
      contactId = newContact.id
      isNewContact = true
    }

    // Check if this contact has ever been called
    const { data: callHistory, error: callCheckError } = await supabaseAdmin
      .from("campaign_recipients")
      .select("id")
      .eq("contact_id", contactId)
      .limit(1)

    if (callCheckError) {
      console.error("Error checking call history:", callCheckError)
      // Continue anyway - we'll assume they haven't been contacted
    }

    const hasBeenContacted = callHistory && callHistory.length > 0

    if (hasBeenContacted) {
      console.log("Contact has been contacted before, not adding to 'not contacted yet' group")
      return NextResponse.json({
        message: "Contact has been contacted before",
        contact: { id: contactId, phone_number: formattedPhone },
        added_to_group: false
      })
    }

    // Get or create "not contacted yet" group
    let groupId: string

    const { data: existingGroup } = await supabaseAdmin
      .from("contact_groups")
      .select("id")
      .eq("name", "Not Contacted Yet")
      .single()

    if (existingGroup) {
      groupId = existingGroup.id
      console.log("Using existing 'Not Contacted Yet' group:", groupId)
    } else {
      // Create the group
      const { data: newGroup, error: groupError } = await supabaseAdmin
        .from("contact_groups")
        .insert({
          name: "Not Contacted Yet",
          description: "Contacts who have never been called through any campaign"
        })
        .select()
        .single()

      if (groupError) {
        console.error("Error creating 'Not Contacted Yet' group:", groupError)
        return NextResponse.json(
          { error: "Failed to create contact group" },
          { status: 500 }
        )
      }

      groupId = newGroup.id
      console.log("Created new 'Not Contacted Yet' group:", groupId)
    }

    // Assign contact to the group
    const { error: updateError } = await supabaseAdmin
      .from("contacts")
      .update({ group_id: groupId })
      .eq("id", contactId)

    if (updateError) {
      console.error("Error assigning contact to group:", updateError)
      return NextResponse.json(
        { error: "Failed to assign contact to group" },
        { status: 500 }
      )
    }

    console.log("Successfully assigned contact to 'Not Contacted Yet' group")

    return NextResponse.json({
      success: true,
      message: isNewContact 
        ? "Contact created and added to 'Not Contacted Yet' group" 
        : "Contact updated and added to 'Not Contacted Yet' group",
      contact: {
        id: contactId,
        phone_number: formattedPhone,
        name: name,
        group_id: groupId
      },
      is_new_contact: isNewContact,
      added_to_group: true
    })

  } catch (error) {
    console.error("Error in Formspree webhook:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// GET endpoint for testing/verification
export async function GET() {
  return NextResponse.json({
    message: "Formspree webhook endpoint is active",
    endpoint: "/api/formspree/webhook",
    method: "POST",
    description: "Receives webhooks from Formspree and adds phone numbers to contacts"
  })
}

