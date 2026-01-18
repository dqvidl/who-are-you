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

    // Check if there's an active session for this phone (get most recent first)
    const existingSessions = await db.select().from(schema.sessions)
      .where(eq(schema.sessions.phone, fullPhone));
    
    // Sort by createdAt descending (most recent first) and find active session
    existingSessions.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    const activeSession = existingSessions.find(s => s.state !== 'COMPLETED' && s.state !== 'STOPPED');
    
    let session;
    if (activeSession) {
      // Use existing active session
      session = activeSession;
    } else {
      // Create new session
      [session] = await db.insert(schema.sessions).values({
      phone: fullPhone,
      state: 'CONSENT_PENDING',
      questionIndex: 0,
    }).returning();
    }

    // Send consent SMS
    const consentMessage = `hey! a friend wants to make you a personal website. you down to answer a few quick questions? just text back yes or anything to get started!`;
    
    try {
      await sendSMS(fullPhone, consentMessage);
    } catch (smsError: any) {
      console.error('SMS error:', smsError);
      // Continue even if SMS fails - session is created
    }

    client.end();

    // Return session info - site will be created after conversation completes
    const statusUrl = `/waiting/${session.id}`;

    return NextResponse.json({ 
      sessionId: session.id,
      success: true,
      statusUrl: statusUrl,
      ready: false, // Will be ready after conversation completes
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
