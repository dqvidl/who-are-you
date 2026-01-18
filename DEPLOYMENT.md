# Deployment Guide for whoareyou.tech

## Step 1: Deploy to Vercel

### 1. Install Vercel CLI (if not already installed)
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy your project
```bash
cd /Users/david/who are you
vercel
```

Follow the prompts:
- **Set up and deploy?** Yes
- **Which scope?** Your account
- **Link to existing project?** No
- **Project name?** who-are-you (or whatever you want)
- **Directory?** ./
- **Override settings?** No

This will create a deployment URL like `https://who-are-you-xxxxx.vercel.app`

### 4. Add Environment Variables in Vercel

Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables

Add all these variables:
```
DATABASE_URL=your_supabase_connection_string
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+13658163690
OPENAI_API_KEY=your_openai_key
NEXT_PUBLIC_APP_URL=https://whoareyou.tech
```

**Important:** Make sure `NEXT_PUBLIC_APP_URL` is set to `https://whoareyou.tech` (your domain)

### 5. Redeploy after adding environment variables
```bash
vercel --prod
```

## Step 2: Connect Custom Domain (whoareyou.tech)

### 1. In Vercel Dashboard
- Go to: Your Project → Settings → Domains
- Click "Add Domain"
- Enter: `whoareyou.tech`
- Click "Add"

### 2. Configure DNS Records

You'll need to add DNS records at get.tech (your domain registrar):

**Option A: Vercel Nameservers (Recommended)**
- In Vercel, you'll see nameservers like:
  - `ns1.vercel-dns.com`
  - `ns2.vercel-dns.com`
- Go to get.tech DNS settings
- Change nameservers to Vercel's nameservers

**Option B: DNS Records (If you keep current nameservers)**
- Add an A record:
  - Type: `A`
  - Name: `@` (or blank for root domain)
  - Value: Vercel's IP (Vercel will show you this)
- Add a CNAME record:
  - Type: `CNAME`
  - Name: `www`
  - Value: `cname.vercel-dns.com`

### 3. Wait for DNS Propagation
- Usually takes 5-60 minutes
- Vercel will show when it's configured

## Step 3: Update Twilio Webhook

Once your domain is live:

1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
2. Click your phone number (`+13658163690`)
3. Go to "Configure" → "Messaging"
4. Update "A message comes in" URL to:
   ```
   https://whoareyou.tech/api/twilio/inbound
   ```
5. Set method to: `HTTP POST`
6. Click "Save"

## Step 4: Test Everything

1. Visit `https://whoareyou.tech` - should see your landing page
2. Submit a phone number - should work
3. Send SMS to your Twilio number - should respond
4. Check site generation - should create sites

## Troubleshooting

- **DNS not working?** Wait 24 hours max, check DNS records are correct
- **Environment variables not working?** Make sure to redeploy after adding them
- **SMS not working?** Check Twilio webhook URL is correct and using HTTPS
- **Database errors?** Make sure DATABASE_URL uses connection pooling for serverless (port 6543)
