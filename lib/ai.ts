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
  
  const fullConversation = messages
    .map(m => `${m.direction === 'inbound' ? 'user' : 'poke'}: ${m.body}`)
    .join('\n');

  // Extract name - usually the first short response that doesn't look like a question
  let extractedName = '';
  const inboundMessages = messages.filter(m => m.direction === 'inbound');
  if (inboundMessages.length > 0) {
    const firstResponse = inboundMessages[0].body.trim();
    // If it's short (likely a name) and doesn't contain common words, use it as name
    if (firstResponse.length < 50 && !firstResponse.toLowerCase().includes('yes') && !firstResponse.toLowerCase().includes('ok') && !firstResponse.toLowerCase().includes('sure')) {
      extractedName = firstResponse.split(/\s+/)[0]; // Take first word as name
    }
  }

  const prompt = `You are analyzing a short SMS interview conversation. Extract key insights and generate a JSON response for a personalized website.

Full Conversation:
${fullConversation}

Generate JSON with this exact structure:
{
  "template": "A" or "B" (A = bold/energetic for creative/social/ambitious/extroverted, B = calm/minimal for reflective/thoughtful/introspective/chill),
  "name": "person's first name (extract from conversation, if not found use 'friend')",
  "hero": {
    "headline": "MAXIMUM 4 WORDS. A cool, sophisticated phrase that captures their essence. Think: poetic, minimal, mysterious, but not try-hard or cringe. Examples: 'walks in silence', 'builds in public', 'thinks in color', 'moves through space', 'sees the pattern'. Avoid: generic phrases like 'amazing person', cliches, or overly dramatic language. Make it feel effortless and cool.",
    "subheadline": "MAXIMUM 4 WORDS. A complementary phrase that adds depth. Should feel natural and not forced. Examples: 'who are they?', 'this is them', 'in their own words'. Keep it simple and understated."
  },
  "sections": {
    "hobbies": ["3-4 short items"],
    "interests": ["3-4 short items"],
    "values": ["2-3 short items"],
    "goals": ["2-3 short items"]
  },
  "quote": "one inspiring quote or phrase from the conversation",
  "imageTags": ["3-5 tags like creative, outdoors, tech, calm, social, music, nature"],
  "pointFormSection1": ["3-4 brief bullet points about hobbies, interests, or what they love"],
  "pointFormSection2": ["3-4 brief bullet points about values, goals, or what matters to them"],
  "conversationText": "A well-written 2-3 paragraph summary based on the conversation, capturing their personality, interests, and what makes them unique. Write in third person, be warm and personal. No markdown, just plain text."
}

Rules:
- Hero headline: EXACTLY 4 WORDS MAX. Must be cool, sophisticated, poetic but effortless. No cringe, no try-hard energy, no generic phrases.
- Hero subheadline: EXACTLY 4 WORDS MAX. Simple, understated, complementary.
- Text must be 1-2 lines max per field (except conversationText)
- No markdown, no HTML
- Template choice based on personality traits mentioned
- Be concise and personal
- Extract the person's name from the conversation`;

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
  const siteContent = SiteContentSchema.parse(parsed);
  
  // Use extracted name if AI didn't find one
  if (!siteContent.name || siteContent.name === 'friend') {
    siteContent.name = extractedName || 'friend';
  }
  
  return siteContent;
}

