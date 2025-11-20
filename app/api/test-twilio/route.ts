import { NextResponse } from "next/server"
import { testTwilioConfig } from "@/lib/twilio"

/**
 * Test Twilio Configuration
 * Visit: http://localhost:3000/api/test-twilio
 * 
 * This endpoint tests your Twilio setup and returns detailed information
 */
export async function GET() {
  console.log('🧪 Testing Twilio configuration...')
  
  const result = await testTwilioConfig()
  
  if (result.success) {
    return NextResponse.json({
      success: true,
      message: "✅ Twilio is configured correctly!",
      data: result.data,
    })
  } else {
    return NextResponse.json({
      success: false,
      message: "❌ Twilio configuration failed",
      error: result.error,
      errorDetails: result.errorDetails,
    }, { status: 500 })
  }
}

