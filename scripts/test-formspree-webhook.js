#!/usr/bin/env node

/**
 * Test script for Formspree webhook endpoint
 * 
 * Usage:
 *   node scripts/test-formspree-webhook.js
 *   node scripts/test-formspree-webhook.js +12345678901
 *   node scripts/test-formspree-webhook.js +12345678901 "John Doe"
 */

const phoneNumber = process.argv[2] || '+12345678901'
const name = process.argv[3] || 'Test Contact'

// Get the webhook URL from environment or use localhost
const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/api/formspree/webhook'
const webhookSecret = process.env.FORMSPREE_WEBHOOK_SECRET

console.log('Testing Formspree Webhook Integration')
console.log('====================================')
console.log(`URL: ${webhookUrl}`)
console.log(`Phone: ${phoneNumber}`)
console.log(`Name: ${name}`)
console.log(`Secret: ${webhookSecret ? '***' + webhookSecret.slice(-4) : 'Not set'}`)
console.log('')

// Prepare the payload (simulating Formspree format)
const payload = {
  phone: phoneNumber,
  name: name,
  email: 'test@example.com',
  _subject: 'New Form Submission'
}

// Prepare headers
const headers = {
  'Content-Type': 'application/json'
}

// Add secret header if configured
if (webhookSecret) {
  headers['X-Webhook-Secret'] = webhookSecret
}

// Make the request
fetch(webhookUrl, {
  method: 'POST',
  headers: headers,
  body: JSON.stringify(payload)
})
  .then(async response => {
    const data = await response.json()
    
    console.log(`Status: ${response.status} ${response.statusText}`)
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('\n✅ Success! Contact has been added.')
      
      if (data.is_new_contact) {
        console.log('   - Created new contact')
      } else {
        console.log('   - Contact already existed')
      }
      
      if (data.added_to_group) {
        console.log('   - Added to "Not Contacted Yet" group')
      } else if (data.skipped) {
        console.log('   - Contact already has a group assigned')
      } else {
        console.log('   - Contact has been contacted before')
      }
    } else {
      console.log('\n❌ Error:', data.error)
    }
  })
  .catch(error => {
    console.error('\n❌ Request failed:', error.message)
    console.error('\nMake sure:')
    console.error('  1. Your application is running')
    console.error('  2. The webhook URL is correct')
    console.error('  3. Your database is accessible')
  })

