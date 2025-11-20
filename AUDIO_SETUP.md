# Audio File Hosting Setup Guide

## Complete guide to setting up Vercel Blob for audio file storage

---

## 🚀 Quick Start

Your audio file hosting is powered by **Vercel Blob Storage** - a simple, scalable storage solution that integrates seamlessly with your Next.js application.

---

## 📦 What's Already Installed

✅ `@vercel/blob` package installed  
✅ Upload API route created (`/api/audio/upload`)  
✅ List API route created (`/api/audio/list`)  
✅ Delete API route created (`/api/audio/delete`)  
✅ Audio management dashboard created (`/dashboard/audio`)  
✅ Campaign creation page updated to use uploaded audio files

---

## 🔧 Enable Vercel Blob Storage

### Step 1: Enable Blob Storage in Vercel Dashboard

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project: **telos-mission-control**
3. Navigate to **Storage** tab
4. Click **Create Database**
5. Select **Blob Storage**
6. Click **Create** (it's free to start!)

### Step 2: Connect to Your Project

1. In the Blob Storage settings, click **Connect to Project**
2. Select your **telos-mission-control** project
3. Click **Connect**

This will automatically create the `BLOB_READ_WRITE_TOKEN` environment variable in your project!

### Step 3: Pull Environment Variables Locally

```bash
vercel env pull .env.local
```

This will download all environment variables including the new `BLOB_READ_WRITE_TOKEN` to your local `.env.local` file.

---

## 🎵 Using the Audio Management System

### Upload Audio Files

1. Go to **Dashboard** → **Audio Files** (`/dashboard/audio`)
2. Click the file input and select your audio file
3. Supported formats:
   - **MP3** (recommended for smaller file sizes)
   - **WAV** (recommended for best quality: 8kHz, mono, 16-bit PCM)
   - **M4A** (also supported)
4. Max file size: **10MB**
5. Click upload and wait for confirmation

### Use Audio in Campaigns

1. Go to **Dashboard** → **Campaigns**
2. Click **New Campaign**
3. Select **Voice Call** type
4. Choose from your uploaded audio files in the dropdown
5. Or enter a custom audio URL
6. Select recipients and send!

### Manage Audio Files

From the Audio Files page, you can:

- 🎵 **Play** - Preview the audio file
- 📋 **Copy URL** - Copy the public URL for use elsewhere
- 🗑️ **Delete** - Remove files you no longer need

---

## 🎯 Audio File Requirements

### Best Practices for Voice Calls

**Recommended Format (Best Quality):**
- Format: WAV
- Sample rate: 8kHz
- Channels: Mono (1 channel)
- Encoding: 16-bit PCM
- Why? Optimized for PSTN (phone network)

**Alternative Format (Smaller Size):**
- Format: MP3
- Bitrate: 64-128 kbps
- Sample rate: 8kHz-16kHz
- Why? Good compression, smaller files

### Converting Audio Files

If you have an audio file that needs conversion:

#### Using FFmpeg (Command Line)

**Convert to optimal WAV:**
```bash
ffmpeg -i input.mp3 -ar 8000 -ac 1 -sample_fmt s16 output.wav
```

**Convert to compressed MP3:**
```bash
ffmpeg -i input.wav -ar 8000 -ab 64k output.mp3
```

#### Using Online Tools

- **Audio Converter:** https://online-audio-converter.com/
- **CloudConvert:** https://cloudconvert.com/wav-converter

---

## 💰 Pricing

### Vercel Blob Storage Costs

**Free Tier (Hobby):**
- 1 GB storage
- 100 GB bandwidth/month
- Perfect for getting started!

**Pro Tier:**
- $0.15/GB storage per month
- $0.30/GB bandwidth
- Only pay for what you use

### Cost Examples

**Scenario 1: Small Campaign**
- 10 audio files × 1MB each = 10MB storage
- 100 calls/month = 0.1GB bandwidth
- **Cost: FREE** ✅

**Scenario 2: Medium Campaign**
- 50 audio files × 2MB each = 100MB storage
- 1,000 calls/month = 2GB bandwidth
- **Cost: $0.60/month** 💰

**Scenario 3: Large Campaign**
- 100 audio files × 3MB each = 300MB storage
- 10,000 calls/month = 30GB bandwidth
- **Cost: $9.00/month** 💰

---

## 🔒 Security Features

### Built-in Security

✅ **Public Read Access** - Audio files are publicly accessible for Twilio to play  
✅ **Authenticated Write** - Only your app can upload/delete files  
✅ **HTTPS Only** - All files served over secure HTTPS  
✅ **No Authentication on Playback** - Twilio can access files without auth

### File Validation

Your upload API automatically validates:
- ✅ File type (MP3, WAV, M4A only)
- ✅ File size (max 10MB)
- ✅ Malicious file detection

---

## 🚨 Troubleshooting

### Issue: "Missing BLOB_READ_WRITE_TOKEN"

**Solution:**
1. Enable Blob Storage in Vercel Dashboard (see Step 1 above)
2. Connect it to your project
3. Run `vercel env pull .env.local`
4. Restart your dev server: `npm run dev`

### Issue: "Upload failed"

**Possible causes:**
1. File too large (>10MB)
2. Invalid file format
3. Network issue

**Solution:**
- Check file size: `ls -lh yourfile.mp3`
- Convert to supported format (see conversion guide above)
- Check your internet connection

### Issue: "Audio file not playing in call"

**Possible causes:**
1. File format not compatible with Twilio
2. File corrupted
3. Blob storage not accessible

**Solution:**
1. Test the URL directly in your browser
2. Convert to WAV 8kHz format (most compatible)
3. Check Vercel Blob status: https://www.vercel-status.com/

### Issue: "Cannot delete file"

**Possible causes:**
1. File is being used in an active campaign
2. Permission issue

**Solution:**
1. Check if any campaigns are using this file
2. Try again in a few moments
3. Check Vercel logs for detailed error

---

## 📊 Monitoring

### View Upload Logs

In your terminal (when running `npm run dev`):

```
📤 Uploading audio file: message.mp3
📊 File size: 2.45 MB
🎵 File type: audio/mpeg
✅ Upload successful!
🔗 URL: https://xxxxxx.public.blob.vercel-storage.com/audio/1234-message.mp3
```

### View Storage Usage

1. Go to Vercel Dashboard
2. Navigate to **Storage** → **Blob**
3. View:
   - Total storage used
   - Bandwidth used
   - Number of files
   - Cost estimate

---

## 🔄 Migration from Other Storage

### Coming from AWS S3

Your existing S3 URLs will continue to work! Just:
1. Upload new files to Vercel Blob
2. Update new campaigns to use Vercel Blob URLs
3. Old campaigns will still use S3 URLs

### Coming from Google Cloud Storage

Same as S3 - no migration required! Your app supports any public HTTPS URL.

---

## 🚀 Advanced Features

### Custom Audio URL

Don't want to upload files? You can still use custom URLs:
1. Host audio on your own server
2. Host on S3, GCS, Cloudflare R2, etc.
3. Enter the URL manually in campaign creation

### Bulk Upload (Coming Soon)

Future feature: Upload multiple files at once!

### Audio Preprocessing (Coming Soon)

Future feature: Automatic conversion to optimal format!

---

## ✅ Setup Checklist

Before going live:

- [ ] Vercel Blob enabled in dashboard
- [ ] `BLOB_READ_WRITE_TOKEN` environment variable set
- [ ] Local environment variables pulled (`vercel env pull`)
- [ ] Test upload via `/dashboard/audio`
- [ ] Test audio playback in browser
- [ ] Create test voice campaign
- [ ] Verify audio plays in phone call
- [ ] Check storage usage in Vercel dashboard

---

## 📚 Additional Resources

- **Vercel Blob Docs:** https://vercel.com/docs/storage/vercel-blob
- **Twilio Audio Requirements:** https://www.twilio.com/docs/voice/twiml/play
- **FFmpeg Audio Guide:** https://trac.ffmpeg.org/wiki/audio%20types
- **Audio Converter:** https://online-audio-converter.com/

---

## 🎉 You're Ready!

Your audio file hosting is now set up and ready to use. Simply:

1. **Upload** audio files via the dashboard
2. **Select** them when creating voice campaigns
3. **Send** and track your campaigns

**Happy calling!** 📞🎵

---

## 💡 Pro Tips

### Tip 1: Optimize File Size
- Use MP3 at 64kbps for smaller files
- This saves storage costs and loads faster
- Phone calls don't need high audio quality

### Tip 2: Name Files Clearly
- Use descriptive names: `welcome-message.mp3`
- Not: `audio-file-1.mp3`
- Makes campaign creation easier

### Tip 3: Test Before Bulk Send
- Always test audio with one call first
- Verify quality and volume
- Then send to your full list

### Tip 4: Keep Backups
- Download important audio files
- Keep local copies
- Vercel Blob is reliable, but backups are smart!

### Tip 5: Monitor Costs
- Check Vercel dashboard regularly
- Delete unused files to save storage
- Each file costs ~$0.15/GB/month

