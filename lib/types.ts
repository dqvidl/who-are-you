import { z } from 'zod';

export const SiteContentSchema = z.object({
  template: z.enum(['A', 'B']),
  hero: z.object({
    headline: z.string(),
    subheadline: z.string(),
  }),
  sections: z.object({
    hobbies: z.array(z.string()),
    interests: z.array(z.string()),
    values: z.array(z.string()),
    goals: z.array(z.string()),
  }),
  quote: z.string(),
  imageTags: z.array(z.string()),
});

export type SiteContent = z.infer<typeof SiteContentSchema>;

export type SessionState = 'CONSENT_PENDING' | 'INTERVIEWING' | 'GENERATING_SITE' | 'COMPLETED' | 'STOPPED';
