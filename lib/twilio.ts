import twilio from 'twilio';

// Lazy initialization - only create client when needed (runtime, not build time)
function getTwilioClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials are not set');
  }
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

export async function sendSMS(to: string, message: string): Promise<void> {
  const client = getTwilioClient();
  await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to,
  });
}

export function validateTwilioRequest(body: any, signature: string, url: string): boolean {
  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    signature,
    url,
    body
  );
}
