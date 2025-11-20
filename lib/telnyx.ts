/**
 * Telnyx API Helper Functions
 * Documentation: https://developers.telnyx.com/
 */

const TELNYX_API_KEY = process.env.TELNYX_API_KEY
const TELNYX_PHONE_NUMBER = process.env.TELNYX_PHONE_NUMBER
const TELNYX_BASE_URL = 'https://api.telnyx.com/v2'

if (!TELNYX_API_KEY) {
  console.warn('Warning: TELNYX_API_KEY is not set in environment variables')
}

if (!TELNYX_PHONE_NUMBER) {
  console.warn('Warning: TELNYX_PHONE_NUMBER is not set in environment variables')
}

interface TelnyxResponse {
  data?: any
  errors?: any[]
}

/**
 * Send SMS message via Telnyx
 */
export async function sendSMS(to: string, text: string): Promise<TelnyxResponse> {
  try {
    const response = await fetch(`${TELNYX_BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TELNYX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: TELNYX_PHONE_NUMBER,
        to,
        text,
      }),
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error('Telnyx SMS Error:', data)
      return { errors: data.errors || [{ message: 'Failed to send SMS' }] }
    }

    return { data }
  } catch (error) {
    console.error('Error sending SMS:', error)
    return { errors: [{ message: String(error) }] }
  }
}

/**
 * Initiate an outbound voice call with a prerecorded message
 */
export async function initiateVoiceCall(
  to: string,
  audioUrl: string,
  webhookUrl?: string
): Promise<TelnyxResponse> {
  try {
    const response = await fetch(`${TELNYX_BASE_URL}/calls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TELNYX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        connection_id: process.env.TELNYX_CONNECTION_ID,
        to,
        from: TELNYX_PHONE_NUMBER,
        webhook_url: webhookUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/telnyx/webhook`,
        webhook_url_method: 'POST',
        audio_url: audioUrl,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Telnyx Voice Call Error:', data)
      return { errors: data.errors || [{ message: 'Failed to initiate call' }] }
    }

    return { data }
  } catch (error) {
    console.error('Error initiating voice call:', error)
    return { errors: [{ message: String(error) }] }
  }
}

/**
 * Answer a call and play audio
 */
export async function answerCallAndPlayAudio(
  callControlId: string,
  audioUrl: string
): Promise<TelnyxResponse> {
  try {
    // First, answer the call
    const answerResponse = await fetch(
      `${TELNYX_BASE_URL}/calls/${callControlId}/actions/answer`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TELNYX_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!answerResponse.ok) {
      const errorData = await answerResponse.json()
      console.error('Error answering call:', errorData)
      return { errors: errorData.errors || [{ message: 'Failed to answer call' }] }
    }

    // Then, play the audio
    const playbackResponse = await fetch(
      `${TELNYX_BASE_URL}/calls/${callControlId}/actions/playback_start`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TELNYX_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: audioUrl,
        }),
      }
    )

    const data = await playbackResponse.json()

    if (!playbackResponse.ok) {
      console.error('Error playing audio:', data)
      return { errors: data.errors || [{ message: 'Failed to play audio' }] }
    }

    return { data }
  } catch (error) {
    console.error('Error in answerCallAndPlayAudio:', error)
    return { errors: [{ message: String(error) }] }
  }
}

/**
 * Hangup a call
 */
export async function hangupCall(callControlId: string): Promise<TelnyxResponse> {
  try {
    const response = await fetch(
      `${TELNYX_BASE_URL}/calls/${callControlId}/actions/hangup`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TELNYX_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Error hanging up call:', data)
      return { errors: data.errors || [{ message: 'Failed to hangup call' }] }
    }

    return { data }
  } catch (error) {
    console.error('Error hanging up call:', error)
    return { errors: [{ message: String(error) }] }
  }
}

/**
 * Send WhatsApp message via Telnyx (Future implementation)
 */
export async function sendWhatsApp(to: string, text: string): Promise<TelnyxResponse> {
  try {
    // WhatsApp requires a business profile and approval
    // This is a placeholder for future implementation
    const response = await fetch(`${TELNYX_BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TELNYX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.TELNYX_WHATSAPP_NUMBER,
        to,
        text,
        type: 'whatsapp',
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Telnyx WhatsApp Error:', data)
      return { errors: data.errors || [{ message: 'Failed to send WhatsApp message' }] }
    }

    return { data }
  } catch (error) {
    console.error('Error sending WhatsApp:', error)
    return { errors: [{ message: String(error) }] }
  }
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  // E.164 format: +[country code][number]
  // Example: +12345678901
  const e164Regex = /^\+[1-9]\d{1,14}$/
  return e164Regex.test(phoneNumber)
}

/**
 * Format phone number to E.164
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '')
  
  // Add + if not present
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned
  }
  
  return cleaned
}

