# Telnyx Mass Messaging System - Test Plan

## Prerequisites

Before testing, ensure:

1. ✅ `.env.local` is configured with all required credentials
2. ✅ Supabase database schema has been applied
3. ✅ Telnyx account is set up with:
   - Active phone number
   - Webhook configured
   - Connection ID for voice calls
4. ✅ Development server is running: `npm run dev`

## Test Scenarios

### 1. Contact Management

#### Test 1.1: Add Single Contact
1. Navigate to `/dashboard/contacts`
2. Click "Add Contact" button
3. Enter phone number in E.164 format (e.g., +12345678901)
4. Enter optional name
5. Click "Add Contact"
6. **Expected**: Contact appears in the table
7. **Verify**: Contact is saved in Supabase `contacts` table

#### Test 1.2: Add Duplicate Contact
1. Try to add the same phone number again
2. **Expected**: Error message "Contact with this phone number already exists"

#### Test 1.3: Invalid Phone Number
1. Try to add phone number without + prefix (e.g., 12345678901)
2. **Expected**: Should be auto-formatted to +12345678901
3. Try to add invalid format (e.g., "abc")
4. **Expected**: Error message about invalid format

#### Test 1.4: Bulk Import via CSV
1. Create a CSV file with format:
   ```
   phone_number,name
   +12345678901,John Doe
   +12345678902,Jane Smith
   ```
2. Click "Import CSV" button
3. Select the CSV file
4. **Expected**: Success message showing count of imported contacts
5. **Verify**: All valid contacts appear in the table

#### Test 1.5: Delete Contact
1. Click delete button on a contact
2. Confirm deletion
3. **Expected**: Contact is removed from the list
4. **Verify**: Contact is deleted from Supabase

### 2. SMS Campaign

#### Test 2.1: Create Immediate SMS Campaign
1. Navigate to `/dashboard/campaigns`
2. Click "New Campaign"
3. Select "SMS" as campaign type
4. Enter message text (e.g., "Hello! This is a test message.")
5. Select "Send Immediately"
6. Select 1-2 test contacts (use your own phone numbers)
7. Click "Create Campaign"
8. **Expected**: Redirected to campaign details page
9. **Expected**: Campaign status shows "Sending" then "Completed"
10. **Verify**: Receive SMS on selected phone numbers
11. **Verify**: Campaign recipients show "Delivered" status
12. **Verify**: `campaigns` and `campaign_recipients` tables are updated

#### Test 2.2: Create Scheduled SMS Campaign
1. Create new SMS campaign
2. Select "Schedule for Later"
3. Set date/time 5 minutes in the future
4. Select test contacts
5. Click "Create Campaign"
6. **Expected**: Campaign status shows "Scheduled"
7. Wait for scheduled time (or manually trigger cron job)
8. **Expected**: Campaign automatically sends at scheduled time
9. **Verify**: Receive SMS messages
10. **Verify**: Campaign status changes to "Sending" then "Completed"

#### Test 2.3: SMS Delivery Tracking
1. After sending SMS campaign
2. Wait for Telnyx webhooks to arrive
3. **Expected**: Recipient status updates from "Sent" to "Delivered"
4. **Verify**: `campaign_recipients` table shows correct statuses
5. **Verify**: Delivery timestamps are recorded

### 3. Voice Campaign

#### Test 3.1: Prepare Audio File
1. Upload an MP3 or WAV file to a public URL (e.g., S3, CDN)
2. Ensure the URL is accessible without authentication
3. Test audio playback in browser

#### Test 3.2: Create Voice Campaign
1. Create new campaign
2. Select "Voice Call" as campaign type
3. Enter audio URL
4. Select "Send Immediately"
5. Select 1-2 test contacts (use your own phone numbers)
6. Click "Create Campaign"
7. **Expected**: Receive phone calls
8. **Answer the call**: Listen to the prerecorded message
9. **Expected**: Call hangs up after message plays
10. **Verify**: Campaign details show call was answered
11. **Verify**: Call duration is recorded

#### Test 3.3: Unanswered Call Tracking
1. Create voice campaign
2. Don't answer the incoming call
3. **Expected**: Call eventually hangs up
4. **Verify**: Campaign details show call was not answered
5. **Verify**: Recipient status marked as "Failed"

#### Test 3.4: Call Duration Tracking
1. After answering voice call
2. Let full message play
3. **Expected**: Call duration is calculated correctly
4. **Verify**: `call_logs` table shows accurate duration in seconds
5. **Verify**: Campaign details page displays duration in MM:SS format

### 4. Campaign Details & Monitoring

#### Test 4.1: View Campaign Statistics
1. Navigate to campaign details page
2. **Verify statistics cards show**:
   - Total Recipients count
   - Delivered count
   - Failed count
   - (For voice) Calls Answered count
   - (For voice) Average Call Duration

