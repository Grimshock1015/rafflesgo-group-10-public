import type { FastifyInstance } from 'fastify';
import { createSightingHandler, deleteSightingHandler, getAllSightingsHandler, getMySightingsHandler } from '../handlers/sighting.handler';
import {
  AdminSightingsResponseSchema,
  CreateSightingBodySchema,
  CreateSightingResponseSchema,
  DeleteSightingResponseSchema,
  MySightingsResponseSchema,
} from '../schemas';
import { requireAdminEmail, verifyToken } from '../middleware/auth.middleware';


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

  fastify.get(
    '/api/sightings',
    {
      schema: {
        operationId: 'listAllSightings',
        description: 'List all sightings (admin only)',
        tags: ['Sightings'],
        security: [{ bearerAuth: [] }],
        response: {
          200: AdminSightingsResponseSchema,
        },
      },
      preHandler: [verifyToken, requireAdminEmail],
    },
    getAllSightingsHandler,
  );

  fastify.delete(
    '/api/sightings/:id',
    {
      schema: {
        operationId: 'deleteSighting',
        description: 'Delete a sighting by id (admin only)',
        tags: ['Sightings'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: DeleteSightingResponseSchema,
        },
      },
      preHandler: [verifyToken, requireAdminEmail],
    },
    deleteSightingHandler,
  );
}
