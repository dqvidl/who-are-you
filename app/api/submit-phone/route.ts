import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '@/db/schema';

export async function POST(request: NextRequest) {
  try {
    // Check if environment variables are configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ 
        error: 'DATABASE_URL not configured. Please set up your .env.local file.',
        setup: true 
      }, { status: 500 });
    }

    // Initialize db dynamically - use connection string directly
    const dbUrl = process.env.DATABASE_URL!;
    const client = postgres(dbUrl, { max: 1 });
    const db = drizzle(client, { schema });
    const { sendSMS } = await import('@/lib/twilio');

    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    // Normalize phone number (basic validation)
    const normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length < 10) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    const fullPhone = normalizedPhone.startsWith('1') && normalizedPhone.length === 11
      ? `+${normalizedPhone}`
      : `+1${normalizedPhone}`;

    // Create session
    const [session] = await db.insert(schema.sessions).values({
      phone: fullPhone,
      state: 'CONSENT_PENDING',
      questionIndex: 0,
    }).returning();

    // Send consent SMS
    const consentMessage = `hey! a friend wants to make you a personal website. got anything you want to share about yourself? hobbies, interests, whatever comes to mind - just text back with whatever you got`;
    
    try {
      await sendSMS(fullPhone, consentMessage);
    } catch (smsError: any) {
      console.error('SMS error:', smsError);
      // Continue even if SMS fails - session is created
    }

    // Create hardcoded site immediately for now
    const hardcodedContent = {
      template: 'A',
      hero: {
        headline: "hey, i'm someone cool",
        subheadline: "and this is my vibe"
      },
      sections: {
        hobbies: ["coding", "design", "music", "hiking"],
        interests: ["tech", "art", "nature", "photography"],
        values: ["creativity", "authenticity", "growth"],
        goals: ["build cool stuff", "travel more", "help others"]
      },
      quote: "life's too short to not do what you love",
      imageTags: ["creative", "tech", "outdoors", "social"]
    };

    const [site] = await db.insert(schema.sites).values({
      sessionId: session.id,
      template: hardcodedContent.template,
      contentJson: hardcodedContent,
      imageIds: ['creative-1', 'tech-1', 'outdoors-1', 'social-1'],
    }).returning();

    // Update session to completed for now (hardcoded)
    await db.update(schema.sessions)
      .set({ state: 'COMPLETED' })
      .where(eq(schema.sessions.id, session.id));

    client.end();

    // Use localhost for local development
    const siteUrl = `/site/${site.id}`;
    const statusUrl = `/waiting/${session.id}`;

    return NextResponse.json({ 
      sessionId: session.id,
      siteId: site.id,
      success: true,
      statusUrl: statusUrl,
      siteUrl: siteUrl,
      ready: true, // Hardcoded to true for now
    });
  } catch (error: any) {
    console.error('Submit phone error:', error);
    
    // Ensure we always return JSON, never HTML
    const errorMessage = error.message || 'Failed to submit phone';
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