export async function generateHeroImage(imageTags: string[], name: string): Promise<string> {
  // Generate image using DALL-E
  const openai = getOpenAI();
  
  // Create a scenic landscape prompt similar to hero.png - natural scenery with light sky
  // hero.png appears to be a natural landscape with trees/mountains and a light sky
  const prompt = `A beautiful, natural scenic landscape photograph representing ${name}'s interests and personality. Style inspired by: ${imageTags.join(', ')}. 

Composition requirements:
- Top third: Light sky with soft clouds, white or very light blue tones, minimal detail to allow text overlay
- Middle and bottom: Natural scenery such as rolling hills, mountains, forests, fields, or natural landscapes that reflect the tags
- Photorealistic style, like a professional landscape photograph
- Soft, natural lighting (golden hour or soft daylight)
- Peaceful, serene atmosphere
- No abstract patterns, no artistic effects - just natural scenery
- Wide, cinematic landscape view
- Colors should be muted and natural, not overly vibrant
- Think of landscapes like: misty mountains, peaceful valleys, serene forests, calm lakeshores, rolling countryside

The image should look like a professional nature photograph, with the sky area light enough for black text to be readable.`;
  
  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      size: '1024x1024',
      quality: 'standard',
      n: 1,
    });
    
    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) throw new Error('No image URL returned');
    
    return imageUrl;
  } catch (error) {
    console.error('Image generation error:', error);
    // Fallback to default hero image
    return '/hero.png';
  }
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
      return "hey! ok so basically i'm gonna ask you some stuff about yourself to make you a personal website. first things first - what's your name?";
    }
    // If they said stop or no, respect that
    if (lastMessage.includes('stop') || lastMessage.includes('no thanks') || lastMessage.includes('not interested')) {
      return "alright no worries! if you change your mind just text back";
    }
    // Otherwise, ask for name first
    return "hey! so a friend wants to make you a personal website. first things first - what's your name?";
  }

  if (state === 'INTERVIEWING') {
    const lastUserMessage = conversationHistory[conversationHistory.length - 1]?.body?.toLowerCase() || '';
    const userResponses = conversationHistory.filter(m => m.direction === 'inbound').length;
    const allMessages = conversationHistory.map(m => `${m.direction === 'inbound' ? 'user' : 'me'}: ${m.body}`).join('\n');
    
    // Check if we've asked for their name yet
    const outboundMessages = conversationHistory.filter(m => m.direction === 'outbound');
    const hasAskedForName = outboundMessages.some(m => 
      m.body.toLowerCase().includes("what's your name") || 
      m.body.toLowerCase().includes("your name") ||
      m.body.toLowerCase().includes("what is your name")
    );
    
    // Check if we have their name - look for short responses that look like names
    // Skip consent responses (yes/ok/sure) and look for actual name-like responses
    const nameResponses = conversationHistory
      .filter(m => m.direction === 'inbound')
      .filter(m => {
        const body = m.body.trim().toLowerCase();
        // Name is likely: short, no "yes/ok/sure", not a full sentence
        return body.length < 30 && 
               body.length > 0 &&
               !body.includes('yes') && 
               !body.includes('ok') && 
               !body.includes('sure') &&
               !body.includes('yep') &&
               !body.includes('yeah');
      });
    
    // FIRST: Ask for name if we haven't asked yet OR if we asked but got a consent response (yes/ok)
    if (!hasAskedForName || (hasAskedForName && nameResponses.length === 0 && userResponses === 1)) {
      // Make sure we didn't just ask for name in the last message
      const lastOutbound = outboundMessages[outboundMessages.length - 1];
      if (!lastOutbound?.body.toLowerCase().includes("what's your name") && !lastOutbound?.body.toLowerCase().includes("your name")) {
        return "first things first - what's your name?";
      }
    }
    
    // Let AI determine if user is done based on context - no phrase matching

    // Count how many questions we've asked about the current topic
    const recentOutbound = conversationHistory.filter(m => m.direction === 'outbound').slice(-3);
    const isAskingIfDone = recentOutbound.some(m => m.body.toLowerCase().includes('anything else') || m.body.toLowerCase().includes('we good') || m.body.toLowerCase().includes('add anything'));

    const systemPrompt = `You're a casual, friendly text buddy named poke. You talk in all lowercase, have some attitude and personality. You're asking someone about themselves to make them a personal website. Keep it real and conversational, like texting a friend.

Your approach:
1. When someone mentions something (hobby, interest, activity), ask 1-2 follow-up questions about it to get more details and understand what makes it special to them
2. After you've explored a few topics (name, hobbies, interests, values, goals), ask if they want to add anything else
3. If they say yes/mention something, ask follow-up questions about that new thing
4. IMPORTANT: If the user indicates they're done (context clues: they said "that's all", "nothing else", "all set", asked about the website, seem satisfied, or you've gathered enough info), respond EXACTLY with: "cool cool, got it. lemme make you something real quick..."
5. Only respond with that exact wrap-up message when you're confident they're done based on context, not just specific phrases

Important rules:
- React naturally to what they say - don't be robotic
- Ask specific follow-up questions about things they mention (e.g., if they say "music", ask what kind, what they play, favorite artists)
- After gathering name + 3-4 topics, check if they have anything else to add
- Use context clues to determine if they're done: tone, content, questions about next steps
- Keep responses SHORT (1-2 sentences max)
- All lowercase
- Be chill, curious, and engaging
- Don't repeat questions you've already asked`;

    const conversationPrompt = `Full conversation so far:
${allMessages}

Your next message (casual, lowercase, 1-2 sentences max). ${isAskingIfDone ? 'They just responded - continue based on whether they said they want to add more or are done.' : 'Ask a follow-up question about what they mentioned, or if you\'ve covered enough topics, ask if they have anything else they want to add.'}`;

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: conversationPrompt }
      ],
      temperature: 0.9,
      max_tokens: 100,
    });

    let response = completion.choices[0]?.message?.content?.trim() || 'tell me more about that';
    
    // Force lowercase
    response = response.toLowerCase();
    
    // After we've asked a few questions, check if they want to add anything else
    if (!isAskingIfDone && userResponses >= 3) {
      // Check if we just asked about something new - if so, give them a chance to add more
      const lastOutboundWasQuestion = recentOutbound.length > 0 && !recentOutbound[0].body.toLowerCase().includes('anything else');
      if (lastOutboundWasQuestion && userResponses >= 4) {
        // After asking about a few things, check if they want to add more
        response = response + ' anything else you want to add or are we good?';
      }
    }

    return response;
  }

  return "cool cool, got it. lemme make you something real quick...";
}
