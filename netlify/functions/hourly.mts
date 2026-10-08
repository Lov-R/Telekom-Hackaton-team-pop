import type { Config } from '@netlify/functions';

process.env.RELAI_RUNTIME = 'netlify';
process.env.RELAI_DATA_DIR ??= '/tmp/relai';

/** SRS §9.5 hourly job on Netlify (locally services/jobs.ts runs it on a timer). */
export default async (): Promise<void> => {
  const persist = await import('../../server/src/persist.js');
  const { runHourlyJobs } = await import('../../server/src/services/jobs.js');
  const { failStuckDocuments } = await import('../../server/src/services/processDocument.js');
  await persist.freshWrite(() => {
    runHourlyJobs();
    failStuckDocuments(3 * 60_000);
  });
};

export const config: Config = { schedule: '@hourly' };
