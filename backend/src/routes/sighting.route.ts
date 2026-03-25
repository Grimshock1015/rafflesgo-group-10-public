import type { FastifyInstance } from 'fastify';
import { createSightingHandler } from '../handlers/sighting.handler';
import {
  CreateSightingBodySchema,
  CreateSightingResponseSchema,
} from '../schemas';
import { verifyToken } from '../middleware/auth.middleware';


export async function sightingRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/api/sightings',
    {
      schema: {
        tags: ['Sightings'],
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