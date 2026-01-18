import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions, messages, sites } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateSiteFromInterview } from '@/lib/ai';
import { pickImagesFromLibrary } from '@/lib/images';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get session and messages
    const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const allMessages = await db.select().from(messages).where(eq(messages.sessionId, sessionId));

    // Generate site content
    const content = await generateSiteFromInterview(allMessages);

    // Select images
    const imageIds = pickImagesFromLibrary(content.imageTags, content.template);

    // Save site
    const [site] = await db.insert(sites).values({
      sessionId,
      template: content.template,
      contentJson: content,
      imageIds,
    }).returning();

    // Update session
    await db.update(sessions)
      .set({ state: 'COMPLETED' })
      .where(eq(sessions.id, sessionId));

    // Site link is not sent to user - only accessible via the status page
    // The person who submitted the phone number can access it through the waiting page
    const baseUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : (process.env.NEXT_PUBLIC_APP_URL || 'https://whoareyou.tech');
    const siteUrl = `${baseUrl}/site/${site.id}`;

    return NextResponse.json({ siteId: site.id, url: siteUrl });
  } catch (error: any) {
    console.error('Generate site error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate site' }, { status: 500 });
  }
}
