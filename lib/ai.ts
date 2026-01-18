import OpenAI from 'openai';
import { SiteContentSchema, type SiteContent } from './types';

// Lazy initialization - only create client when needed (runtime, not build time)
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function generateSiteFromInterview(messages: Array<{ direction: string; body: string }>): Promise<SiteContent> {
  const conversation = messages
    .filter(m => m.direction === 'inbound')
    .map(m => m.body)
    .join('\n');

  const prompt = `You are analyzing a short SMS interview conversation. Extract key insights and generate a JSON response for a personalized website.

Conversation:
${conversation}

Generate JSON with this exact structure:
{
  "template": "A" or "B" (A = bold/energetic for creative/social/ambitious/extroverted, B = calm/minimal for reflective/thoughtful/introspective/chill),
  "hero": {
    "headline": "one short line max",
    "subheadline": "one short line max"
  },
  "sections": {
    "hobbies": ["3-4 short items"],
    "interests": ["3-4 short items"],
    "values": ["2-3 short items"],
    "goals": ["2-3 short items"]
  },
  "quote": "one inspiring quote or phrase from the conversation",
  "imageTags": ["3-5 tags like creative, outdoors, tech, calm, social, music, nature"]
}

Rules:
- Text must be 1-2 lines max per field
- No markdown, no HTML
- Template choice based on personality traits mentioned
- Be concise and personal`;

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a JSON generator. Only output valid JSON, no other text.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('No content from OpenAI');

  const parsed = JSON.parse(content);
  return SiteContentSchema.parse(parsed);
}

export async function getNextSMSResponse(
  state: string,
  questionIndex: number,
  conversationHistory: Array<{ direction: string; body: string }>
): Promise<string> {
  if (state === 'CONSENT_PENDING') {
    const lastMessage = conversationHistory[conversationHistory.length - 1]?.body?.toLowerCase() || '';
    // Check if it's a positive response (any message basically means they're interested)
    const positiveResponse = lastMessage && !lastMessage.includes('stop') && !lastMessage.includes('no') && lastMessage.length > 0;
    
    if (positiveResponse || lastMessage.includes('yes') || lastMessage.includes('yep') || lastMessage.includes('ok') || lastMessage.includes('yeah') || lastMessage.includes('sure')) {
      return "hey! ok so basically i'm gonna ask you some stuff about yourself - hobbies, what you're into, your vibe, dreams, all that. just be real with me. what do you like to do for fun?";
    }
    // If they said stop or no, respect that
    if (lastMessage.includes('stop') || lastMessage.includes('no thanks') || lastMessage.includes('not interested')) {
      return "alright no worries! if you change your mind just text back";
    }
    // Otherwise, natural follow-up asking if they have anything to add
    return "hey! so a friend wants to make you a personal website. got anything you want to share about yourself? hobbies, interests, whatever comes to mind";
  }

  if (state === 'INTERVIEWING') {
    const lastUserMessage = conversationHistory[conversationHistory.length - 1]?.body?.toLowerCase() || '';
    const userResponses = conversationHistory.filter(m => m.direction === 'inbound').length;
    
    // Check if user is done
    const donePhrases = ['thats it', "that's it", 'thats everything', "that's everything", 'im done', "i'm done", 'thats all', "that's all", 'nothing else', 'all set', 'thats good', "that's good", 'done', 'finish', 'finished'];
    if (donePhrases.some(phrase => lastUserMessage.includes(phrase)) && userResponses >= 2) {
      return 'cool cool, got it. lemme make you something real quick...';
    }

    // Build conversation context
    const recentMessages = conversationHistory.slice(-6).map(m => 
      `${m.direction === 'inbound' ? 'user' : 'me'}: ${m.body}`
    ).join('\n');

    const topicsCovered = [];
    if (userResponses > 0) topicsCovered.push('hobbies/fun stuff');
    if (userResponses > 1) topicsCovered.push('interests/personality');
    if (userResponses > 2) topicsCovered.push('goals/aspirations');

    const systemPrompt = `You're a casual, friendly text buddy named poke. You talk in all lowercase, have some attitude and personality. You're asking someone about themselves to make them a personal website. Keep it real and conversational, like texting a friend.

You've asked about: ${topicsCovered.join(', ') || 'nothing yet'}

Your goal: learn about their hobbies, personality, aspirations, what makes them tick. Don't be robotic - react naturally to what they say. After a few back-and-forths, start checking if they have anything else to share or if they're done.

Keep responses SHORT (1-2 sentences max). All lowercase. Be chill but engaging.`;

    const conversationPrompt = `Recent chat:
${recentMessages}

Your next message (casual, lowercase, 1-2 sentences max):`;

    const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: conversationPrompt }
      ],
      temperature: 0.9,
      max_tokens: 80,
    });

    let response = completion.choices[0]?.message?.content?.trim() || 'what else should i know about you?';
    
    // Force lowercase
    response = response.toLowerCase();
    
    // If we have enough info (4+ user responses), start checking if they're done
    if (userResponses >= 4 && !donePhrases.some(phrase => lastUserMessage.includes(phrase))) {
      // Sometimes add a check-in
      if (Math.random() > 0.5) {
        response = response + ' anything else you want me to know or are we good?';
      }
    }

    return response;
  }

  return "cool cool, got it. lemme make you something real quick...";
}
