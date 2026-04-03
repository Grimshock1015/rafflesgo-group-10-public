import type { FastifyInstance } from 'fastify';
import { createSightingHandler, getMySightingsHandler } from '../handlers/sighting.handler';
import {
  CreateSightingBodySchema,
  CreateSightingResponseSchema,
  MySightingsResponseSchema,
} from '../schemas';
import { verifyToken } from '../middleware/auth.middleware';


export async function sightingRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/api/sightings/mine',
    {
      schema: {
        operationId: 'getMySightingsDashboard',
        description: 'Get the authenticated user dashboard for submitted sightings',
        tags: ['Sightings'],
        security: [{ bearerAuth: [] }],
        response: {
          200: MySightingsResponseSchema,
        },
      },
      preHandler: [verifyToken],
    },
    getMySightingsHandler,
  );

  fastify.post(
    '/api/sightings',
    {
      schema: {
        operationId: 'postApiSightings',
        tags: ['Sightings'],
        security: [{ bearerAuth: [] }],
        body: CreateSightingBodySchema,
        response: {
          201: CreateSightingResponseSchema,
        },
      },
      preHandler: [verifyToken],
    },
    createSightingHandler,
  );
}
