# SMS Reporting Setup Guide

## Overview
The SMS reporting module allows users to report water quality issues via SMS when offline. The system supports multiple SMS providers and formats.

## Architecture

```
User Phone --> SMS Provider --> Webhook --> Backend Parser --> Firebase Database
```

## Setup Options

### Option 1: Manual Mode (Default)
Users copy SMS format from the app and paste it into the web interface.

**Pros:**
- No SMS gateway costs
- Works immediately
- Good for testing

**Cons:**
- Requires internet connection to submit
- Not true offline reporting

### Option 2: Twilio Integration (Recommended)

#### Step 1: Get Twilio Account
1. Sign up at https://www.twilio.com
2. Get a phone number with SMS capability
3. Note your Account SID and Auth Token

#### Step 2: Configure Environment Variables
Add to your `.env` file:
```env
SMS_PHONE_NUMBER=+1234567890  # Your Twilio number
SMS_PROVIDER=twilio
SMS_WEBHOOK_TOKEN=your-secret-token-here
```

#### Step 3: Set Up Webhook
1. Go to Twilio Console → Phone Numbers → Your Number
2. Under "Messaging", set webhook URL to:
   ```
   https://your-backend-url.com/api/reporting/sms/webhook
   ```
3. Method: POST
4. Save

#### Step 4: Test
Send an SMS to your Twilio number:
```
WQ|781014|Health symptoms|Tube well|Bad taste
```

### Option 3: AWS SNS Integration

#### Step 1: Set Up AWS SNS
1. Create SNS Topic for incoming SMS
2. Subscribe your application endpoint
3. Set up SMS number (requires approval)

#### Step 2: Configure Environment Variables
```env
SMS_PHONE_NUMBER=+1234567890  # Your AWS SMS number
SMS_PROVIDER=aws
SMS_WEBHOOK_TOKEN=your-secret-token-here
AWS_SNS_TOPIC_ARN=arn:aws:sns:region:account:topic
```

#### Step 3: Configure Lambda (Optional)
Create Lambda function to forward SNS messages to your webhook:
```javascript
exports.handler = async (event) => {
    const message = JSON.parse(event.Records[0].Sns.Message);
    
    await fetch('https://your-backend-url.com/api/reporting/sms/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            from: message.originationNumber,
            message: message.messageBody,
            provider: 'aws'
        })
    });
};
```

## SMS Formats

### Format 1: Compact (Recommended)
```
WQ|781014|Health symptoms|Tube well|Water causes nausea
```

**Structure:** `WQ|PINCODE|ISSUE|SOURCE|DESCRIPTION`

### Format 2: Structured
```
PIN CODE: 781014
ISSUE: Health symptoms
SOURCE: Tube well
DESCRIPTION: Water causes nausea
```

## API Endpoints

### 1. Format Report to SMS
**POST** `/api/reporting/sms/format`

Request:
```json
{
  "pinCode": "781014",
  "problem": "Health symptoms",
  "sourceType": "Tube well",
  "description": "Bad taste",
  "localityName": "Guwahati"
}
```

Response:
```json
{
  "success": true,
  "sms_format": "Readable format...",
  "sms_compact": "WQ|781014|Health symptoms|Tube well|Bad taste",
  "instructions": "..."
}
```

### 2. Parse Incoming SMS
**POST** `/api/reporting/sms/parse`

Request:
```json
{
  "sms_text": "WQ|781014|Health symptoms|Tube well|Bad taste"
}
```

Response:
```json
{
  "success": true,
  "reportId": "abc123",
  "message": "Report received successfully"
}
```

### 3. SMS Webhook (For Providers)
**POST** `/api/reporting/sms/webhook`

Accepts Twilio form data or JSON format from other providers.

### 4. Get SMS Configuration
**GET** `/api/reporting/sms/config`

Response:
```json
{
  "success": true,
  "phone_number": "+91-XXXX-XXXX-XX",
  "provider": "manual",
  "webhook_url": "https://...",
  "instructions": "..."
}
```

### 5. Get SMS Instructions
**GET** `/api/reporting/sms/instructions`

Returns formatting instructions and examples.

## Testing

### Test Parsing Locally
```bash
curl -X POST http://localhost:5000/api/reporting/sms/parse \
  -H "Content-Type: application/json" \
  -d '{"sms_text": "WQ|781014|Health symptoms|Tube well|Bad taste"}'
```

### Test Webhook
```bash
# Twilio format
curl -X POST http://localhost:5000/api/reporting/sms/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=+919876543210&Body=WQ|781014|Health symptoms|Tube well|Bad taste"

# JSON format
curl -X POST http://localhost:5000/api/reporting/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{"from":"+919876543210","message":"WQ|781014|Health symptoms|Tube well|Bad taste"}'
```

## Security Considerations

1. **Webhook Token**: Add authentication to webhook endpoint
2. **Rate Limiting**: Implement rate limiting to prevent spam
3. **Phone Verification**: Consider verifying sender phone numbers
4. **Content Validation**: Always validate and sanitize SMS content

## Costs

### Twilio
- Phone number: ~$1/month
- Incoming SMS: $0.0075 per message
- Outgoing SMS (if needed): $0.0075 per message

### AWS SNS
- Phone number: Varies by country
- Incoming SMS: $0.00645 per message
- Outgoing SMS: $0.00645 per message

### Manual Mode
- Free (no SMS gateway needed)

## Troubleshooting

### SMS Not Received
1. Check webhook URL is publicly accessible
2. Verify webhook is configured in provider dashboard
3. Check provider logs for delivery status
4. Test webhook with curl

### Parsing Errors
1. Check SMS format matches expected structure
2. Review logs for parse errors
3. Test with `/api/reporting/sms/parse` endpoint
4. Ensure all required fields are present

### Database Save Failures
1. Check Firebase credentials
2. Verify Firestore collection exists
3. Review Firebase security rules
4. Check server logs for detailed errors

## Future Enhancements

- [ ] Two-way SMS (send confirmation to user)
- [ ] SMS status updates when issue resolved
- [ ] Multi-language SMS support
- [ ] SMS templates for common issues
- [ ] Bulk SMS import from CSV
- [ ] Analytics dashboard for SMS reports

## Support

For issues or questions, check:
- Backend logs: `backend/logs/`
- Provider dashboard for SMS logs
- Test endpoints with Postman/curl
- Firebase console for database entries
