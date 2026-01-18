# Twilio Webhook Setup Guide

## Quick Setup (Local Development)

### Option 1: Using ngrok (Recommended)

1. **Install ngrok** (if not installed):
   ```bash
   brew install ngrok/ngrok/ngrok
   # OR download from https://ngrok.com/download
   ```

2. **Start ngrok** to expose your local server:
   ```bash
   ngrok http 3000
   ```

3. **Copy the HTTPS URL** from ngrok (looks like: `https://abc123.ngrok.io`)

4. **Configure Twilio Webhook**:
   - Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
   - Click on your phone number (`+13658163690`)
   - Under "Messaging" section, find "A MESSAGE COMES IN"
   - Set it to: `https://abc123.ngrok.io/api/twilio/inbound` (replace with your ngrok URL)
   - Set method to: `HTTP POST`
   - Click "Save"

### Option 2: Deploy to Vercel (Production)

For production, deploy your app and use the Vercel URL:

1. **Deploy to Vercel**:
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Get your deployment URL** (e.g., `https://who-are-you-xxxxx.vercel.app`)

3. **Configure Twilio Webhook**:
   - Use: `https://who-are-you-xxxxx.vercel.app/api/twilio/inbound`
   - Method: `HTTP POST`

## Important Notes

- The webhook endpoint is: `/api/twilio/inbound`
- It accepts `POST` requests
- Make sure your Next.js server is running on port 3000 (for local dev)
- Update `NEXT_PUBLIC_APP_URL` in `.env.local` to match your public URL

## Testing

Once configured, test by:
1. Sending a text to your Twilio number
2. You should receive a response from your app (not the default Twilio message)
