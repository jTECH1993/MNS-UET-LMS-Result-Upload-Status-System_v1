import { db } from './index';
import { submissions, subjects, documents, documentPrograms, accessLogs, workOnDemand } from './schema';

async function reset() {
  console.log('Cleaning database...');
  await db.delete(subjects);
  await db.delete(submissions);
  await db.delete(documentPrograms);
  await db.delete(documents);
  await db.delete(accessLogs);
  await db.delete(workOnDemand);
  console.log('Database successfully cleaned! Core users and schemas preserved.');
}

reset().catch((e) => {
  console.error('Error cleaning database:', e);
  process.exit(1);
});
