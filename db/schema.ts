import { pgTable, text, timestamp, integer, jsonb, uuid } from 'drizzle-orm/pg-core';

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  phone: text('phone').notNull(),
  state: text('state').notNull().default('CONSENT_PENDING'), // CONSENT_PENDING, INTERVIEWING, GENERATING_SITE, COMPLETED, STOPPED
  questionIndex: integer('question_index').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id),
  direction: text('direction').notNull(), // 'inbound' | 'outbound'
  body: text('body').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sites = pgTable('sites', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id),
  template: text('template').notNull(), // 'A' | 'B'
  contentJson: jsonb('content_json').notNull(),
  imageIds: jsonb('image_ids').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
