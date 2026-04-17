import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {
  MeResponseSchema,
  ListUsersResponseSchema,
  ListUsersQuerySchema,
  ChangeRoleBodySchema,
  ChangeRoleResponseSchema,
  UpdateUserStatusBodySchema,
  UpdateUserStatusResponseSchema,
} from '../schemas/user.schema';
import { meHandler, listUsersHandler, changeRoleHandler, updateUserStatusHandler } from '../handlers/users.handler';
import { verifyToken, requireAdminEmail } from '../middleware/auth.middleware';

export const usersRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  // Get current user info
  fastify.get('/api/users/me', {
    preHandler: [verifyToken],
    schema: {
      operationId: 'getCurrentUser',
      description: 'Get current authenticated user info',
      tags: ['RafflesGo'],
      security: [{ bearerAuth: [] }],
      response: {
        200: MeResponseSchema,
      },
    },
  }, meHandler);

  // List all users (admin only)
  fastify.get('/api/users', {
    preHandler: [verifyToken, requireAdminEmail],
    schema: {
      operationId: 'listUsers',
      description: 'List all users (admin only)',
      tags: ['RafflesGo'],
      security: [{ bearerAuth: [] }],
      querystring: ListUsersQuerySchema,
      response: {
        200: ListUsersResponseSchema,
      },
    },
  }, listUsersHandler);

  // Change user role (admin only)
  fastify.post('/api/users/change-role', {
    preHandler: [verifyToken, requireAdminEmail],
    schema: {
      operationId: 'changeUserRole',
      description: 'Change a user role (admin only)',
      tags: ['RafflesGo'],
      security: [{ bearerAuth: [] }],
      body: ChangeRoleBodySchema,
      response: {
        200: ChangeRoleResponseSchema,
      },
    },
  }, changeRoleHandler);

  fastify.patch('/api/users/:uid/status', {
    preHandler: [verifyToken, requireAdminEmail],
    schema: {
      operationId: 'updateUserStatus',
      description: 'Enable or disable a user account (admin only)',
      tags: ['RafflesGo'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['uid'],
        properties: {
          uid: { type: 'string' },
        },
      },
      body: UpdateUserStatusBodySchema,
      response: {
        200: UpdateUserStatusResponseSchema,
      },
    },
  }, updateUserStatusHandler);
};
