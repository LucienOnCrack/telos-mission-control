# Formspree Webhook Security

## Security Implementation

### ✅ Implemented Security Measures

1. **Webhook Secret Authentication**
   - Environment variable: `FORMSPREE_WEBHOOK_SECRET`
   - Validates all incoming webhook requests
   - Rejects unauthorized requests with 401 Unauthorized
   - Secret can be passed via header (`X-Webhook-Secret`) or URL parameter (`?secret=`)

2. **Phone Number Validation**
   - All phone numbers are validated before storage
   - Converted to E.164 format
   - Invalid numbers are rejected with 400 Bad Request

3. **Duplicate Prevention**
   - Checks for existing contacts before creating
   - Prevents duplicate phone numbers in database
   - Updates existing contacts instead of creating duplicates

4. **Input Sanitization**
   - Validates all incoming webhook payload data
   - Handles missing or malformed data gracefully
   - Logs all webhook activity for monitoring

5. **Group Assignment Logic**
   - Only assigns contacts to "Not Contacted Yet" if they have no call history
   - Prevents overwriting existing group assignments
   - Creates group automatically if it doesn't exist

### 🔐 Security Best Practices

#### Webhook Secret Generation

```bash
# Generate a cryptographically secure random secret
openssl rand -hex 32

# Example output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

#### Production Deployment

1. **Set the webhook secret in Vercel:**
```bash
vercel env add FORMSPREE_WEBHOOK_SECRET production
# Paste your generated secret when prompted
```

2. **Configure Formspree webhook URL:**
```
https://your-domain.com/api/formspree/webhook?secret=YOUR_SECRET_HERE
```

3. **Never commit secrets to git**
   - Use environment variables only
   - Do not hardcode secrets in code
   - Do not share secrets in documentation

#### Local Development

```bash
# Add to .env.local (not committed to git)
FORMSPREE_WEBHOOK_SECRET=your_development_secret_here
```

### ⚠️ Current Security Status

**Formspree Webhook Endpoint:**
- ✅ Webhook secret authentication implemented
- ✅ Input validation and sanitization
- ✅ Rate limiting via Vercel (automatic)
- ✅ Logging for monitoring
- ⚠️ No IP whitelisting (consider for production)
- ⚠️ No webhook signature verification (requires Formspree Pro)

**Other API Endpoints:**
- ⚠️ Authentication TODOs present in code
- ⚠️ Most endpoints don't require auth yet (planned for future)
- ⚠️ RLS policies in Supabase currently allow all operations

### 🎯 Recommended Additional Security

For production deployment, consider:

1. **IP Whitelisting (Optional)**
   - Restrict webhook endpoint to Formspree IPs only
   - Implement in Vercel edge middleware or firewall

2. **Rate Limiting (Additional)**
   - Already handled by Vercel for most cases
   - Consider Upstash Redis for advanced rate limiting

3. **Webhook Signature Verification (Formspree Pro)**
   - Verify HMAC signature from Formspree
   - Ensures webhook is genuinely from Formspree
   - Requires Formspree Pro subscription

4. **Monitoring & Alerts**
   - Set up logging aggregation (e.g., Sentry, LogRocket)
   - Monitor for suspicious patterns
   - Alert on high failure rates

5. **Database RLS Policies**
   - Implement proper Row Level Security when auth is ready
   - Restrict operations based on user roles

### 🧪 Security Testing

#### Test 1: Reject Requests Without Secret
```bash
# Should return 401 Unauthorized
curl -X POST https://your-domain.com/api/formspree/webhook \
  -H "Content-Type: application/json" \
  -d '{"phone": "+12345678901"}'
```

#### Test 2: Accept Requests With Valid Secret
```bash
# Should return 200 OK
curl -X POST https://your-domain.com/api/formspree/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your_secret_here" \
  -d '{"phone": "+12345678901", "name": "Test"}'
```

#### Test 3: Reject Invalid Phone Numbers
```bash
# Should return 400 Bad Request
curl -X POST https://your-domain.com/api/formspree/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your_secret_here" \
  -d '{"phone": "invalid"}'
```

#### Test 4: Prevent Duplicates
```bash
# First request: Creates contact
# Second request: Returns existing contact
curl -X POST https://your-domain.com/api/formspree/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your_secret_here" \
  -d '{"phone": "+12345678901", "name": "Test"}'
```

### 📊 Monitoring Checklist

- [ ] Set up error logging (Sentry, LogRocket, etc.)
- [ ] Monitor webhook success/failure rates
- [ ] Alert on high 401 Unauthorized rates (potential attack)
- [ ] Track contacts added per day/week/month
- [ ] Monitor "Not Contacted Yet" group size
- [ ] Review logs weekly for suspicious activity

### 🚨 Incident Response

If you suspect the webhook is being abused:

1. **Immediate Actions:**
   - Rotate the webhook secret
   - Update Formspree webhook URL with new secret
   - Review recent contacts added
   - Check for spam or invalid phone numbers

2. **Investigation:**
   - Review webhook logs for patterns
   - Check Vercel/hosting provider logs
   - Identify source of unauthorized requests

3. **Prevention:**
   - Implement additional rate limiting
   - Consider IP whitelisting
   - Enable additional monitoring

### 📝 Compliance Notes

- **Data Privacy:** Phone numbers are PII - handle accordingly
- **GDPR/CCPA:** Implement data deletion workflows
- **Storage:** Phone numbers stored in Supabase (encrypted at rest)
- **Transmission:** All webhook traffic over HTTPS

## Support

For security concerns or questions:
1. Review this document
2. Check webhook logs in hosting provider
3. Verify environment variables are set correctly
4. Test with the provided curl commands

