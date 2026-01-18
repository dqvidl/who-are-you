import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions, sites } from '@/db/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '@/db/schema';
import type { SiteContent } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Initialize db
    const dbUrl = process.env.DATABASE_URL;
    // Use connection string directly (postgres library handles URL-encoded passwords)
    const client = postgres(dbUrl, { max: 1 });
    const db = drizzle(client, { schema });

    // Create hard-coded site content
    const hardcodedContent: SiteContent = {
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

    // Create or update site
    const [existingSite] = await db.select().from(sites).where(eq(schema.sites.sessionId, sessionId)).limit(1);
    
    let site;
    if (existingSite) {
      // Update existing
      [site] = await db.update(sites)
        .set({
          template: hardcodedContent.template,
          contentJson: hardcodedContent,
          imageIds: ['creative-1', 'tech-1', 'outdoors-1', 'social-1'],
        })
        .where(eq(schema.sites.sessionId, sessionId))
        .returning();
    } else {
      // Create new
      [site] = await db.insert(sites).values({
        sessionId,
        template: hardcodedContent.template,
        contentJson: hardcodedContent,
        imageIds: ['creative-1', 'tech-1', 'outdoors-1', 'social-1'],
      }).returning();
    }

    // Update session to completed
    await db.update(sessions)
      .set({ state: 'COMPLETED' })
      .where(eq(schema.sessions.id, sessionId));

    client.end();

    return NextResponse.json({ 
      siteId: site.id,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/site/${site.id}`
    });
  } catch (error: any) {
    console.error('Create hardcoded site error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create site' }, { status: 500 });
  }
}
