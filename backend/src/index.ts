import 'dotenv/config';
import { buildApp } from './app';

// Validate Firebase config at startup
import './lib/firebase-admin';

const start = async () => {
  const fastify = await buildApp({ logger: true, serveStatic: true });

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
