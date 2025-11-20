# Telnyx Mass Messaging System Setup

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Telnyx Configuration
TELNYX_API_KEY=your-telnyx-api-key
TELNYX_PHONE_NUMBER=+1234567890

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron Secret (for scheduled campaigns)
CRON_SECRET=your-secret-key-here
```

## Get Supabase Credentials

Run these commands to get your Supabase credentials:
```bash
# Login to Supabase (if not already logged in)
supabase login

# Link to existing project or create new one
supabase link --project-ref your-project-ref

# Get project URL and keys
supabase status
```

## Database Setup

Apply the database schema by running:

**Option 1: Via Supabase CLI**
```bash
# You'll be prompted for your database password
supabase db push
```

**Option 2: Via Supabase Dashboard**
1. Go to https://supabase.com/dashboard/project/lvweyxezxbzxdyeblbiv/editor
2. Go to SQL Editor
3. Copy and paste the contents of `supabase/migrations/20250120000000_initial_schema.sql`
4. Click "Run" to execute the migration

**Option 3: Quick script**
```bash
# Run the migration script
node scripts/apply-migration.js
```

## Telnyx Configuration

1. Your Telnyx API key is already set in the env vars above
2. Purchase a phone number from Telnyx dashboard: https://portal.telnyx.com/#/app/numbers/buy-numbers
3. Update `TELNYX_PHONE_NUMBER` in `.env.local` with your purchased number
4. Configure webhook URL in Telnyx dashboard:
   - Go to: https://portal.telnyx.com/#/app/messaging
   - Set webhook URL: `https://your-domain.com/api/telnyx/webhook`
   - Enable events: message.sent, message.delivered, message.delivery_failed
5. For voice calls, also configure:
   - Go to: https://portal.telnyx.com/#/app/call-control/applications
   - Create a Call Control Application
   - Set webhook URL: `https://your-domain.com/api/telnyx/webhook`
   - Note your Connection ID and add it to `.env.local` as `TELNYX_CONNECTION_ID`

### Testing Webhooks Locally

Use ngrok or similar to expose your local server:
```bash
ngrok http 3000
# Use the ngrok URL in Telnyx webhook configuration
```

