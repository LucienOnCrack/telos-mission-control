# Telos Mission Control

A comprehensive mass messaging and calling platform built with Next.js, React, Supabase, and Twilio API.

## Features

### Core Functionality
- 📱 **SMS Mass Messaging** - Send SMS to multiple contacts instantly or scheduled
- ☎️ **Voice Campaigns** - Automated voice calls with prerecorded messages
- 🎵 **Audio File Hosting** - Built-in Vercel Blob storage for audio files
- 💬 **WhatsApp Support** - Ready for WhatsApp integration (coming soon)
- 📅 **Campaign Scheduling** - Schedule campaigns for future delivery
- 📊 **Real-time Tracking** - Monitor delivery status and call analytics
- 📈 **Call Analytics** - Track answered calls, duration, and engagement

### Contact Management
- 👥 **Contact Database** - Store and manage phone numbers with names
- 📥 **Bulk Import** - CSV import for adding multiple contacts
- 🔍 **Contact Organization** - Easy-to-use contact list interface

### Campaign Features
- 🎯 **Targeted Campaigns** - Select specific contacts for each campaign
- ⏰ **Instant or Scheduled** - Send immediately or schedule for later
- 📊 **Campaign Dashboard** - View all campaigns with status and metrics
- 🔔 **Delivery Status** - Track sent, delivered, and failed messages
- 📞 **Call Tracking** - Monitor answered calls and call duration

### Security & Performance
- 🔒 **Authentication Required** - All endpoints protected
- 💳 **Payment Verification** - Requires active subscription
- ⚡ **Rate Limiting** - Prevents abuse and ensures stability
- 🛡️ **Input Validation** - Phone number format validation and sanitization

### Technical Features
- 🎨 Modern UI components from shadcn/ui
- 🌓 Dark mode support
- 📱 Fully responsive design
- 🔄 Real-time webhook integration with Telnyx
- 📊 Beautiful dashboard with key metrics

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.local.template` to `.env.local` and fill in your credentials:

```bash
# See SETUP.md for detailed instructions
```

Required credentials:
- Supabase project URL and keys
- Twilio Account SID, Auth Token, and phone number
- Vercel Blob storage token (optional, for audio hosting)
- App URL and cron secret

### 3. Set Up Database

Apply the database schema to your Supabase project:

```bash
# Option 1: Via Supabase CLI
supabase db push

# Option 2: Via Supabase Dashboard
# Copy SQL from supabase/migrations/20250120000000_initial_schema.sql
# and run in SQL Editor
```

### 4. Configure Twilio

1. Create a Twilio account at [twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Purchase a phone number with Voice capabilities
3. Set up webhook URL: `https://your-domain.com/api/twilio/webhook`
4. Add credentials to environment variables

See [TWILIO_SETUP.md](./TWILIO_SETUP.md) for detailed configuration steps.

### 5. Set Up Audio Hosting (Optional)

For voice campaigns, set up Vercel Blob storage:

1. Enable Blob Storage in Vercel Dashboard
2. Connect to your project
3. Pull environment variables locally

See [AUDIO_SETUP.md](./AUDIO_SETUP.md) for complete audio hosting setup.

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

## Application Structure

### Pages

- `/dashboard` - Main dashboard with overview cards and activity feed
- `/dashboard/contacts` - Contact management (add, import, delete)
- `/dashboard/campaigns` - Campaign creation and management
- `/dashboard/campaigns/[id]` - Campaign details with delivery tracking
- `/dashboard/audio` - Audio file management for voice campaigns
- `/dashboard/table` - Mission data table with sorting capabilities

### API Routes

- `/api/contacts` - Contact CRUD operations
- `/api/contacts/bulk` - Bulk contact import
- `/api/campaigns` - Campaign creation and listing
- `/api/campaigns/[id]` - Campaign details
- `/api/campaigns/[id]/send` - Trigger campaign sending
- `/api/audio/upload` - Upload audio files to Vercel Blob
- `/api/audio/list` - List uploaded audio files
- `/api/audio/delete` - Delete audio files
- `/api/twilio/webhook` - Webhook handler for Twilio events
- `/api/cron/scheduled-campaigns` - Scheduled campaign processor

## Tech Stack

