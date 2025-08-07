# Twilio Voice Agent Setup Guide

## Prerequisites
1. A Twilio account (sign up at https://www.twilio.com)
2. Python 3.11 or higher
3. A public URL for webhooks (use ngrok for development)

## Twilio Setup Steps

### 1. Create Twilio Account & Get Credentials
1. Go to https://console.twilio.com
2. Sign up or log in
3. Navigate to Account Settings > API Keys & Tokens
4. Copy your Account SID and Auth Token

### 2. Purchase a Phone Number
1. In Twilio Console, go to Phone Numbers > Manage > Buy a number
2. Choose a number that supports Voice calls
3. Purchase the number

### 3. Configure Webhook URLs
1. Go to Phone Numbers > Manage > Active numbers
2. Click on your purchased number
3. In the Voice section, set:
   - Webhook URL: `https://your-domain.com/voice/incoming` (use ngrok URL for development)
   - HTTP Method: POST

### 4. Set Up ngrok (for development)
```bash
# Install ngrok
npm install -g ngrok

# Run ngrok to expose local port 8000
ngrok http 8000

# Use the HTTPS URL provided by ngrok as your webhook URL
```

## Local Development Setup

### 1. Install Dependencies
```bash
cd backend
pip install -e .
```

### 2. Environment Configuration
1. Copy `.env.example` to `.env`
2. Fill in your Twilio credentials:
```env
TWILIO_ACCOUNT_SID=your_actual_account_sid
TWILIO_AUTH_TOKEN=your_actual_auth_token
TWILIO_PHONE_NUMBER=your_purchased_number
```

### 3. Run the Application
```bash
python main.py
```

The server will start on `http://localhost:8000`

### 4. Test the Setup
1. Call your Twilio phone number
2. You should hear: "Hello! Welcome to our recruitment screening..."
3. Check your terminal for logs and transcriptions

## API Endpoints

- `GET /` - Health check
- `POST /voice/incoming` - Handles incoming calls
- `POST /voice/process` - Processes recorded audio
- `POST /voice/continue` - Continues conversation
- `POST /voice/transcription` - Receives transcription callbacks

## LLM Integration Points

The following functions are ready for your LLM implementation:

### `process_with_llm(recording_url: str) -> str`
- Downloads and processes voice recordings
- Sends text to your LLM
- Returns response text

### `should_end_call(llm_response: str) -> bool`
- Determines when to end the call
- Based on LLM response content

## Next Steps

1. Implement your LLM logic in the placeholder functions
2. Add conversation state management
3. Implement proper error handling
4. Add logging and analytics
5. Deploy to a production environment