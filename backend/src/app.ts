import Fastify, { FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import corsPlugin from './plugins/cors.plugin';
import authPlugin from './plugins/auth.plugin';
import loggingPlugin from './plugins/logging.plugin';

import { healthRoutes } from './routes/health.routes';
import { surveyPeriodRoutes } from './routes/surveyPeriods.routes'
import { helloRoutes } from './routes/hello.routes';
import { usersRoutes } from './routes/users.routes';
import { sightingRoutes } from './routes/sighting.route';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// Build App
// ============================================
export interface BuildAppOptions {
  logger?: boolean;
  serveStatic?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const { logger = true, serveStatic = true } = options;

  const fastify = Fastify({ logger }).withTypeProvider<TypeBoxTypeProvider>();

  // ============================================
  // Plugins
  // ============================================
  await fastify.register(corsPlugin);
  await fastify.register(authPlugin);
  await fastify.register(loggingPlugin);

  // Swagger/OpenAPI Configuration
  await fastify.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'RafflesGo API',
        description: 'RafflesGo backend API',
        version: '1.0.0',
      },
      servers: [{ url: 'http://localhost:3000' },
      ],
      tags: [
        { name: 'RafflesGo', description: 'RafflesGo API endpoints' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs',
  });

  // Static Files (Frontend)
  if (serveStatic) {
    const publicPath = process.env.NODE_ENV === 'production'
      ? path.join(process.cwd(), 'public')
      : path.join(__dirname, '../public');

    fastify.register(fastifyStatic, {
      root: publicPath,
      prefix: '/',
      wildcard: false,
    });
  }

  // ============================================
  // API Routes
  // ============================================
  await fastify.register(healthRoutes);
  await fastify.register(helloRoutes);
  await fastify.register(usersRoutes);
  await fastify.register(sightingRoutes)
  await fastify.register(surveyPeriodRoutes)

  // SPA Fallback
  fastify.setNotFoundHandler((request, reply) => {
    if (request.raw.url?.startsWith('/api')) {
      reply.status(404).send({ error: 'API route not found' });
    } else if (serveStatic) {
      reply.sendFile('index.html');
    } else {
      reply.status(404).send({ error: 'Not found' });
    }
  });

  // Add schema
const MyResponseSchema = {
  $id: 'MyResponse',
  type: 'object',
  required: ['data'],
  properties: { data: { type: 'string' } },
} as const;

// Register schema
fastify.addSchema(MyResponseSchema);

// Add route
fastify.get('/api/my-endpoint', {
  schema: {
    description: 'My endpoint description',
    tags: ['RafflesGo'],
    response: { 200: { $ref: 'MyResponse#' } },
  },
}, async () => {
  return { data: 'bingus' };
});

  return fastify;
}

