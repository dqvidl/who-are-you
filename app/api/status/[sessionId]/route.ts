import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions, sites } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
    }

    const { sessionId } = await params;

    // Initialize db - use connection string directly
    const dbUrl = process.env.DATABASE_URL;
    const client = postgres(dbUrl, { max: 1 });
    const db = drizzle(client, { schema });

    // Get session
    const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    
    if (!session) {
      client.end();
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if site exists
    const existingSite = await db.select().from(sites).where(eq(sites.sessionId, sessionId)).limit(1);
    const site = existingSite[0];

    const isReady = session.state === 'COMPLETED' && site !== undefined;
    const siteUrl = site ? `${process.env.NEXT_PUBLIC_APP_URL}/site/${site.id}` : null;

    client.end();

    return NextResponse.json({
      sessionId: sessionId,
      status: isReady ? 'ready' : 'not ready',
      siteUrl: siteUrl,
      state: session.state,
    });
  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: error.message || 'Failed to check status' }, { status: 500 });
  }
}
