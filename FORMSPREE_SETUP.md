# Formspree Integration Setup

This guide explains how to integrate Formspree with your Telos Mission Control to automatically add phone numbers to your contacts list.

## Overview

The Formspree integration automatically:
1. Receives phone numbers from Formspree form submissions
2. Adds them to your contacts database
3. Creates a "Not Contacted Yet" group
4. Assigns new contacts to this group (if they've never been called)

## Setup Instructions

### 1. Create Your Formspree Form

1. Go to [Formspree.io](https://formspree.io) and sign in
2. Create a new form or use an existing one
3. Make sure your form includes a phone number field

Example HTML form:
```html
<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
  <input type="text" name="name" placeholder="Your Name">
  <input type="tel" name="phone" placeholder="Phone Number" required>
  <button type="submit">Submit</button>
</form>
```

### 2. Set Up Security (Recommended)

For production security, set a webhook secret:

1. Generate a random secret:
```bash
openssl rand -hex 32
```

2. Add it to your Vercel environment variables:
```bash
vercel env add FORMSPREE_WEBHOOK_SECRET
```

Or add to your `.env.local` for local development:
```bash
FORMSPREE_WEBHOOK_SECRET=your_generated_secret_here
```

3. Redeploy your application

### 3. Configure Formspree Webhook

1. In your Formspree dashboard, go to your form settings
2. Navigate to the "Integrations" or "Webhooks" section
3. Add a new webhook with the following URL:

**With Secret (Recommended):**
```
https://your-domain.com/api/formspree/webhook?secret=your_generated_secret_here
```

**Without Secret (Not Recommended for Production):**
```
https://your-domain.com/api/formspree/webhook
```

Replace `your-domain.com` with your actual deployment URL (e.g., your Vercel domain)

4. Set the webhook to trigger on "New Submission"
5. Make sure the webhook is enabled

### 3. Deploy Your Application

Make sure your application is deployed with the new endpoint:

```bash
git add app/api/formspree/webhook/route.ts
git commit -m "Add Formspree webhook integration"
git push origin main
```

If you're using Vercel, it will automatically deploy the changes.

### 4. Test the Integration

#### Option 1: Use the Test Script (Easiest)
```bash
# Test locally (make sure your app is running on localhost:3000)
node scripts/test-formspree-webhook.js

# Test with specific phone number
node scripts/test-formspree-webhook.js "+19876543210"

# Test with phone number and name
node scripts/test-formspree-webhook.js "+19876543210" "Jane Smith"

# Test production endpoint
WEBHOOK_URL=https://your-domain.com/api/formspree/webhook \
  node scripts/test-formspree-webhook.js
```

#### Option 2: Test via Formspree Dashboard
1. Go to your Formspree form
2. Submit a test entry with a phone number
3. Check your contacts in the dashboard to verify it was added

#### Option 3: Test with curl
**Without Secret:**
```bash
curl -X POST https://your-domain.com/api/formspree/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+12345678901",
    "name": "Test Contact"
  }'
```

**With Secret (via header):**
```bash
curl -X POST https://your-domain.com/api/formspree/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your_secret_here" \
  -d '{
    "phone": "+12345678901",
    "name": "Test Contact"
  }'
```

**With Secret (via URL parameter):**
```bash
curl -X POST "https://your-domain.com/api/formspree/webhook?secret=your_secret_here" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+12345678901",
    "name": "Test Contact"
  }'
```

#### Option 4: Check endpoint status
```bash
curl https://your-domain.com/api/formspree/webhook
```

Should return:
```json
{
  "message": "Formspree webhook endpoint is active",
  "endpoint": "/api/formspree/webhook",
  "method": "POST",
  "description": "Receives webhooks from Formspree and adds phone numbers to contacts"
}
```

### 5. Verify in Dashboard

1. Log in to your Telos Mission Control dashboard
2. Navigate to Contacts
3. Verify the new contact appears
4. Check that they're assigned to the "Not Contacted Yet" group
5. Navigate to Groups to see the "Not Contacted Yet" group with all uncontacted numbers

## How It Works

### Webhook Processing Flow

1. **Receives Webhook**: Formspree sends a POST request with form data
2. **Extracts Phone Number**: Looks for phone number in common field names (`phone`, `phone_number`, `phoneNumber`, `Phone`)
3. **Validates & Formats**: Converts phone number to E.164 format (e.g., +12345678901)
4. **Checks for Existing Contact**: Prevents duplicates
5. **Creates/Updates Contact**: Adds to database with optional name
6. **Checks Call History**: Queries if contact has ever been in a campaign
7. **Manages Group**: Creates "Not Contacted Yet" group if it doesn't exist
8. **Assigns to Group**: Only if contact has never been called

### Automatic Group Management

The "Not Contacted Yet" group is automatically managed:
- **New contacts**: Automatically added if they've never been called
- **Existing contacts**: Added if they have no group and no call history
- **Called contacts**: Not added (they've already been contacted)

To move contacts out of this group, simply run a campaign that includes them. Once they're in a campaign, they won't be re-added to this group.

## Supported Phone Number Formats

The webhook accepts various phone number formats:
- E.164 format: `+12345678901` (preferred)
- National format: `(234) 567-8901`
- International format: `+1-234-567-8901`

All formats are automatically converted to E.164 for storage.

## Webhook Response Codes

- **200**: Success - Contact processed and added to group
- **200 (skipped)**: Contact already exists with group assigned
- **400**: Invalid phone number or missing required data
- **500**: Server error - check logs

## Formspree Field Names

The webhook looks for phone numbers in these field names (case-insensitive):
- `phone`
- `phone_number`
- `phoneNumber`
- `Phone`

The webhook looks for names in these field names:
- `name`
- `Name`

## Security Considerations

✅ **Security Features Implemented:**

1. **Webhook Secret**: The endpoint supports secret token authentication
   - Set via `FORMSPREE_WEBHOOK_SECRET` environment variable
   - Can be passed via `X-Webhook-Secret` header or `?secret=` URL parameter
   - Requests without valid secret are rejected with 401 Unauthorized

2. **Phone Number Validation**: All phone numbers are validated and formatted
3. **Duplicate Prevention**: Checks for existing contacts before creating new ones

⚠️ **Additional Security Recommendations for Production:**

1. **Rate limiting** to prevent abuse (consider Vercel's rate limiting)
2. **IP whitelisting** to only accept requests from Formspree's IPs
3. **Webhook signature verification** (Formspree Pro feature) for additional validation
4. **Monitoring and alerts** for suspicious activity

### Webhook Secret Protection

**How it works:**
- If `FORMSPREE_WEBHOOK_SECRET` is set, all requests must include the secret
- Secret can be provided in two ways:
  1. As a header: `X-Webhook-Secret: your_secret`
  2. As a URL parameter: `?secret=your_secret`
- Requests without a valid secret receive a 401 Unauthorized response

**Setup:**
```bash
# Generate a secure random secret
openssl rand -hex 32

# Add to Vercel
vercel env add FORMSPREE_WEBHOOK_SECRET

# Or add to .env.local for local development
echo "FORMSPREE_WEBHOOK_SECRET=your_generated_secret" >> .env.local
```

## Environment Variables

Required environment variables:

```bash
# Formspree webhook secret (strongly recommended for production)
FORMSPREE_WEBHOOK_SECRET=your_generated_secret_here

# Database connection (should already be configured)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Twilio (should already be configured)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

## Troubleshooting

### Contact Not Appearing

1. Check Formspree webhook logs for delivery status
2. Check your application logs for errors
3. Verify phone number is in correct format
4. Test the endpoint directly with curl

### Contact Not in "Not Contacted Yet" Group

- Check if contact has been in a previous campaign
- Verify the contact doesn't already have a different group assigned
- Check application logs for group assignment errors

### Duplicate Contacts

- The system prevents duplicates by phone number
- If you see duplicates, they likely have different phone number formats
- Use the bulk update tool to merge duplicates

## Monitoring

Check webhook activity:

```bash
# View recent webhook logs (if using Vercel)
vercel logs

# Or check your hosting platform's logs
```

## Next Steps

After setting up the Formspree integration:

1. Create your first campaign targeting the "Not Contacted Yet" group
2. Monitor the group size as new contacts come in
3. Set up automated campaigns to regularly contact new leads
4. Review contacted vs. not contacted metrics in your dashboard

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review application logs
3. Test the endpoint directly
4. Verify Formspree webhook configuration

