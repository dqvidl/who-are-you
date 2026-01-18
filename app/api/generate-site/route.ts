import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions, messages, sites } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateSiteFromInterview } from '@/lib/ai';
import { pickImagesFromLibrary } from '@/lib/images';
import { sendSMS } from '@/lib/twilio';

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

    // Send link
    const siteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/site/${site.id}`;
    await sendSMS(session.phone, `Your site is ready! Check it out: ${siteUrl}`);

    return NextResponse.json({ siteId: site.id, url: siteUrl });
  } catch (error: any) {
    console.error('Generate site error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate site' }, { status: 500 });
  }
}
