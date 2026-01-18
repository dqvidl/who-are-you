````markdown
# Project Spec: SMS Interview → Instant Personalized Website (Sub-10s Generation)

## Goal
A user enters a **friend’s phone number** on your site. When they press **Submit**:
1) An AI agent starts an **SMS conversation** with that friend (via Twilio).
2) The agent conducts a short, consent-based interview about identity (hobbies, interests, values, goals).
3) As soon as the interview ends, the system **instantly (≤10–15s)** produces a **personalized website** by **selecting 1 of 2 prebuilt templates** and **injecting text + images**.
4) The friend receives a **link to the website** via SMS.

Key constraint: **no slow, from-scratch site generation**. The site must feel instant.

---

## Core Principle (Speed First)
- **No full site generation by AI**
- **No static builds**
- **No long chains**
- AI only does:
  1) **Template selection**
  2) **Short text rewriting**
  3) **Image selection / tagging**

Everything else is prebuilt.

---

## Stack (Optimized for Speed)

### Frontend
- **Next.js (App Router) + TypeScript**
- **Tailwind CSS**
- Hosting: **Vercel**

Why: zero-cold-start rendering + dynamic routes.

---

### Messaging
- **Twilio Programmable SMS**
- Webhook: `/api/twilio/inbound`

Why: fast, reliable, native STOP handling.

---

### AI
- **OpenAI Responses API** (single-call usage where possible)

Usage pattern:
- During interview → short turn-by-turn replies
- At the end → **ONE fast call** that returns:
  - template choice
  - text fields
  - image keywords

---

### Images (Fast + Deterministic)
Pick **one**:

**Option A (recommended)**  
- **Pre-curated image library**
- Stored locally or on CDN
- Tagged by vibe: `creative`, `outdoors`, `tech`, `calm`, `social`, etc.

**Option B**
- Stock API (Pexels / Unsplash)
- Cached results only
- No live generation

⚠️ No AI image generation (too slow + unreliable).

---

### Database
- **Postgres** (Neon / Supabase)
- ORM: **Drizzle** or **Prisma**

---

## Website Generation Strategy (Critical Section)

### Templates (Hard-coded, Prebuilt)

You have exactly **2 templates**:

### Template A — “Bold / Energetic”
- For:
  - creative
  - social
  - ambitious
  - extroverted
- Big hero text
- Color accents
- Grid of interests
- Quote section

### Template B — “Calm / Minimal”
- For:
  - reflective
  - thoughtful
  - introspective
  - chill
- Soft colors
- Vertical layout
- Fewer sections
- Emphasis on values & goals

Both templates:
- Are React components
- Accept **props only**
- No dynamic layout logic

---

### What the AI Actually Outputs (Fast)

After the interview finishes, run **one AI call** that outputs **small JSON**:

```json
{
  "template": "A" | "B",
  "hero": {
    "headline": "string",
    "subheadline": "string"
  },
  "sections": {
    "hobbies": ["..."],
    "interests": ["..."],
    "values": ["..."],
    "goals": ["..."]
  },
  "quote": "string",
  "image_tags": ["creative", "nature", "music"]
}
````

Rules:

* No markdown
* No HTML
* No layout decisions beyond template choice
* Text must be short (1–2 lines max per field)

---

### Image Injection Logic (No AI in Render Path)

1. AI returns `image_tags`
2. Backend selects images:

```ts
const images = pickImagesFromLibrary(image_tags, template)
```

3. Images are passed into template as props
4. Page renders instantly

⏱ Expected total time:

* AI call: ~1–2s
* DB write: <100ms
* Page render: instant

---

## Conversation Flow (SMS Agent)

### Consent Message (first SMS)

> “Hey! I’m an AI assistant from <AppName>. A friend entered your number to create a small personal webpage based on a short text chat. Reply YES to continue or STOP to opt out.”

If not explicit consent → stop.

---

### Interview Design (8–10 messages total)

Topics:

1. What do you enjoy doing in your free time?
2. What topics could you talk about for hours?
3. What’s something you’re currently excited about?
4. What matters most to you right now?
5. What do you want more of in life?
6. Optional fun question:

   * “What’s a small thing that makes your day better?”

Agent rules:

* Friendly
* Short messages
* Never asks for:

  * location
  * age
  * school
  * workplace
  * sensitive personal data

---

### State Machine

* `CONSENT_PENDING`
* `INTERVIEWING`
* `GENERATING_SITE`
* `COMPLETED`
* `STOPPED`

---

## API Endpoints

### `POST /api/submit-phone`

**Input**

```json
{ "phone": "+1XXXXXXXXXX" }
```

**Behavior**

* Normalize phone
* Create session
* Send consent SMS

---

### `POST /api/twilio/inbound`

* Validate Twilio signature
* STOP keyword check
* Append message
* Call AI for next reply
* Send SMS response
* If interview complete → trigger site generation

---

### `POST /api/generate-site` (internal)

* Single AI call → JSON output
* Select template
* Select images
* Save site record
* Text friend site link

---

### `GET /site/[siteId]`

* Loads site JSON
* Renders Template A or B
* Zero AI usage here

---

## Database Schema (Minimal)

### `sessions`

* `id`
* `phone`
* `state`
* `question_index`
* `created_at`

### `messages`

* `session_id`
* `direction`
* `body`
* `created_at`

### `sites`

* `id`
* `session_id`
* `template`
* `content_json`
* `image_ids`
* `created_at`

---

## Performance Guarantees

* Site generation ≤ **10 seconds**
* Rendering ≤ **100ms**
* No blocking builds
* No runtime AI calls on page load

---

## Safety & Privacy

* STOP immediately halts all messaging
* Generated site:

  * contains no phone numbers
  * contains no raw transcripts
* Add “Delete this page” link on site footer

---

## Cursor / Claude Implementation Notes

* Treat templates as **pure presentational components**
* Treat AI output as **validated JSON** (zod)
* Never let AI decide layout or styling
* Cache images locally
* One AI call only for site generation

---

## Definition of Done

* User submits phone number
* Friend consents via SMS
* Interview completes in minutes
* Website link arrives almost instantly
* Site feels personal, clean, and impressive
* Entire generation step feels *magical* because it’s fast

---

```
```
