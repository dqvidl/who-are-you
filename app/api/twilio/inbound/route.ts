import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions, messages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { validateTwilioRequest, sendSMS } from '@/lib/twilio';
import { getNextSMSResponse, generateSiteFromInterview, generateHeroImage } from '@/lib/ai';
import { pickImagesFromLibrary } from '@/lib/images';
import { sites } from '@/db/schema';

export async function POST(request: NextRequest) {
  console.log('[Twilio] Webhook received at:', new Date().toISOString());
  try {
    const formData = await request.formData();
    const body = Object.fromEntries(formData);
    const signature = request.headers.get('x-twilio-signature') || '';
    console.log('[Twilio] Request body:', body);

    // Validate Twilio request (in production, use full URL)
    // const isValid = validateTwilioRequest(body, signature, request.url);
    // if (!isValid) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    // }

    const fromPhone = body.From as string;
    const messageBodyRaw = (body.Body as string || '').trim();
    const messageBody = messageBodyRaw.toUpperCase();
    const messageBodyLower = messageBodyRaw.toLowerCase();

    console.log('[Twilio] Inbound message from:', fromPhone, 'Body:', messageBody);

    // Handle STOP
    if (messageBody === 'STOP' || messageBody.includes('STOP')) {
      const [session] = await db.select().from(sessions).where(eq(sessions.phone, fromPhone)).limit(1);
      if (session) {
        await db.update(sessions).set({ state: 'STOPPED' }).where(eq(sessions.id, session.id));
      }
      return NextResponse.json({ message: 'STOPPED' });
    }

    // Find most recent active session (prefer active over completed/stopped)
    const allSessions = await db.select().from(sessions).where(eq(sessions.phone, fromPhone));
    // Sort by createdAt descending to get most recent first
    allSessions.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    
    // First try to find an active session (not COMPLETED or STOPPED)
    let activeSession = allSessions.find((s: any) => s.state !== 'COMPLETED' && s.state !== 'STOPPED');
    
    console.log('[Twilio] Sessions found:', allSessions.length, 'Active:', activeSession ? { id: activeSession.id, state: activeSession.state } : 'none');
    
    // Check if any session is STOPPED - if so, don't respond
    const stoppedSession = allSessions.find((s: any) => s.state === 'STOPPED');
    if (stoppedSession && !activeSession) {
      console.log('[Twilio] Session is stopped for:', fromPhone);
      return NextResponse.json({ message: 'Session stopped' });
    }
    
    // If no active session exists (or only COMPLETED/STOPPED ones), create a new one
    if (!activeSession) {
      console.log('[Twilio] No active session found, creating new session for:', fromPhone);
      const [newSession] = await db.insert(sessions).values({
        phone: fromPhone,
        state: 'CONSENT_PENDING',
        questionIndex: 0,
      }).returning();
      activeSession = newSession;
    }
    
    if (!activeSession) {
      console.log('[Twilio] Failed to create session for:', fromPhone);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    // Save inbound message
    await db.insert(messages).values({
      sessionId: activeSession.id,
      direction: 'inbound',
      body: body.Body as string,
    });

    // Get conversation history
    const allMessages = await db.select().from(messages).where(eq(messages.sessionId, activeSession.id));
    console.log('[Twilio] Session state:', activeSession.state, 'User responses:', allMessages.filter((m: any) => m.direction === 'inbound').length);

    let newState = activeSession.state;
    let newQuestionIndex = activeSession.questionIndex;
    let response = '';

    // Handle consent
    if (activeSession.state === 'CONSENT_PENDING') {
      const messageBodyLower = (body.Body as string || '').trim().toLowerCase();
      // If they said stop/no, respect that and mark as stopped
      if (messageBodyLower.includes('stop') || messageBodyLower.includes('no thanks') || messageBodyLower.includes('not interested') || messageBodyLower === 'no' || messageBodyLower === 'nope') {
        newState = 'STOPPED';
        response = "alright no worries! if you change your mind just text back";
      } else if (messageBody.length > 0) {
        // Any response means they're down - start interview and ask for name first
        newState = 'INTERVIEWING';
        newQuestionIndex = 1;
        // When transitioning to INTERVIEWING, always ask for name first
        response = "first things first - what's your name?";
      } else {
        // Empty message - ask again
        response = "you down? just text back yes or anything to get started!";
      }
    } else if (activeSession.state === 'INTERVIEWING') {
      // Continue conversation - let AI determine if user is done based on context
      newQuestionIndex = activeSession.questionIndex + 1;
      const userResponses = allMessages.filter((m: any) => m.direction === 'inbound').length;
      response = await getNextSMSResponse(newState, newQuestionIndex, allMessages);
      
      // Check if AI response indicates we should wrap up - AI will return the exact wrap-up message when done
      const responseLower = response.toLowerCase().trim();
      // AI returns exactly "cool cool, got it. lemme make you something real quick..." when it determines user is done
      const aiSaidDone = responseLower === 'cool cool, got it. lemme make you something real quick...' || 
                        (responseLower.includes('make you something') && responseLower.includes('quick'));
      
      if (aiSaidDone && userResponses >= 2) {
        // AI determined user is done based on context - wrap up
        newState = 'GENERATING_SITE';
        // Ensure we use the exact wrap-up message
        response = 'cool cool, got it. lemme make you something real quick...';
        
        // Update session state
        await db.update(sessions)
          .set({ state: newState, questionIndex: newQuestionIndex })
          .where(eq(sessions.id, activeSession.id));

        // Trigger site generation (async)
        generateSite(activeSession.id, allMessages).catch(console.error);
      }
    }

    // Update session
    await db.update(sessions)
      .set({ state: newState, questionIndex: newQuestionIndex })
      .where(eq(sessions.id, activeSession.id));

    // Save outbound message
    await db.insert(messages).values({
      sessionId: activeSession.id,
      direction: 'outbound',
      body: response,
    });

    console.log('[Twilio] Sending response:', response);
    
    // Send SMS response
    await sendSMS(fromPhone, response);
    
    console.log('[Twilio] SMS sent successfully');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Twilio inbound error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function generateSite(sessionId: string, allMessages: any[]) {
  try {
    // Generate site content
    const content = await generateSiteFromInterview(allMessages);

    // Generate two hero images
    const heroImageUrl = await generateHeroImage(content.imageTags, content.name || 'friend');
    content.heroImageUrl = heroImageUrl;
    
    // Generate second image (can be slightly different or complementary)
    const heroImageUrl2 = await generateHeroImage(content.imageTags, content.name || 'friend');
    content.heroImageUrl2 = heroImageUrl2;

    // Select images
    const imageIds = pickImagesFromLibrary(content.imageTags, content.template);

    // Save site
    const [site] = await db.insert(sites).values({
      sessionId,
      template: 'HARDCODED', // Use hardcoded template
      contentJson: content,
      imageIds,
    }).returning();

    // Get session phone
    const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (!session) return;

    // Send link - use Vercel URL in production, fallback to NEXT_PUBLIC_APP_URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || 'https://who-are-u.vercel.app';
    const siteUrl = `${baseUrl}/site/${site.id}`;
    await sendSMS(session.phone, `alright here it is! ${siteUrl} - check it out, it's pretty cool if i do say so myself 😎`);

    // Update session to completed
    await db.update(sessions)
      .set({ state: 'COMPLETED' })
      .where(eq(sessions.id, sessionId));
  } catch (error) {
    console.error('Site generation error:', error);
  }
}
