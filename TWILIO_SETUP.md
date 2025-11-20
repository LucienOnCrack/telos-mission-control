

# Twilio Setup Guide

## Complete guide to setting up Twilio for voice call campaigns

---

## 🚀 Quick Start

### 1. Create Twilio Account

1. Go to: https://www.twilio.com/try-twilio
2. Sign up for a free trial account
3. Verify your email and phone number

### 2. Get Your Credentials

After signing up, go to your Twilio Console: https://console.twilio.com/

You'll need these 3 values:

1. **Account SID** (starts with `AC...`)
2. **Auth Token** (click to reveal)
3. **Phone Number** (purchase one in the next step)

```
Example:
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+12345678901
```

---

## 📞 Purchase a Phone Number

### Step 1: Go to Phone Numbers

1. In Twilio Console, navigate to: **Phone Numbers** → **Manage** → **Buy a number**
2. Or visit directly: https://console.twilio.com/us1/develop/phone-numbers/manage/search

### Step 2: Select Capabilities

Make sure to select a number with **Voice** capabilities enabled.

- ✅ Voice
- SMS/MMS (optional, for future use)

### Step 3: Search and Purchase

1. Choose your country (e.g., United States)
2. Click "Search"
3. Select a number you like
4. Click "Buy"

**Cost:** Around $1-2/month for a phone number

### Step 4: Copy Your Number

After purchase, copy your phone number in E.164 format:
```
Example: +12345678901
```

---

## 🔧 Configure Environment Variables

### Local Development (.env.local)

Add these to your `.env.local` file:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+12345678901

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron Secret
CRON_SECRET=dev-secret-key
```

### Production (Vercel)

Update your Vercel environment variables:

```bash
# Remove old Telnyx variables (if any)
vercel env rm TELNYX_API_KEY production
vercel env rm TELNYX_PHONE_NUMBER production

# Add Twilio variables
echo "YOUR_ACCOUNT_SID" | vercel env add TWILIO_ACCOUNT_SID production
echo "YOUR_AUTH_TOKEN" | vercel env add TWILIO_AUTH_TOKEN production
echo "YOUR_PHONE_NUMBER" | vercel env add TWILIO_PHONE_NUMBER production
```

---

## 🎵 Audio File Requirements

### Supported Formats

Twilio supports these audio formats for the `<Play>` verb:

- **WAV** ⭐ RECOMMENDED
  - 8kHz sample rate
  - Mono (1 channel)
  - 16-bit PCM encoding
  - Best for PSTN (regular phone calls)

- **MP3**
  - Good compression
  - Works well for most cases

- **M4A** / **MPEG**
  - Also supported

### Audio File Hosting

**🎉 RECOMMENDED: Use Built-in Vercel Blob Storage**

We've integrated Vercel Blob storage for easy audio file hosting!

1. Go to **Dashboard** → **Audio Files** (`/dashboard/audio`)
2. Upload your MP3, WAV, or M4A files
3. Select them directly when creating voice campaigns

**For setup instructions, see:** [AUDIO_SETUP.md](./AUDIO_SETUP.md)

---

**Alternative: Use External URLs**

Your audio file **MUST** be:

1. ✅ Publicly accessible via HTTPS
2. ✅ Direct link to the audio file (not a webpage)
3. ❌ NOT a YouTube link
4. ❌ NOT behind authentication

**Good URLs:**
```
✅ https://yoursite.com/audio/message.wav
✅ https://yoursite.com/audio/message.mp3
✅ https://s3.amazonaws.com/bucket/audio.wav
✅ https://storage.googleapis.com/bucket/audio.mp3
✅ https://xxx.public.blob.vercel-storage.com/audio/message.mp3
```

**Bad URLs:**
```
❌ https://youtube.com/watch?v=...
❌ http://yoursite.com/audio.wav  (not HTTPS)
❌ https://yoursite.com/audio  (no file extension)
❌ file:///local/audio.wav  (local file)
```

### Converting Audio Files

If you need to convert audio to the optimal format:

**Using FFmpeg (Best Quality for Phone Calls):**
```bash
ffmpeg -i input.mp3 -ar 8000 -ac 1 -sample_fmt s16 output.wav
```

**For more conversion options and audio hosting setup:**
- See detailed guide: [AUDIO_SETUP.md](./AUDIO_SETUP.md)

---

## 🪝 Configure Webhook

### Step 1: Set Up Webhook URL

1. Go to Twilio Console → **Phone Numbers** → **Manage** → **Active numbers**
2. Click on your purchased phone number
3. Scroll to **Voice Configuration**

### Step 2: Configure Voice Webhook

**A Call Comes In:**
- URL: `https://your-domain.com/api/twilio/webhook`
- HTTP Method: `POST`

