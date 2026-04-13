import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { triggerWalkReminderHandler } from '../handlers/jobs.handler';
import { requireAdminEmail, verifyToken } from '../middleware/auth.middleware';
import { TriggerWalkReminderResponseSchema } from '../schemas/jobs.schema';

export const jobsRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.post('/api/jobs/walk-reminder/trigger', {
    preHandler: [verifyToken, requireAdminEmail],
    schema: {
      operationId: 'triggerWalkReminderJob',
      description: 'Manually trigger walk reminders for tomorrow, including weather alerts when applicable',
      tags: ['RafflesGo'],
      security: [{ bearerAuth: [] }],
      response: {
        200: TriggerWalkReminderResponseSchema,
      },
    },
  }, triggerWalkReminderHandler);
};