- [Next.js 14](https://nextjs.org/) - React framework with App Router
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Lucide React](https://lucide.dev/) - Icons
- [Supabase](https://supabase.com/) - Database and authentication
- [Twilio](https://twilio.com/) - SMS and Voice API
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) - Audio file storage
- [date-fns](https://date-fns.org/) - Date utilities

## Project Structure

```
├── app/
│   ├── api/                          # API Routes
│   │   ├── contacts/                 # Contact management APIs
│   │   │   ├── route.ts              # CRUD operations
│   │   │   └── bulk/route.ts         # Bulk import
│   │   ├── campaigns/                # Campaign APIs
│   │   │   ├── route.ts              # Create/list campaigns
│   │   │   └── [id]/
│   │   │       ├── route.ts          # Campaign details
│   │   │       └── send/route.ts     # Send campaign
│   │   ├── telnyx/
│   │   │   └── webhook/route.ts      # Telnyx webhook handler
│   │   └── cron/
│   │       └── scheduled-campaigns/route.ts  # Cron job
│   ├── dashboard/
│   │   ├── layout.tsx                # Dashboard layout with sidebar
│   │   ├── page.tsx                  # Home dashboard page
│   │   ├── contacts/page.tsx         # Contact management
│   │   ├── campaigns/
│   │   │   ├── page.tsx              # Campaign list
│   │   │   └── [id]/page.tsx         # Campaign details
│   │   └── table/page.tsx            # Data table page
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Root page
│   └── globals.css                   # Global styles
├── components/
│   └── ui/                           # shadcn/ui components
├── lib/
│   ├── supabase.ts                   # Supabase client & types
│   ├── telnyx.ts                     # Telnyx API helpers
│   ├── auth.ts                       # Authentication helpers
│   └── utils.ts                      # Utility functions
├── supabase/
│   └── migrations/                   # Database migrations
├── scripts/
│   └── apply-migration.js            # Migration helper
├── SETUP.md                          # Setup instructions
├── SECURITY.md                       # Security documentation
└── TEST_PLAN.md                      # Testing guide
```

## Usage Guide

### Creating Your First Campaign

1. **Add Contacts**
   - Navigate to Contacts page
   - Click "Add Contact" or "Import CSV"
   - Enter phone numbers in E.164 format (+12345678901)

2. **Create SMS Campaign**
   - Go to Campaigns page
   - Click "New Campaign"
   - Select "SMS" type
   - Write your message
   - Choose "Send Immediately" or schedule for later
   - Select recipients
   - Click "Create Campaign"

3. **Upload Audio Files** (For Voice Campaigns)
   - Go to Audio Files page
   - Upload MP3, WAV, or M4A files
   - Files are automatically hosted on Vercel Blob
   - See [AUDIO_SETUP.md](./AUDIO_SETUP.md) for details

4. **Create Voice Campaign**
   - Create new campaign with "Voice" type
   - Select uploaded audio file or enter custom URL
   - Select recipients and send

5. **Monitor Campaign**
   - Click on campaign in list to view details
   - See real-time delivery status
   - Track call answers and duration (voice campaigns)
   - View individual recipient statuses

## Documentation

- [SETUP.md](./SETUP.md) - Complete setup and configuration guide
- [TWILIO_SETUP.md](./TWILIO_SETUP.md) - Twilio configuration and voice call setup
- [AUDIO_SETUP.md](./AUDIO_SETUP.md) - Audio file hosting with Vercel Blob
- [SECURITY.md](./SECURITY.md) - Security implementation details
- [TEST_PLAN.md](./TEST_PLAN.md) - Comprehensive testing guide

## Important Notes

### Phone Number Format

All phone numbers must be in E.164 format:
- ✅ Correct: `+12345678901`
- ❌ Wrong: `2345678901`, `(234) 567-8901`

### Rate Limits

- GET requests: 100/minute
- POST/DELETE: 60/minute
- Bulk operations: 10/minute
- Campaign sends: 10/minute

### Webhook Configuration

For production deployment:
1. Deploy to Vercel or your hosting provider
2. Configure webhook URL in Twilio dashboard
3. Test webhook with test campaigns
4. See [TWILIO_SETUP.md](./TWILIO_SETUP.md) for details

### Scheduled Campaigns

Scheduled campaigns require the cron job to run:
- Vercel: Configured via `vercel.json`
- Other platforms: Set up external cron to call `/api/cron/scheduled-campaigns`

## Troubleshooting

### Messages Not Sending

1. Check Twilio credentials are correct
2. Verify phone number is configured
3. Ensure phone numbers are in E.164 format
4. Check Twilio account balance

### Voice Calls Not Working

1. Verify audio file URL is publicly accessible (HTTPS)
2. Check audio format is supported (MP3, WAV, M4A)
3. Test audio URL in browser first
4. See [AUDIO_SETUP.md](./AUDIO_SETUP.md) for troubleshooting

### Webhooks Not Working

1. Verify webhook URL is publicly accessible
2. Check webhook is configured in Twilio dashboard
3. Review server logs for incoming webhook calls
4. Test with ngrok for local development

### Database Errors

1. Verify Supabase credentials in `.env.local`
2. Ensure database schema has been applied
3. Check Row Level Security policies
4. Review Supabase logs for errors

## Support

For issues or questions:
1. Check documentation files:
   - [SETUP.md](./SETUP.md) - General setup
   - [TWILIO_SETUP.md](./TWILIO_SETUP.md) - Twilio configuration
   - [AUDIO_SETUP.md](./AUDIO_SETUP.md) - Audio hosting setup
   - [SECURITY.md](./SECURITY.md) - Security details
2. Review [TEST_PLAN.md](./TEST_PLAN.md) for testing guidance
3. Check Twilio API documentation: https://www.twilio.com/docs

## License

MIT

