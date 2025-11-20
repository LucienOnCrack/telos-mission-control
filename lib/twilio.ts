/**
 * Twilio API Helper Functions
 * Documentation: https://www.twilio.com/docs/voice/api
 */

import twilio from 'twilio'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER

if (!TWILIO_ACCOUNT_SID) {
  console.error('❌ CRITICAL: TWILIO_ACCOUNT_SID is not set in environment variables')
}

if (!TWILIO_AUTH_TOKEN) {
  console.error('❌ CRITICAL: TWILIO_AUTH_TOKEN is not set in environment variables')
}

if (!TWILIO_PHONE_NUMBER) {
  console.error('❌ CRITICAL: TWILIO_PHONE_NUMBER is not set in environment variables')
}

// Initialize Twilio client
let twilioClient: ReturnType<typeof twilio> | null = null

try {
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    console.log('✅ Twilio client initialized successfully')
  }
} catch (error) {
  console.error('❌ CRITICAL: Failed to initialize Twilio client:', error)
}

export interface TwilioResponse {
  success: boolean
  data?: any
  error?: string
  errorDetails?: any
  callSid?: string
}

/**
 * Detailed error logger
 */
function logError(context: string, error: any, details?: any) {
  const timestamp = new Date().toISOString()
  console.error('═'.repeat(80))
  console.error(`❌ ERROR IN: ${context}`)
  console.error(`⏰ Timestamp: ${timestamp}`)
  console.error(`📝 Error:`, error)
  if (details) {
    console.error(`📋 Additional Details:`, JSON.stringify(details, null, 2))
  }
  console.error('═'.repeat(80))
}

/**
 * Detailed success logger
 */
function logSuccess(context: string, details?: any) {
  const timestamp = new Date().toISOString()
  console.log('═'.repeat(80))
  console.log(`✅ SUCCESS IN: ${context}`)
  console.log(`⏰ Timestamp: ${timestamp}`)
  if (details) {
    console.log(`📋 Details:`, JSON.stringify(details, null, 2))
  }
  console.log('═'.repeat(80))
}

/**
 * Initiate an outbound voice call with audio playback
 */
export async function initiateVoiceCall(
  to: string,
  audioUrl: string,
  webhookUrl?: string
): Promise<TwilioResponse> {
  const context = 'initiateVoiceCall'
  
  console.log(`🔄 STARTING: ${context}`)
  console.log(`📞 Calling: ${to}`)
  console.log(`🎵 Audio URL: ${audioUrl}`)
  console.log(`🔗 Webhook URL: ${webhookUrl || 'Not provided'}`)

  // Validation checks
  if (!twilioClient) {
    const errorMsg = 'Twilio client is not initialized. Check your credentials.'
    logError(context, errorMsg)
    return {
      success: false,
      error: errorMsg,
      errorDetails: {
        accountSid: TWILIO_ACCOUNT_SID ? 'Set' : 'Missing',
        authToken: TWILIO_AUTH_TOKEN ? 'Set' : 'Missing',
        phoneNumber: TWILIO_PHONE_NUMBER ? 'Set' : 'Missing',
      }
    }
  }

  if (!TWILIO_PHONE_NUMBER) {
    const errorMsg = 'TWILIO_PHONE_NUMBER is not configured'
    logError(context, errorMsg)
    return {
      success: false,
      error: errorMsg
    }
  }

  if (!validatePhoneNumber(to)) {
    const errorMsg = `Invalid phone number format: ${to}. Must be in E.164 format (e.g., +12345678901)`
    logError(context, errorMsg, { providedNumber: to })
    return {
      success: false,
      error: errorMsg
    }
  }

  if (!audioUrl || !audioUrl.startsWith('http')) {
    const errorMsg = `Invalid audio URL: ${audioUrl}. Must be a valid HTTP/HTTPS URL`
    logError(context, errorMsg, { providedUrl: audioUrl })
    return {
      success: false,
      error: errorMsg
    }
  }

  try {
    console.log('🚀 Making Twilio API call...')
    
    // Create TwiML for playing audio
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
</Response>`

    const finalWebhookUrl = webhookUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/webhook`
    console.log(`🔔 Webhook URL being sent to Twilio: "${finalWebhookUrl}"`)
    console.log(`📊 Webhook events requested: ['initiated', 'ringing', 'answered', 'completed']`)

    const call = await twilioClient.calls.create({
      to,
      from: TWILIO_PHONE_NUMBER,
      twiml,
      statusCallback: finalWebhookUrl,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
    })

    logSuccess(context, {
      callSid: call.sid,
      to: call.to,
      from: call.from,
      status: call.status,
      direction: call.direction,
    })

    return {
      success: true,
      callSid: call.sid,
      data: call,
    }
  } catch (error: any) {
    logError(context, error, {
      to,
      from: TWILIO_PHONE_NUMBER,
      audioUrl,
      errorCode: error.code,
      errorMessage: error.message,
      errorStatus: error.status,
      errorDetails: error.moreInfo,
    })

    return {
      success: false,
      error: error.message || 'Failed to initiate call',
      errorDetails: {
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo,
        to,
        from: TWILIO_PHONE_NUMBER,
      }
    }
  }
}

/**
 * Send SMS message via Twilio
 */