### Step 3: Configure Status Callbacks

The system automatically configures status callbacks for each call. You don't need to do anything extra.

**Status events tracked:**
- `initiated` - Call started
- `ringing` - Phone is ringing
- `answered` - Call was answered
- `completed` - Call finished

---

## 🧪 Test Your Setup

### Method 1: Test Configuration API

```bash
curl http://localhost:3000/api/test-twilio
```

This will verify:
- ✅ Twilio credentials are set
- ✅ Account is accessible
- ✅ Phone number is configured

### Method 2: Make a Test Call

1. Go to **Dashboard** → **Campaigns**
2. Click **New Campaign**
3. Select **Voice** type
4. Enter your audio URL: `https://demo.twilio.com/welcome.mp3`
5. Select a test contact (use your own phone number)
6. Click **Send Immediately**

**Expected result:**
- Your phone should ring
- You'll hear the audio message
- Dashboard will show call status

---

## 📊 Monitoring and Logs

### View Detailed Logs

All operations are logged with comprehensive details:

```
✅ Success logs include:
   - CallSid
   - Recipient phone number
   - Call status
   - Timestamp

❌ Error logs include:
   - Error message
   - Error code
   - Failed phone number
   - Twilio error details
   - Timestamp
```

### Check Logs in Terminal

When running `npm run dev`, you'll see:

```
═══════════════════════════════════════════════════════
🚀 STARTING CAMPAIGN: abc-123
📊 Type: voice
👥 Recipients: 5
⏰ Started: 2025-01-20T12:00:00.000Z
═══════════════════════════════════════════════════════

📞 [1/5] Processing: +12345678901
📞 Calling +12345678901...
🎵 Audio URL: https://example.com/audio.wav
✅ Call initiated to +12345678901 (CallSid: CA123...)
✅ [1/5] SUCCESS: +12345678901
```

### Check Twilio Console

View all call details in Twilio:
- Go to: https://console.twilio.com/us1/monitor/logs/calls
- See call duration, status, recordings (if enabled), and more

---

## 💰 Pricing

### Twilio Costs (as of 2025)

**Phone Number:**
- $1.15/month (US)

**Outbound Calls:**
- $0.013/minute (US to US)
- Varies by country

**Example calculation for 100 calls:**
- Average 1 minute per call
- 100 calls × 1 minute × $0.013 = **$1.30**
- Plus monthly phone number: **$1.15**
- **Total: $2.45/month**

### Free Trial Credits

New accounts get **$15 in free credit** to test with!

---

## 🚨 Troubleshooting

### Issue: "Twilio client not initialized"

**Solution:**
```bash
# Check your .env.local file has correct values
cat .env.local

# Restart your dev server
npm run dev
```

### Issue: "Invalid phone number format"

**Solution:**
- Phone numbers MUST be in E.164 format
- ✅ Correct: `+12345678901`
- ❌ Wrong: `2345678901`, `(234) 567-8901`, `+1-234-567-8901`

### Issue: "Failed to play audio"

**Possible causes:**
1. Audio URL is not publicly accessible
2. Audio URL is not HTTPS
3. Audio format is not supported
4. File is too large or corrupt

**Solution:**
```bash
# Test if your audio URL is accessible
curl -I https://your-audio-url.com/file.wav

# Should return: HTTP/2 200
```

### Issue: "Call not going through"

**Check:**
1. ✅ Twilio account has sufficient balance
2. ✅ Phone number has Voice capability
3. ✅ Recipient number is in E.164 format
4. ✅ Webhook URL is configured correctly

### Issue: "No webhook events received"

**Solution:**
1. Make sure your app is deployed and accessible
2. For local testing, use ngrok:
   ```bash
   ngrok http 3000
   # Use the ngrok URL in Twilio webhook config
   ```

---

## 📚 Additional Resources

- **Twilio Docs:** https://www.twilio.com/docs/voice
- **TwiML Reference:** https://www.twilio.com/docs/voice/twiml
- **Twilio Console:** https://console.twilio.com/
- **Support:** https://support.twilio.com/

---

## ✅ Checklist

Before going live, make sure:

- [ ] Twilio account created and verified
- [ ] Phone number purchased with Voice capability
- [ ] Environment variables configured (local and production)
- [ ] Database migration applied
- [ ] Audio files uploaded to Vercel Blob (see [AUDIO_SETUP.md](./AUDIO_SETUP.md))
- [ ] Webhook configured in Twilio Console
- [ ] Test call completed successfully
- [ ] Monitoring/logging working
- [ ] Sufficient Twilio account balance

---

**🎉 You're ready to start making voice call campaigns with Twilio!**

