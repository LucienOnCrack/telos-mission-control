# Telos Mission Control

A comprehensive mass messaging and calling platform built with Next.js, React, Supabase, and Telnyx API.

## Features

### Core Functionality
- 📱 **SMS Mass Messaging** - Send SMS to multiple contacts instantly or scheduled
- ☎️ **Voice Campaigns** - Automated voice calls with prerecorded messages
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
- Telnyx API key and phone number
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

### 4. Configure Telnyx

1. Purchase a phone number from [Telnyx Dashboard](https://portal.telnyx.com/#/app/numbers/buy-numbers)
2. Set up webhook URL: `https://your-domain.com/api/telnyx/webhook`
3. Enable webhook events for SMS and Voice
4. For voice calls, create a Call Control Application

See [SETUP.md](./SETUP.md) for detailed configuration steps.

### 5. Run Development Server

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
- `/dashboard/table` - Mission data table with sorting capabilities

### API Routes

- `/api/contacts` - Contact CRUD operations
- `/api/contacts/bulk` - Bulk contact import
- `/api/campaigns` - Campaign creation and listing
- `/api/campaigns/[id]` - Campaign details
- `/api/campaigns/[id]/send` - Trigger campaign sending
- `/api/telnyx/webhook` - Webhook handler for Telnyx events
- `/api/cron/scheduled-campaigns` - Scheduled campaign processor

## Tech Stack

- [Next.js 14](https://nextjs.org/) - React framework with App Router
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Lucide React](https://lucide.dev/) - Icons
- [Supabase](https://supabase.com/) - Database and authentication
- [Telnyx](https://telnyx.com/) - SMS and Voice API
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

3. **Create Voice Campaign**
   - Upload audio file (MP3/WAV) to public URL
   - Create new campaign with "Voice" type
   - Enter audio URL
   - Select recipients and send

4. **Monitor Campaign**
   - Click on campaign in list to view details
   - See real-time delivery status
   - Track call answers and duration (voice campaigns)
   - View individual recipient statuses

## Documentation

- [SETUP.md](./SETUP.md) - Complete setup and configuration guide
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
2. Configure webhook URL in Telnyx dashboard
3. Enable required webhook events
4. Test webhook with test campaigns

### Scheduled Campaigns

Scheduled campaigns require the cron job to run:
- Vercel: Configured via `vercel.json`
- Other platforms: Set up external cron to call `/api/cron/scheduled-campaigns`

## Troubleshooting

### Messages Not Sending

1. Check Telnyx API key is correct
2. Verify phone number is configured
3. Ensure phone numbers are in E.164 format
4. Check Telnyx account balance

### Webhooks Not Working

1. Verify webhook URL is publicly accessible
2. Check webhook is configured in Telnyx dashboard
3. Review server logs for incoming webhook calls
4. Test with ngrok for local development

### Database Errors

1. Verify Supabase credentials in `.env.local`
2. Ensure database schema has been applied
3. Check Row Level Security policies
4. Review Supabase logs for errors

## Support

For issues or questions:
1. Check documentation files (SETUP.md, SECURITY.md)
2. Review TEST_PLAN.md for testing guidance
3. Check Telnyx API documentation: https://developers.telnyx.com/

## License

MIT

