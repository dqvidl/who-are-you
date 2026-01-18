import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions, messages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { validateTwilioRequest, sendSMS } from '@/lib/twilio';
import { getNextSMSResponse } from '@/lib/ai';
import { generateSiteFromInterview } from '@/lib/ai';
import { pickImagesFromLibrary } from '@/lib/images';
import { sites } from '@/db/schema';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const body = Object.fromEntries(formData);
    const signature = request.headers.get('x-twilio-signature') || '';

    // Validate Twilio request (in production, use full URL)
    // const isValid = validateTwilioRequest(body, signature, request.url);
    // if (!isValid) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    // }

    const fromPhone = body.From as string;
    const messageBody = (body.Body as string || '').trim().toUpperCase();

    // Handle STOP
    if (messageBody === 'STOP' || messageBody.includes('STOP')) {
      const [session] = await db.select().from(sessions).where(eq(sessions.phone, fromPhone)).limit(1);
      if (session) {
        await db.update(sessions).set({ state: 'STOPPED' }).where(eq(sessions.id, session.id));
      }
      return NextResponse.json({ message: 'STOPPED' });
    }

    // Find session
    const [session] = await db.select().from(sessions).where(eq(sessions.phone, fromPhone)).limit(1);
    
    if (!session || session.state === 'STOPPED' || session.state === 'COMPLETED') {
      return NextResponse.json({ message: 'No active session' });
    }

    // Save inbound message
    await db.insert(messages).values({
      sessionId: session.id,
      direction: 'inbound',
      body: body.Body as string,
    });

    // Get conversation history
    const allMessages = await db.select().from(messages).where(eq(messages.sessionId, session.id));

    let newState = session.state;
    let newQuestionIndex = session.questionIndex;
    let response = '';
    const messageBodyLower = (body.Body as string || '').trim().toLowerCase();

    // Handle consent
    if (session.state === 'CONSENT_PENDING') {
      const messageBodyLower = (body.Body as string || '').trim().toLowerCase();
      // If they said stop/no, respect that and mark as stopped
      if (messageBodyLower.includes('stop') || messageBodyLower.includes('no thanks') || messageBodyLower.includes('not interested')) {
        newState = 'STOPPED';
        response = "alright no worries! if you change your mind just text back";
      } else if (messageBody.length > 0) {
        // Any other response means they're interested - start interview
        newState = 'INTERVIEWING';
        newQuestionIndex = 1;
        response = await getNextSMSResponse(newState, newQuestionIndex, allMessages);
      } else {
        // Empty message or something else
        response = await getNextSMSResponse(session.state, session.questionIndex, allMessages);
      }
    } else if (session.state === 'INTERVIEWING') {
      // Check if user says they're done
      const donePhrases = ['thats it', "that's it", 'thats everything', "that's everything", 'im done', "i'm done", 'thats all', "that's all", 'nothing else', 'all set', 'thats good', "that's good", 'done', 'finish', 'finished', 'we good', "we're good"];
      const userSaidDone = donePhrases.some(phrase => messageBodyLower.includes(phrase));
      
      if (userSaidDone) {
        // User explicitly said they're done
        newState = 'GENERATING_SITE';
        response = "cool cool, got it. lemme make you something real quick...";
        
        // Update session state
        await db.update(sessions)
          .set({ state: newState, questionIndex: newQuestionIndex + 1 })
          .where(eq(sessions.id, session.id));

        // Trigger site generation (async)
        generateSite(session.id, allMessages).catch(console.error);
      } else {
        // Continue conversation
        newQuestionIndex = session.questionIndex + 1;
        response = await getNextSMSResponse(newState, newQuestionIndex, allMessages);
        
        // Check if AI response indicates we should wrap up
        const responseLower = response.toLowerCase();
        const aiSaidDone = responseLower.includes('got it') || responseLower.includes('make you something');
        
        if (aiSaidDone) {
          // AI decided to wrap up (usually after checking if user is done)
          newState = 'GENERATING_SITE';
          
          // Update session state
          await db.update(sessions)
            .set({ state: newState, questionIndex: newQuestionIndex })
            .where(eq(sessions.id, session.id));

          // Trigger site generation (async)
          generateSite(session.id, allMessages).catch(console.error);
        }
      }
    }

    // Update session
    await db.update(sessions)
      .set({ state: newState, questionIndex: newQuestionIndex })
      .where(eq(sessions.id, session.id));

    // Save outbound message
    await db.insert(messages).values({
      sessionId: session.id,
      direction: 'outbound',
      body: response,
    });

    // Send SMS response
    await sendSMS(fromPhone, response);

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

    // Select images
    const imageIds = pickImagesFromLibrary(content.imageTags, content.template);

    // Save site
    const [site] = await db.insert(sites).values({
      sessionId,
      template: content.template,
      contentJson: content,
      imageIds,
    }).returning();

    // Get session phone
    const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (!session) return;

    // Send link
    const siteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/site/${site.id}`;
    await sendSMS(session.phone, `alright here it is! ${siteUrl} - check it out, it's pretty cool if i do say so myself 😎`);

    // Update session to completed
    await db.update(sessions)
      .set({ state: 'COMPLETED' })
      .where(eq(sessions.id, sessionId));
  } catch (error) {
    console.error('Site generation error:', error);
  }
}
