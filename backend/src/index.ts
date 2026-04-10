import 'dotenv/config';
import { buildApp } from './app';
import { startWalkReminderJob } from './jobs/walkReminder.job';
import { startWalkEndReminderJob } from './jobs/walkEndReminder.job';
import { getContainer } from './container';

// Validate Firebase config at startup
import './lib/firebase-admin';

const start = async () => {
  const fastify = await buildApp({ logger: true, serveStatic: true });

  // Start the cron job here, not in buildApp — generate-spec also calls buildApp
  // and we don't want the scheduler running during spec generation
  startWalkReminderJob(getContainer().walkReminderService);
  startWalkEndReminderJob(getContainer().walkEndReminderService);

  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`API docs available at http://localhost:${port}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
