import { createClient } from '@supabase/supabase-js'

// Check if environment variables are defined
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Client-side Supabase client (for use in browser)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Server-side client with service role for admin operations (bypasses RLS)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Database types
export type CampaignType = 'sms' | 'voice' | 'whatsapp'
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed'
export type RecipientStatus = 'pending' | 'sent' | 'delivered' | 'failed'

export interface ContactGroup {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
  contact_count?: number
  contacts?: Contact[]
}

export interface Contact {
  id: string
  phone_number: string
  name?: string
  group_id?: string
  created_at: string
  updated_at: string
  last_contacted_at?: string
}

export interface Campaign {
  id: string
  type: CampaignType
  message?: string
  audio_url?: string
  status: CampaignStatus
  scheduled_for?: string
  created_at: string
  updated_at: string
  sent_at?: string
  completed_at?: string
}

export interface CampaignRecipient {
  id: string
  campaign_id: string
  contact_id: string
  status: RecipientStatus
  sent_at?: string
  delivered_at?: string
  failed_at?: string
  error_message?: string
  twilio_message_sid?: string
  created_at: string
  contact?: Contact
}

export interface CallLog {
  id: string
  campaign_id: string
  contact_id: string
  twilio_call_sid?: string
  answered: boolean
  duration_seconds: number
  call_status?: string
  created_at: string
  answered_at?: string
  ended_at?: string
  contact?: Contact
}



