import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions, messages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { validateTwilioRequest, sendSMS } from '@/lib/twilio';
import { getNextSMSResponse, generateSiteFromInterview, generateHeroImage, generateNameRequestMessage, generateWrapUpMessage } from '@/lib/ai';
import { pickImagesFromLibrary } from '@/lib/images';
import { sites } from '@/db/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';

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
        response = await generateNameRequestMessage();
      } else {
        // Empty message - ask again
        response = "you down? just text back yes or anything to get started!";
      }
    } else if (activeSession.state === 'INTERVIEWING') {
      // Continue conversation - let AI determine if user is done based on context
      newQuestionIndex = activeSession.questionIndex + 1;
      const userResponses = allMessages.filter((m: any) => m.direction === 'inbound').length;
      response = await getNextSMSResponse(newState, newQuestionIndex, allMessages);
      
      // Check if AI response indicates we should wrap up - AI will return a wrap-up message when done
      const responseLower = response.toLowerCase().trim();
      // AI returns a wrap-up message when it determines user is done (contains "make you something" or similar)
      const aiSaidDone = responseLower.includes('make you something') || 
                        responseLower.includes('making you') ||
                        (responseLower.includes('got it') && (responseLower.includes('quick') || responseLower.includes('now')));
      
      if (aiSaidDone && userResponses >= 2) {
        // AI determined user is done based on context - wrap up
        newState = 'GENERATING_SITE';
        // Generate wrap-up message with GPT for variation
        response = await generateWrapUpMessage();
        
        // Update session state
        await db.update(sessions)
          .set({ state: newState, questionIndex: newQuestionIndex })
          .where(eq(sessions.id, activeSession.id));

        // Trigger site generation (async)
        generateSite(activeSession.id, allMessages).catch(console.error);
      }
    } else if (activeSession.state === 'GENERATING_SITE') {
      // Site is being generated - let user know to wait
      response = "still working on it! give me just a sec...";
    } else if (activeSession.state === 'COMPLETED') {
      // Site is already completed - offer to start fresh
      response = "we already made your site! text back if you want to make another one";
    }

    // Ensure we always have a response
    if (!response || response.trim().length === 0) {
      response = "hey! text back to get started";
    }

    // Update session
    await db.update(sessions)
      .set({ state: newState, questionIndex: newQuestionIndex })
      .where(eq(sessions.id, activeSession.id));

    // Check if response contains multiple messages (separated by |||)
    const messagesToSend = response.split('|||').map(m => m.trim()).filter(m => m.length > 0);
    
    // Save outbound messages and send them
    console.log('[Twilio] Messages to send:', messagesToSend.length, messagesToSend);
    for (const msg of messagesToSend) {
      try {
        await db.insert(messages).values({
          sessionId: activeSession.id,
          direction: 'outbound',
          body: msg,
        });
        
        console.log('[Twilio] Sending SMS to:', fromPhone, 'Message:', msg);
        await sendSMS(fromPhone, msg);
        console.log('[Twilio] SMS sent successfully to:', fromPhone);
        
        // Small delay between multiple messages
        if (messagesToSend.length > 1 && msg !== messagesToSend[messagesToSend.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (smsError: any) {
        console.error('[Twilio] Error sending SMS:', smsError);
        console.error('[Twilio] SMS Error details:', {
          to: fromPhone,
          message: msg,
          error: smsError.message,
          stack: smsError.stack
        });
        // Continue even if one SMS fails, but log it
      }
    }
    
    console.log('[Twilio] All SMS operations completed');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Twilio] Inbound webhook error:', error);
    console.error('[Twilio] Error stack:', error.stack);
    console.error('[Twilio] Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    // Still return success to Twilio so it doesn't retry
    // Log the error for debugging
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function generateSite(sessionId: string, allMessages: any[]) {
  try {
    console.log('[Site Generation] Starting site generation for session:', sessionId);
    const startTime = Date.now();
    
    // Generate site content
    console.log('[Site Generation] Generating site content from interview...');
    const contentStartTime = Date.now();
    const content = await generateSiteFromInterview(allMessages);
    console.log('[Site Generation] Site content generated in', Date.now() - contentStartTime, 'ms');

    // Generate two hero images IN PARALLEL to save time
    console.log('[Site Generation] Generating hero images in parallel...');
    const imageStartTime = Date.now();
    const [heroImageUrl, heroImageUrl2] = await Promise.all([
      generateHeroImage(content.imageTags, content.name || 'friend'),
      generateHeroImage(content.imageTags, content.name || 'friend')
    ]);
    console.log('[Site Generation] Both hero images generated in', Date.now() - imageStartTime, 'ms');
    
    content.heroImageUrl = heroImageUrl;
    content.heroImageUrl2 = heroImageUrl2;

    // Select images
    const imageIds = pickImagesFromLibrary(content.imageTags, content.template);

    // Initialize DB connection for this function
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not configured');
    }
    const dbUrl = process.env.DATABASE_URL;
    const client = postgres(dbUrl, { max: 1 });
    const localDb = drizzle(client, { schema });

    // Save site
    console.log('[Site Generation] Saving site to database...');
    const [site] = await localDb.insert(sites).values({
      sessionId,
      template: 'HARDCODED', // Use hardcoded template
      contentJson: content,
      imageIds,
    }).returning();

    // Get session phone
    const [sessionRecord] = await localDb.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (!sessionRecord) {
      client.end();
      throw new Error('Session not found');
    }

    // Site link is not sent to user - only accessible via the status page
    // The person who submitted the phone number can access it through the waiting page

    // Update session to completed
    await localDb.update(sessions)
      .set({ state: 'COMPLETED' })
      .where(eq(sessions.id, sessionId));
    
    client.end();
    
    const totalTime = Date.now() - startTime;
    console.log('[Site Generation] Site generation completed successfully in', totalTime, 'ms');
  } catch (error) {
    console.error('[Site Generation] Site generation error:', error);
    // Try to log the full error stack
    if (error instanceof Error) {
      console.error('[Site Generation] Error stack:', error.stack);
    }
  }
}
