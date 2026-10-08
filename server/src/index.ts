import { app } from './app.js';
import { MODEL } from './ai/gemini.js';
import { DB_DRIVER } from './db.js';
import { env } from './env.js';
import { startJobs } from './services/jobs.js';
import { failStuckDocuments } from './services/processDocument.js';

failStuckDocuments();
startJobs();

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`relAI server: http://localhost:${env.PORT}  (model ${MODEL}, ${DB_DRIVER})`);
});