#### Test 4.2: Real-time Status Updates
1. Create campaign with multiple recipients
2. Keep campaign details page open
3. **Expected**: Status updates refresh every 5 seconds
4. **Expected**: See recipient statuses change in real-time

#### Test 4.3: Recipients Table
1. View recipients table in campaign details
2. **Verify table shows**:
   - Contact name
   - Phone number
   - Status (with color-coded badges)
   - Sent timestamp
   - (For voice) Answered status
   - (For voice) Call duration
   - Error messages (if any)

### 5. Scheduling System

#### Test 5.1: Manual Cron Trigger
1. Create scheduled campaign for future time
2. Manually call cron endpoint:
   ```bash
   curl http://localhost:3000/api/cron/scheduled-campaigns \
     -H "Authorization: Bearer your-cron-secret"
   ```
3. **Expected**: Response shows "No campaigns due to be sent"

#### Test 5.2: Scheduled Campaign Execution
1. Create campaign scheduled for 2 minutes in the future
2. Wait for scheduled time
3. Monitor campaign status
4. **Expected**: Campaign automatically triggers at scheduled time
5. **Verify**: Messages/calls are sent

### 6. Webhook Handling

#### Test 6.1: SMS Delivery Webhooks
1. Send SMS campaign
2. Monitor server logs for webhook events
3. **Expected**: See webhook logs for:
   - `message.sent`
   - `message.delivered` (or `message.delivery_failed`)
4. **Verify**: Database updates match webhook events

#### Test 6.2: Voice Call Webhooks
1. Send voice campaign
2. **Expected**: Receive webhooks for:
   - `call.initiated`
   - `call.answered` (if answered)
   - `call.playback.ended`
   - `call.hangup`
3. **Verify**: Call logs are updated correctly

#### Test 6.3: Webhook Verification
1. Manually send POST request to webhook endpoint
2. **Expected**: Webhook processes successfully
3. **Verify**: No errors in server logs

### 7. Security & Authentication

#### Test 7.1: Unauthenticated Access
1. Clear browser cookies/auth tokens
2. Try to access `/api/contacts`
3. **Expected**: 401 Unauthorized error

#### Test 7.2: Rate Limiting
1. Make 150 rapid requests to `/api/contacts`
2. **Expected**: After 100 requests, receive 429 Too Many Requests error
3. Wait 1 minute
4. **Expected**: Rate limit resets, requests work again

#### Test 7.3: Invalid Input Validation
1. Try to create campaign with:
   - Invalid campaign type
   - Missing message
   - Empty contact list
2. **Expected**: Appropriate error messages for each case

### 8. Error Handling

#### Test 8.1: Failed SMS Delivery
1. Send SMS to invalid phone number (e.g., +1234)
2. **Expected**: Recipient marked as "Failed"
3. **Expected**: Error message recorded in database

#### Test 8.2: Telnyx API Error
1. Temporarily use invalid Telnyx API key
2. Try to send campaign
3. **Expected**: Recipients marked as failed with error message
4. **Expected**: Campaign status shows "Failed"

#### Test 8.3: Network Timeout
1. Simulate slow network or timeout
2. **Expected**: Graceful error handling
3. **Expected**: User sees appropriate error message

## Integration Testing

### Test 9: End-to-End SMS Flow
1. Add 5 contacts
2. Create SMS campaign with all contacts
3. Send immediately
4. Monitor delivery
5. **Verify**: All contacts receive messages
6. **Verify**: All statuses update to "Delivered"
7. **Verify**: Campaign marked as "Completed"

### Test 10: End-to-End Voice Flow
1. Add 3 contacts
2. Create voice campaign
3. Answer 2 calls, miss 1 call
4. **Verify**: 2 marked as delivered, 1 as failed
5. **Verify**: Call durations recorded for answered calls
6. **Verify**: Campaign marked as "Completed"

## Performance Testing

### Test 11: Large Contact List
1. Import 100+ contacts via CSV
2. Create campaign targeting all contacts
3. Monitor send process
4. **Expected**: All messages sent with rate limiting (100ms delay)
5. **Verify**: No timeout errors
6. **Verify**: Database handles volume correctly

### Test 12: Multiple Concurrent Campaigns
1. Create 3 campaigns simultaneously
2. Send all at once
3. **Expected**: All campaigns process without conflicts
4. **Verify**: Each campaign tracks its own recipients correctly

## Cleanup

After testing:
1. Delete test campaigns
2. Delete test contacts
3. Review and clear any test data from database
4. Check for any orphaned records

## Success Criteria

✅ All contacts can be added, viewed, and deleted
✅ SMS campaigns send successfully and track delivery
✅ Voice campaigns initiate calls and track answers/duration
✅ Scheduled campaigns execute at correct times
✅ Webhooks update statuses correctly
✅ Real-time monitoring shows accurate data
✅ Authentication prevents unauthorized access
✅ Rate limiting works as expected
✅ Error handling is graceful and informative
✅ Performance is acceptable with large contact lists

