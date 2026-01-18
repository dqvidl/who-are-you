# Who Are You

SMS Interview → Instant Personalized Website (Sub-10s Generation)

## Overview

A user enters a friend's phone number. An AI agent conducts a short SMS interview about identity (hobbies, interests, values, goals). Once complete, the system instantly generates a personalized website by selecting one of two prebuilt templates and injecting text + images. The friend receives a link to their personalized site via SMS.

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Neon/Supabase) + Drizzle ORM
- **SMS**: Twilio Programmable SMS
- **AI**: OpenAI API (GPT-4o-mini)
- **Hosting**: Vercel (recommended)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

Run migrations:

```bash
npm run db:generate
npm run db:migrate
```

### 4. Run Development Server

```bash
npm run dev
```

## Architecture

### Templates

- **Template A**: Bold/Energetic - For creative, social, ambitious, extroverted personalities
- **Template B**: Calm/Minimal - For reflective, thoughtful, introspective personalities

### API Endpoints

- `POST /api/submit-phone` - Submit friend's phone number, starts SMS consent flow
- `POST /api/twilio/inbound` - Webhook for incoming SMS messages
- `POST /api/generate-site` - Internal endpoint to generate site after interview
- `GET /site/[siteId]` - Render personalized site

### Flow

1. User submits phone number → Consent SMS sent
2. Friend replies YES → Interview begins (6 questions)
3. Interview completes → Single AI call generates site content
4. Site generated → Friend receives SMS with link

## Performance

- Site generation: ≤10 seconds
- Page rendering: ≤100ms
- No runtime AI calls on page load
- Templates are prebuilt React components

## Notes

- Images are currently using placeholder IDs. Replace with actual image URLs in `lib/images.ts`
- Twilio webhook validation is commented out for local dev. Enable in production.
- Site deletion functionality needs to be implemented in the footer links.
