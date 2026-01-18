import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';
import { eq, or } from 'drizzle-orm';

async function stopAllActiveSessions() {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL not configured. Make sure .env.local exists.');
      process.exit(1);
    }

    const client = postgres(process.env.DATABASE_URL, { max: 1 });
    const db = drizzle(client, { schema });

    // Find all active sessions (not COMPLETED or STOPPED)
    const activeSessions = await db
      .select()
      .from(schema.sessions)
      .where(
        or(
          eq(schema.sessions.state, 'CONSENT_PENDING'),
          eq(schema.sessions.state, 'INTERVIEWING'),
          eq(schema.sessions.state, 'GENERATING_SITE')
        )
      );

    console.log(`Found ${activeSessions.length} active sessions`);

    if (activeSessions.length === 0) {
      console.log('No active sessions to stop');
      process.exit(0);
    }

    // Stop all active sessions
    const stopped = await db
      .update(schema.sessions)
      .set({ state: 'STOPPED' })
      .where(
        or(
          eq(schema.sessions.state, 'CONSENT_PENDING'),
          eq(schema.sessions.state, 'INTERVIEWING'),
          eq(schema.sessions.state, 'GENERATING_SITE')
        )
      )
      .returning();

    console.log(`Stopped ${stopped.length} sessions:`);
    stopped.forEach((session) => {
      console.log(`  - Session ${session.id} (${session.phone}): ${session.state} → STOPPED`);
    });

    await client.end();
    process.exit(0);
  } catch (error: any) {
    console.error('Error stopping sessions:', error);
    process.exit(1);
  }
}

stopAllActiveSessions();