export async function sendSMS(to: string, text: string): Promise<TwilioResponse> {
  const context = 'sendSMS'
  
  console.log(`🔄 STARTING: ${context}`)
  console.log(`📱 Sending SMS to: ${to}`)
  console.log(`💬 Message: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`)

  if (!twilioClient) {
    const errorMsg = 'Twilio client is not initialized'
    logError(context, errorMsg)
    return {
      success: false,
      error: errorMsg
    }
  }

  if (!TWILIO_PHONE_NUMBER) {
    const errorMsg = 'TWILIO_PHONE_NUMBER is not configured'
    logError(context, errorMsg)
    return {
      success: false,
      error: errorMsg
    }
  }

  if (!validatePhoneNumber(to)) {
    const errorMsg = `Invalid phone number format: ${to}`
    logError(context, errorMsg)
    return {
      success: false,
      error: errorMsg
    }
  }

  try {
    console.log('🚀 Sending SMS via Twilio...')
    
    const message = await twilioClient.messages.create({
      body: text,
      to,
      from: TWILIO_PHONE_NUMBER,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/webhook`,
    })

    logSuccess(context, {
      messageSid: message.sid,
      to: message.to,
      from: message.from,
      status: message.status,
    })

    return {
      success: true,
      data: message,
    }
  } catch (error: any) {
    logError(context, error, {
      to,
      from: TWILIO_PHONE_NUMBER,
      messageLength: text.length,
    })

    return {
      success: false,
      error: error.message || 'Failed to send SMS',
      errorDetails: {
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo,
      }
    }
  }
}

/**
 * Get call status
 */
export async function getCallStatus(callSid: string): Promise<TwilioResponse> {
  const context = 'getCallStatus'
  
  console.log(`🔄 STARTING: ${context}`)
  console.log(`🔍 Fetching status for call: ${callSid}`)

  if (!twilioClient) {
    const errorMsg = 'Twilio client is not initialized'
    logError(context, errorMsg)
    return {
      success: false,
      error: errorMsg
    }
  }

  try {
    const call = await twilioClient.calls(callSid).fetch()
    
    logSuccess(context, {
      callSid: call.sid,
      status: call.status,
      duration: call.duration,
      startTime: call.startTime,
      endTime: call.endTime,
    })

    return {
      success: true,
      data: call,
    }
  } catch (error: any) {
    logError(context, error, { callSid })

    return {
      success: false,
      error: error.message || 'Failed to get call status',
      errorDetails: {
        code: error.code,
        callSid,
      }
    }
  }
}

/**
 * Validate phone number format (E.164)
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  // E.164 format: +[country code][number]
  // Example: +12345678901
  const e164Regex = /^\+[1-9]\d{1,14}$/
  const isValid = e164Regex.test(phoneNumber)
  
  if (!isValid) {
    console.warn(`⚠️ Invalid phone number format: ${phoneNumber}`)
    console.warn(`   Expected E.164 format: +[country code][number]`)
    console.warn(`   Example: +12345678901`)
  }
  
  return isValid
}

/**
 * Format phone number to E.164
 */
export function formatPhoneNumber(phoneNumber: string): string {
  console.log(`🔄 Formatting phone number: ${phoneNumber}`)
  
  // Remove all non-digit characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '')
  
  // Add + if not present
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned
  }
  
  console.log(`✅ Formatted phone number: ${cleaned}`)
  
  return cleaned
}

/**
 * Test Twilio configuration
 */
export async function testTwilioConfig(): Promise<TwilioResponse> {
  const context = 'testTwilioConfig'
  
  console.log('═'.repeat(80))
  console.log('🧪 TESTING TWILIO CONFIGURATION')
  console.log('═'.repeat(80))

  // Check environment variables
  console.log('Environment Variables Check:')
  console.log(`  TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing'}`)
  console.log(`  TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing'}`)
  console.log(`  TWILIO_PHONE_NUMBER: ${TWILIO_PHONE_NUMBER ? `✅ ${TWILIO_PHONE_NUMBER}` : '❌ Missing'}`)
  console.log(`  NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL ? `✅ ${process.env.NEXT_PUBLIC_APP_URL}` : '❌ Missing'}`)

  if (!twilioClient) {
    console.log('❌ Twilio client initialization FAILED')
    return {
      success: false,
      error: 'Twilio client not initialized'
    }
  }

  try {
    // Test by fetching account details
    console.log('\n🔍 Fetching Twilio account details...')
    
    if (!TWILIO_ACCOUNT_SID) {
      return {
        success: false,
        error: 'TWILIO_ACCOUNT_SID is not configured'
      }
    }
    
    const account = await twilioClient.api.accounts(TWILIO_ACCOUNT_SID).fetch()
    
    console.log('✅ Twilio account verified!')
    console.log(`  Account Name: ${account.friendlyName}`)
    console.log(`  Account Status: ${account.status}`)
    console.log(`  Account Type: ${account.type}`)
    console.log('═'.repeat(80))

    return {
      success: true,
      data: {
        accountSid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
      }
    }
  } catch (error: any) {
    logError(context, error)
    return {
      success: false,
      error: error.message || 'Failed to verify Twilio account',
      errorDetails: {
        code: error.code,
        status: error.status,
      }
    }
  }
}

