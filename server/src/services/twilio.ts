import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let client: ReturnType<typeof twilio> | null = null;

if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
}

export async function sendSMS(to: string, body: string): Promise<boolean> {
  if (!client || !fromNumber) {
    console.warn('Twilio not configured — SMS not sent');
    return false;
  }

  try {
    await client.messages.create({
      body,
      from: fromNumber,
      to,
    });
    return true;
  } catch (error) {
    console.error('Twilio SMS error:', error);
    return false;
  }
}

export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken && fromNumber);
}
