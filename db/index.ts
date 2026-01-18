import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const client = postgres(process.env.DATABASE_URL, { max: 1 });
  return drizzle(client, { schema });
}

export const db = typeof process !== 'undefined' && process.env.DATABASE_URL 
  ? getDb() 
  : null as any;
