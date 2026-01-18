import { notFound } from 'next/navigation';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '@/db/schema';
import TemplateA from '@/components/TemplateA';
import TemplateB from '@/components/TemplateB';
import type { SiteContent } from '@/lib/types';

export default async function SitePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;

  if (!process.env.DATABASE_URL) {
    notFound();
  }

  // Initialize db - use connection string directly
  const dbUrl = process.env.DATABASE_URL;
  const client = postgres(dbUrl, { max: 1 });
  const db = drizzle(client, { schema });

  const [site] = await db.select().from(schema.sites).where(eq(schema.sites.id, siteId)).limit(1);

  client.end();

  if (!site) {
    notFound();
  }

  const content = site.contentJson as SiteContent;
  const imageIds = site.imageIds as string[];

  return (
    <>
      {site.template === 'A' ? (
        <TemplateA content={content} imageIds={imageIds} />
      ) : (
        <TemplateB content={content} imageIds={imageIds} />
      )}
    </>
  );
}
